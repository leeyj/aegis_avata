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
    "settings.json",  # 서버 설정 보호 (서버측 파일 유지)
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
    print(f"[AEGIS] Starting Deployment to {SERVER_IP}...")

    # 1. Connect SSH
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(SERVER_IP, port=SSH_PORT, username=USERNAME, password=PASSWORD)
        print("SSH Connection Established.")

        # 2. Kill existing process
        print("Killing existing service...")
        ssh.exec_command("pkill -9 -f gods.py")
        time.sleep(2)  # Wait for process to terminate

        # 3. SFTP for file transfer
        sftp = ssh.open_sftp()

        def sftp_upload_dir(local_dir, remote_dir):
            try:
                sftp.mkdir(remote_dir)
            except IOError:
                pass  # Already exists

            for item in os.listdir(local_dir):
                if item in EXCLUDE:
                    continue

                local_item = os.path.join(local_dir, item)
                remote_item = os.path.join(remote_dir, item).replace("\\", "/")

                if os.path.isdir(local_item):
                    sftp_upload_dir(local_item, remote_item)
                else:
                    # 파일명에 비-ASCII 문자가 포함될 경우 Windows 터미널에서 인코딩 에러가 발생할 수 있어 출력을 단순화함
                    sftp.put(local_item, remote_item)

        print("Uploading files (mirroring local state)...")
        sftp_upload_dir(LOCAL_PATH, REMOTE_PATH)

        # --- NEW: Core Hardening (Build & Download) ---
        print("\n[AEGIS] Hardening Core Security on Remote...")

        # 1. Ensure Cython (for the build process)
        ssh.exec_command("python3 -m pip install --user Cython")

        # 2. Build .so on remote
        build_cmd = f"cd {REMOTE_PATH} && python3 setup_security.py build_ext --inplace"
        stdin, stdout, stderr = ssh.exec_command(build_cmd)
        if stdout.channel.recv_exit_status() != 0:
            print(f"[ERROR] Remote build failed: {stderr.read().decode()}")
        else:
            print("Remote build successful.")

            # 3. Find and Download .so files (core_security & utils)
            for module_name in ["core_security", "utils"]:
                stdin, stdout, stderr = ssh.exec_command(
                    f"ls {REMOTE_PATH}/{module_name}*.so"
                )
                remote_so_files = stdout.read().decode().strip().split("\n")

                for remote_so in remote_so_files:
                    if not remote_so:
                        continue
                    so_filename = os.path.basename(remote_so)
                    local_so_path = os.path.join(LOCAL_PATH, so_filename)
                    print(f"Downloading {so_filename} to local root...")
                    sftp.get(remote_so, local_so_path)

            # 4. Cleanup source on remote (Keep only binary)
            print("Cleaning up remote source files...")
            ssh.exec_command(
                f"rm {REMOTE_PATH}/core_security.py {REMOTE_PATH}/utils.py {REMOTE_PATH}/setup_security.py {REMOTE_PATH}/core_security.c {REMOTE_PATH}/utils.c"
            )
            ssh.exec_command(f"rm -rf {REMOTE_PATH}/build")

        sftp.close()

        # 5. Restart service
        print("\nRestarting service in background...")
        # nohup과 & 를 사용하여 백그라운드 실행, 로그는 gods_output.log에 기록
        start_cmd = (
            f"cd {REMOTE_PATH} && nohup python3 gods.py > gods_output.log 2>&1 &"
        )
        ssh.exec_command(start_cmd)

        print("\nDeployment & Hardening Completed Successfully!")
        print(f"Check your dashboard at http://{SERVER_IP}:8001")

    except Exception as e:
        print(f"Deployment Failed: {str(e)}")
    finally:
        ssh.close()


if __name__ == "__main__":
    deploy()
