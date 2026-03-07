import psutil
import time
import os


def format_size(bytes_value):
    """바이트 단위를 GB, TB, PB 등으로 자동 변환"""
    units = ["B", "KB", "MB", "GB", "TB", "PB"]
    i = 0
    while bytes_value >= 1024 and i < len(units) - 1:
        bytes_value /= 1024
        i += 1
    return f"{bytes_value:.1f}{units[i]}"


def get_system_stats(config):
    """
    설정에 따라 CPU, RAM, 여러 디스크 사용량을 수집하여 반환
    """
    try:
        stats = {}

        # CPU
        if config.get("show_cpu", True):
            stats["cpu"] = {
                "percent": psutil.cpu_percent(interval=0.1),
                "cores": psutil.cpu_count(logical=True),
            }

        # Memory
        if config.get("show_memory", True):
            memory = psutil.virtual_memory()
            stats["memory"] = {
                "percent": memory.percent,
                "used": format_size(memory.used),
                "total": format_size(memory.total),
            }

        # Dynamic Disks
        disks_config = config.get("disks", {"System": "/"})
        stats["disks"] = []
        for name, path in disks_config.items():
            try:
                if os.path.exists(path):
                    usage = psutil.disk_usage(path)
                    stats["disks"].append(
                        {
                            "name": name,
                            "percent": usage.percent,
                            "used": format_size(usage.used),
                            "total": format_size(usage.total),
                        }
                    )
                else:
                    print(f"[SystemService] Path not found: {path} ({name})")
            except Exception as e:
                print(f"[SystemService] Error reading disk {path}: {e}")
                continue

        # Uptime
        uptime = int(time.time() - psutil.boot_time())
        hours, rem = divmod(uptime, 3600)
        minutes, seconds = divmod(rem, 60)
        stats["uptime"] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

        return stats
    except Exception as e:
        print(f"[SystemService] Global Error: {e}")
        return None
