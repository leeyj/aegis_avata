import os
import paramiko
import time


# --- Deployment Configuration (Loaded from .env) ---
def load_env():
    env = {}
    env_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"
    )
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line:
                    key, value = line.strip().split("=", 1)
                    env[key] = value
    return env


_ENV = load_env()
SERVER_IP = _ENV.get("DEPLOY_SERVER_IP", "192.168.0.20")
SSH_PORT = int(_ENV.get("DEPLOY_SSH_PORT", 22))
USERNAME = _ENV.get("DEPLOY_USERNAME", "")
PASSWORD = _ENV.get("DEPLOY_PASSWORD", "")
REMOTE_PATH = _ENV.get("DEPLOY_REMOTE_PATH", "")
LOCAL_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Exclude list
EXCLUDE = [
    ".git",
    "__pycache__",
    ".pytest_cache",
    ".idea",
    ".vscode",
    "venv",
    ".env",
    "test",  # 임시 테스트 코드는 제외
    "models",  # 대용량 모델 파일 제외
    "test_models",  # 테스트 모델 파일 제외
    "tools",  # 도구 폴더 전체 제외 (보안)
    "deploy.py",
    "settings.json",  # 서버 설정 보호 (환경 차별화를 위해 로컬 설정 덮어쓰기 방지)
    "secrets.json",  # 인증키 보호
    "auth_helper.py",
    ".agent",  # 에이전트 규칙 파일 (보안)
    "build",  # 빌드 임시 폴더
    "core_security.c",
    "utils.c",  # Cython 생성 소스
    "core_security.cp312-win_amd64.pyd",
    "utils.cp312-win_amd64.pyd",  # 윈도우 바이너리
    "core_security.cpython-310-x86_64-linux-gnu.so",
    "utils.cpython-310-x86_64-linux-gnu.so",  # 리눅스 바이너리
    ".github",  # GitHub 워크플로우 및 설정 (보안)
]


def deploy():
    print(f"\n🚀 [AEGIS] Starting Deployment to {SERVER_IP}...")
    start_time = time.time()

    # 1. Connect SSH
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(SERVER_IP, port=SSH_PORT, username=USERNAME, password=PASSWORD)
        print("✅ SSH Connection Established.")

        # 2. Kill existing process
        print("⏳ Killing existing service (if running)...")
        # pkill may return 1 if no process found; we use a shell or check to ignore it
        ssh.exec_command("pkill -f gods.py || true")
        time.sleep(2)

        # 3. SFTP for file transfer
        sftp = ssh.open_sftp()

        def sftp_upload_dir(local_dir, remote_dir):
            try:
                sftp.mkdir(remote_dir)
            except IOError:
                pass

            file_count = 0
            for item in os.listdir(local_dir):
                if item in EXCLUDE or any(
                    item.endswith(ext) for ext in [".so", ".pyd", ".c"]
                ):
                    continue

                local_item = os.path.join(local_dir, item)
                remote_item = os.path.join(remote_dir, item).replace("\\", "/")

                if os.path.isdir(local_item):
                    file_count += sftp_upload_dir(local_item, remote_item)
                else:
                    sftp.put(local_item, remote_item)
                    file_count += 1
            return file_count

        print("📤 Uploading files (mirroring local state)...")
        total_uploaded = sftp_upload_dir(LOCAL_PATH, REMOTE_PATH)
        print(f"✅ Uploaded {total_uploaded} files.")

        # --- Hardening Core (Build & Download) ---
        print("\n🛡️  [Hardening] Compiling Core Security on Remote Server...")

        # 1. Check/Install Cython
        _, stdout, _ = ssh.exec_command("cython --version")
        if stdout.channel.recv_exit_status() != 0:
            print("📦 Installing Cython on remote...")
            ssh.exec_command("python3 -m pip install --user Cython")

        # 2. Build .so on remote
        print("🔨 Running Cython build_ext...")
        build_cmd = f"cd {REMOTE_PATH} && python3 setup_security.py build_ext --inplace"
        stdin, stdout, stderr = ssh.exec_command(build_cmd)

        # Wait for build to complete
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            print(f"❌ [ERROR] Remote build failed (Exit Code: {exit_status})")
            error_msg = stderr.read().decode()
            if error_msg:
                print(f"Details:\n{error_msg}")
        else:
            print("✅ Remote build successful.")

            # 3. Find and Download .so files
            download_count = 0
            for module in ["core_security", "utils"]:
                # Check existance and get full filename
                _, stdout, _ = ssh.exec_command(f"ls {REMOTE_PATH}/{module}*.so")
                remote_so_files = stdout.read().decode().strip().split("\n")

                for remote_so in remote_so_files:
                    if not remote_so or not remote_so.endswith(".so"):
                        continue

                    so_filename = os.path.basename(remote_so)
                    local_so_path = os.path.join(LOCAL_PATH, so_filename)

                    print(f"⬇️  Downloading {so_filename}...")
                    sftp.get(remote_so, local_so_path)
                    download_count += 1

            if download_count > 0:
                print(f"✅ Successfully downloaded {download_count} binary modules.")

            # 4. Cleanup source on remote
            print("🧹 Cleaning up remote source files and temporary build artifacts...")
            cleanup_files = [
                "core_security.py",
                "utils.py",
                "setup_security.py",
                "core_security.c",
                "utils.c",
            ]
            cleanup_cmd = f"cd {REMOTE_PATH} && rm -f " + " ".join(cleanup_files)
            ssh.exec_command(cleanup_cmd)
            ssh.exec_command(f"rm -rf {REMOTE_PATH}/build")

        sftp.close()

        # 5. Restart service
        print("\n🔄 Restarting service in background...")
        start_cmd = (
            f"cd {REMOTE_PATH} && nohup python3 gods.py > gods_output.log 2>&1 &"
        )
        ssh.exec_command(start_cmd)

        elapsed = time.time() - start_time
        print(f"\n✨ Deployment & Hardening Completed Successfully! ({elapsed:.1f}s)")
        print(f"🔗 Dashboard: http://{SERVER_IP}:8001")

    except Exception as e:
        print(f"\n❌ Deployment Failed: {str(e)}")
    finally:
        ssh.close()


if __name__ == "__main__":
    deploy()
