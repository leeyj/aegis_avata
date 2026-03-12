import tinytuya
import time
import json
import os
from utils import load_json_config, save_json_config


class ClimateService:
    _instance = None
    _hub = None
    _config_path = None

    @classmethod
    def get_instance(cls, config_path):
        if cls._instance is None:
            cls._instance = cls(config_path)
        return cls._instance

    def __init__(self, config_path):
        self._config_path = config_path
        self.load_settings()
        self.init_hub()
        self.is_ac_on = False

    def load_settings(self):
        self.config = load_json_config(self._config_path)
        # Default settings if missing
        self.hub_id = self.config.get("hub_id", "eb08ae80bc40bd3c46sw7o")
        self.hub_key = self.config.get("hub_key", "pb]|cxXktcq%b8P@")
        self.hub_ip = self.config.get("hub_ip", "192.168.0.75")
        self.ac_id = self.config.get("ac_id", "eb16eb2ba5cb70f718jtje")
        self.target_temp = self.config.get("target_temp", 22.0)
        self.ac_setting_temp = self.config.get("ac_setting_temp", 24)
        self.ac_setting_mode = self.config.get("ac_setting_mode", 1)
        self.ac_setting_wind = self.config.get("ac_setting_wind", 1)

    def init_hub(self):
        try:
            self._hub = tinytuya.Device(self.hub_id, self.hub_ip, self.hub_key)
            self._hub.set_version(3.3)
        except Exception as e:
            print(f"[ClimateService] Hub Init Error: {e}")

    def get_status(self):
        if not self._hub:
            return {"error": "Hub not initialized"}
        try:
            status = self._hub.status()
            if "dps" in status:
                # 101번 DPS에서 실시간 온도 파싱 (241 -> 24.1)
                temp = status["dps"].get("101", 0) / 10.0
                return {
                    "temp": temp,
                    "is_ac_on": self.is_ac_on,
                    "target_temp": self.target_temp,
                }
            return {"error": "Invalid response from hub", "raw": status}
        except Exception as e:
            return {"error": str(e)}

    def set_ac(self, power=True, temp=None, mode=None, wind=None):
        if not self._hub:
            return {"error": "Hub not initialized"}

        target_temp = temp if temp is not None else self.ac_setting_temp
        target_mode = mode if mode is not None else self.ac_setting_mode
        target_wind = wind if wind is not None else self.ac_setting_wind

        command_list = [
            {
                "code": "PowerOn" if power else "PowerOff",
                "value": "PowerOn" if power else "PowerOff",
            },
            {"code": "T", "value": int(target_temp)},
            {"code": "M", "value": int(target_mode)},
            {"code": "F", "value": int(target_wind)},
        ]

        dps_data = {"201": json.dumps(command_list)}
        payload = {
            "protocol": 5,
            "t": int(time.time()),
            "data": dps_data,
            "devId": self.hub_id,
            "cid": self.ac_id,
        }

        try:
            res = self._hub.send(payload)
            self.is_ac_on = power
            return {"success": True, "response": res, "is_ac_on": power}
        except Exception as e:
            return {"error": str(e)}

    def update_config(self, new_config):
        self.config.update(new_config)
        save_json_config(self._config_path, self.config)
        self.load_settings()
        self.init_hub()
        return {"success": True}
