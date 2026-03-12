import sys
import os
from datetime import datetime, timedelta

# 프로젝트 루트를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from plugins.alarm.alarm_core import AlarmService


def test_time_only_parsing():
    service = AlarmService()

    # Mocking _save_to_disk and _reschedule_all to avoid side effects
    service._save_to_disk = lambda: None
    service._reschedule_all = lambda: None
    service._trigger_alarm = lambda *args: print(f"Triggered: {args}")

    # 1. 과거 시간 테스트 (예: 현재가 15:00인데 02:00 입력)
    # 현재 시각을 기준으로 02:00가 지났는지 확인
    now = datetime.now()
    test_time = "02:00"

    print(f"Current Time: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Testing set_alarm with '{test_time}'...")

    success, msg = service.set_alarm(test_time, "청소")
    print(f"Result: Success={success}, Message={msg}")

    # 2. 결과 검증
    # 만약 현재가 02:00 이후라면 내일 날짜가 여야 함
    if success:
        alarm = service.alarms[-1]
        print(f"Scheduled Alarm Time: {alarm['time']}")

        parsed_time = datetime.strptime(alarm["time"], "%Y-%m-%d %H:%M:%S")
        if now.hour >= 2:
            expected_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")
            assert parsed_time.strftime("%Y-%m-%d") == expected_date
            print("✅ Correctly shifted to tomorrow.")
        else:
            assert parsed_time.strftime("%Y-%m-%d") == now.strftime("%Y-%m-%d")
            print("✅ Scheduled for today.")


if __name__ == "__main__":
    test_time_only_parsing()
