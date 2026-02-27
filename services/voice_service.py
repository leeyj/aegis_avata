import os
import asyncio
import edge_tts
import hashlib


def generate_cached_tts(text, prefix="tts", voice="ko-KR-SunHiNeural"):
    """
    텍스트 해시를 기반으로 음성을 생성하고 캐시된 URL을 반환합니다.
    """
    if not text:
        return None

    text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
    filename = f"{prefix}_{text_hash}.mp3"

    # 프로젝트 루트 기준 경로 설정
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cache_dir = os.path.join(base_dir, "static", "audio", "tts_cache")
    output_path = os.path.join(cache_dir, filename)

    if not os.path.exists(output_path):
        success = generate_edge_tts(text, voice, output_path)
        if not success:
            return None

    return f"/static/audio/tts_cache/{filename}"


def generate_edge_tts(
    text, voice="ko-KR-SunHiNeural", output_path="static/audio/tts.mp3"
):
    """edge-tts를 사용하여 음성 파일 생성 (캐릭터 톤 튜닝 버전)"""

    async def _generate():
        communicate = edge_tts.Communicate(text, voice, pitch="+20Hz", rate="+10%")
        await communicate.save(output_path)

    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        asyncio.run(_generate())
        return True
    except Exception as e:
        print(f"Edge TTS Error: {e}")
        return False
