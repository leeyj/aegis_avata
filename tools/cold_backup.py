import os
import zipfile
import paramiko
from datetime import datetime


# --- Configuration (Loaded from .env if possible) ---
def load_env():
    env = {}
    # tools 폴더 안에 있으므로 한 단계 상위의 .env를 찾아야 함
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
BACKUP_REMOTE_DIR = "/home/{{USERNAME}}/Script/backup"

LOCAL_ROOT = os.path.dirname(os.path.abspath(__file__))
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
ZIP_FILENAME = f"aegis_cold_backup_{TIMESTAMP}.zip"
ZIP_PATH = os.path.join(LOCAL_ROOT, ZIP_FILENAME)

# Exclude list for backup
EXCLUDE = [
    ".git",
    "__pycache__",
    ".pytest_cache",
    ".idea",
    ".vscode",
    "venv",
    "node_modules",
    "models",
    "test_models",
    "build",
    ZIP_FILENAME,  # Prevent recursive zipping
]


def create_backup():
    print(f"[Backup] Creating cold backup: {ZIP_FILENAME}...")
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(LOCAL_ROOT):
            # Filtering directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE]

            for file in files:
                if file in EXCLUDE or file.endswith((".pyd", ".so", ".c", ".zip")):
                    continue

                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, LOCAL_ROOT)
                zipf.write(file_path, arcname)

    print(f"[Backup] Zip completed: {os.path.getsize(ZIP_PATH) / (1024 * 1024):.2f} MB")


def upload_backup():
    print(f"[Backup] Uploading to {SERVER_IP}:{BACKUP_REMOTE_DIR}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(SERVER_IP, port=SSH_PORT, username=USERNAME, password=PASSWORD)

        # Ensure remote backup directory exists
        ssh.exec_command(f"mkdir -p {BACKUP_REMOTE_DIR}")

        sftp = ssh.open_sftp()
        remote_path = os.path.join(BACKUP_REMOTE_DIR, ZIP_FILENAME).replace("\\", "/")
        sftp.put(ZIP_PATH, remote_path)
        sftp.close()

        print(f"[Backup] Successfully uploaded: {ZIP_FILENAME}")

        # Optionally remove local zip after upload
        os.remove(ZIP_PATH)
        print(f"[Backup] Local temporary zip removed.")

    except Exception as e:
        print(f"[Backup] Upload failed: {e}")
    finally:
        ssh.close()


if __name__ == "__main__":
    if not USERNAME or not PASSWORD:
        print("[Error] .env file not found or credentials missing.")
    else:
        create_backup()
        upload_backup()
