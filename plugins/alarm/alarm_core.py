import threading
import logging
import os
from datetime import datetime
import pytz
from utils import load_settings

logger = logging.getLogger(__name__)


class AlarmService:
    _instance = None
    ALARM_FILE = os.path.join("plugins", "alarm", "alarms.json")

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AlarmService, cls).__new__(cls)
            cls._instance.alarms = []
            cls._instance.callback = None
            cls._instance._load_from_disk()
        return cls._instance

    def set_callback(self, callback):
        """시스템 시작 후 알람 콜백(알림 전송 함수) 등록"""
        self.callback = callback
        # 이미 로드된 알람들에 대해 실행 예약 (지연 실행)
        self._reschedule_all()

    def set_alarm(self, target_time_str, title, target_id=None):
        """
        알람 예약.
        target_time_str: "YYYY-MM-DD HH:MM:SS"
        target_id: 알람을 보낼 대상 ID (디스코드 채널 등)
        """
        try:
            # [v3.4.1] 시간 파싱 유연화 (AI의 다양한 응답 형식 대응)
            target_time = None
            clean_time_str = target_time_str.strip().replace("T", " ")  # ISO 형식 대응

            # 지원하는 시간 포맷 목록 (우선순위 순)
            formats = [
                "%Y-%m-%d %H:%M:%S",  # 표준: 2026-03-07 15:30:00
                "%Y-%m-%d %H:%M",  # 초 생략: 2026-03-07 15:30
                "%y-%m-%d %H:%M:%S",  # 단축 연도
                "%y-%m-%d %H:%M",
                "%Y/%m/%d %H:%M:%S",  # 슬래시 구분자
                "%Y/%m/%d %H:%M",
            ]

            for fmt in formats:
                try:
                    target_time = datetime.strptime(clean_time_str, fmt)
                    break
                except ValueError:
                    continue

            # [v3.7.1] HH:MM 형식 지원 (오늘/내일 자동 판별)
            if not target_time:
                try:
                    time_only = datetime.strptime(clean_time_str, "%H:%M")
                    now = datetime.now()
                    target_time = now.replace(
                        hour=time_only.hour,
                        minute=time_only.minute,
                        second=0,
                        microsecond=0,
                    )
                    # 이미 지났으면 내일로 설정
                    if (target_time - now).total_seconds() <= 0:
                        from datetime import timedelta

                        target_time += timedelta(days=1)

                    target_time_str = target_time.strftime("%Y-%m-%d %H:%M:%S")
                except ValueError:
                    pass

            if not target_time:
                # 최종 폴백
                return False, f"지원하지 않는 시간 형식입니다: {target_time_str}"

            # [v3.4.8] 타임존 인식형 현재 시각 취득
            settings = load_settings()
            tz_name = settings.get("timezone", "Asia/Seoul")
            try:
                tz = pytz.timezone(tz_name)
            except Exception:
                tz = pytz.timezone("Asia/Seoul")

            now_tz = datetime.now(tz)
            # target_time을 naive하게 파싱했다면 tz를 주입
            if target_time and target_time.tzinfo is None:
                target_time = tz.localize(target_time)

            delay = (target_time - now_tz).total_seconds()

            if delay <= 0:
                logger.warning(
                    f"[AlarmService] Past time requested: {target_time_str} (Now: {now_tz})"
                )
                return (
                    False,
                    f"이미 지난 시간입니다. (현재 {tz_name} 시각: {now_tz.strftime('%H:%M:%S')})",
                )

            # 타이머 시작
            t = threading.Timer(
                delay, self._trigger_alarm, [target_time_str, title, target_id]
            )
            t.start()

            alarm_info = {
                "time": target_time_str,
                "title": title,
                "target_id": target_id,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            self.alarms.append(alarm_info)
            self._save_to_disk()

            logger.info(
                f"[AlarmService] Alarm set for {target_time_str}: {title} (Target: {target_id})"
            )
            return True, f"{target_time_str}에 알람을 설정했습니다: {title}"
        except Exception as e:
            return False, str(e)

    def get_active_alarms(self):
        """현재 대기 중인 알람 목록 반환"""
        return sorted(self.alarms, key=lambda x: x["time"])

    def _trigger_alarm(self, time_str, title, target_id=None):
        logger.info(f"[AlarmService] 🔔 Alarm Triggered: {title} for {target_id}")

        # 알람 목록에서 제거 및 저장
        self.alarms = [a for a in self.alarms if a["time"] != time_str]
        self._save_to_disk()

        msg = f"🔔 [알람] {title}"
        if self.callback:
            # target_id가 있으면 함께 전달
            if target_id:
                self.callback(msg, target_id)
            else:
                self.callback(msg)

    def _save_to_disk(self):
        """파일에 알람 목록 저장"""
        from utils import save_json_config

        save_json_config(self.ALARM_FILE, self.alarms, merge=False)

    def _load_from_disk(self):
        """파일에서 알람 목록 로드"""
        from utils import load_json_config

        if os.path.exists(self.ALARM_FILE):
            self.alarms = load_json_config(self.ALARM_FILE)
            # 과거 데이터 정리
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self.alarms = [a for a in self.alarms if a["time"] > now_str]

    def _reschedule_all(self):
        """로드된 알람들에 대해 타이머 재설정"""
        for alarm in self.alarms:
            try:
                target_time = datetime.strptime(alarm["time"], "%Y-%m-%d %H:%M:%S")
                delay = (target_time - datetime.now()).total_seconds()
                if delay > 0:
                    t = threading.Timer(
                        delay,
                        self._trigger_alarm,
                        [alarm["time"], alarm["title"], alarm.get("target_id")],
                    )
                    t.start()
            except Exception:
                continue


alarm_service = AlarmService()
