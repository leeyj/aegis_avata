import subprocess
import logging


def run_command_handler(command, target_id=None):
    """
    [v3.8.8] 터미널 명령을 실행하고 결과를 반환합니다.
    """
    try:
        # shell=True를 사용하여 복합 명령 지원 (Windows/Linux 공통)
        process = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )

        return {
            "status": "success",
            "stdout": process.stdout,
            "stderr": process.stderr,
            "returncode": process.returncode,
        }
    except Exception as e:
        logging.error(f"[TerminalService] Command execution failed: {e}")
        return {"status": "error", "message": str(e)}
