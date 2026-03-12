import os
import asyncio
import edge_tts
import hashlib
import json
import logging
import threading

from utils import load_settings

# Config Paths (Relative to project root)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTS_CONFIG_PATH = os.path.join(BASE_DIR, "config", "tts.json")

logger = logging.getLogger(__name__)


def load_json(path):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def get_tts_settings():
    """tts.json 및 settings.json에서 현재 언어에 맞는 설정을 로드합니다."""
    tts_config = load_json(TTS_CONFIG_PATH)
    settings = load_settings()

    lang = settings.get("lang", "ko")
    voices = tts_config.get(
        "voices", {"ko": "ko-KR-SunHiNeural", "en": "en-US-AvaNeural"}
    )

    return {
        "voice": voices.get(lang, voices.get("ko")),
        "rate": tts_config.get("rate", "+10%"),
        "pitch": tts_config.get("pitch", "+20Hz"),
        "volume": tts_config.get("volume", "+0%"),
        "cache_limit": tts_config.get("cache_limit", 50),
    }


def get_existing_tts_url(text, prefix="tts"):
    """
    이미 생성된 캐시 파일이 있는지 확인하고 URL을 반환합니다.
    """
    if not text:
        return None

    text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
    filename = f"{prefix}_{text_hash}.mp3"
    cache_dir = os.path.join(BASE_DIR, "static", "audio", "tts_cache")
    output_path = os.path.join(cache_dir, filename)

    if os.path.exists(output_path):
        return f"/static/audio/tts_cache/{filename}"
    return None


def generate_cached_tts(text, prefix="tts", voice=None):
    """
    텍스트 해시를 기반으로 음성을 생성하고 캐시된 URL을 반환합니다.
    """
    if not text:
        return None

    # 설정 로드
    settings = get_tts_settings()
    current_voice = voice if voice else settings["voice"]

    text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
    filename = f"{prefix}_{text_hash}.mp3"

    cache_dir = os.path.join(BASE_DIR, "static", "audio", "tts_cache")
    output_path = os.path.join(cache_dir, filename)

    # [v3.5.1] 파일이 없거나 크기가 0인 경우(생성 실패 흔적) 다시 생성 시도
    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        # [Security/Cleanup] Config에 설정된 cache_limit만큼 유지
        try:
            limit = settings.get("cache_limit", 50)
            os.makedirs(cache_dir, exist_ok=True)
            files = [
                os.path.join(cache_dir, f)
                for f in os.listdir(cache_dir)
                if f.endswith(".mp3")
            ]
            if len(files) >= limit:
                files.sort(key=os.path.getmtime)
                for i in range(len(files) - (limit - 1)):
                    try:
                        os.remove(files[i])
                    except:
                        pass
        except Exception:
            pass

        print(f"[VoiceService] 🔊 Generating new TTS for text: {text[:30]}...")
        success = generate_edge_tts(text, current_voice, output_path, settings)
        if not success:
            print(f"[VoiceService] ❌ Failed to generate TTS for: {text[:30]}")
            return None
        print(f"[VoiceService] ✅ TTS file ready: {filename} (Size: {os.path.getsize(output_path)})")

    return f"/static/audio/tts_cache/{filename}"


def generate_edge_tts(
    text, voice=None, output_path="static/audio/tts.mp3", settings=None
):
    """edge-tts를 사용하여 음성 파일 생성"""
    if not settings:
        settings = get_tts_settings()

    current_voice = voice if voice else settings["voice"]

    # [IMPORTANT] Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    def _run_async_in_thread():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def _generate():
            try:
                # SSL Verification 이슈 방지를 위해 가끔 필요한 경우가 있음 (현재는 기본값 사용)
                communicate = edge_tts.Communicate(
                    text,
                    current_voice,
                    pitch=settings["pitch"],
                    rate=settings["rate"],
                    volume=settings["volume"],
                )
                await communicate.save(output_path)
                return True
            except Exception as e:
                print(f"[VoiceService] ❌ Internal Edge TTS Error ({current_voice}): {e}")
                return False

        try:
            return loop.run_until_complete(_generate())
        finally:
            loop.close()

    # 스레드 결과값을 받기 위해 Mutable한 객체 사용
    result_box = {"success": False}

    def wrapper():
        result_box["success"] = _run_async_in_thread()

    try:
        thread = threading.Thread(target=wrapper)
        thread.start()
        thread.join(timeout=30)

        # 파일이 실제로 존재하고 크기가 0보다 큰지 확인
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return True
        return result_box["success"]
    except Exception as e:
        print(f"[VoiceService] 🛑 Thread execution error: {e}")
        return False
