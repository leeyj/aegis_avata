import os
import asyncio
import edge_tts
import hashlib
import json

# Config Paths (Relative to project root)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTS_CONFIG_PATH = os.path.join(BASE_DIR, "config", "tts.json")
SYSTEM_CONFIG_PATH = os.path.join(BASE_DIR, "config", "system.json")


def load_json(path):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def get_tts_settings():
    """tts.json 및 system.json에서 현재 언어에 맞는 설정을 로드합니다."""
    tts_config = load_json(TTS_CONFIG_PATH)
    sys_config = load_json(SYSTEM_CONFIG_PATH)

    lang = sys_config.get("lang", "ko")
    voices = tts_config.get(
        "voices", {"ko": "ko-KR-SunHiNeural", "en": "en-US-AvaNeural"}
    )

    return {
        "voice": voices.get(lang, voices.get("ko")),
        "rate": tts_config.get("rate", "+10%"),
        "pitch": tts_config.get("pitch", "+20Hz"),
        "volume": tts_config.get("volume", "+0%"),
    }


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

    if not os.path.exists(output_path):
        success = generate_edge_tts(text, current_voice, output_path, settings)
        if not success:
            return None

    return f"/static/audio/tts_cache/{filename}"


def generate_edge_tts(
    text, voice=None, output_path="static/audio/tts.mp3", settings=None
):
    """edge-tts를 사용하여 음성 파일 생성 (환경 설정 반영 버전)"""

    if not settings:
        settings = get_tts_settings()

    current_voice = voice if voice else settings["voice"]

    async def _generate():
        communicate = edge_tts.Communicate(
            text,
            current_voice,
            pitch=settings["pitch"],
            rate=settings["rate"],
            volume=settings["volume"],
        )
        await communicate.save(output_path)

    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        asyncio.run(_generate())
        return True
    except Exception as e:
        print(f"Edge TTS Error: {e}")
        return False
