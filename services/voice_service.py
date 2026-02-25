import os
import requests
import json
import asyncio
import edge_tts


def generate_edge_tts(
    text, voice="ko-KR-SunHiNeural", output_path="static/audio/tts.mp3"
):
    """edge-tts를 사용하여 음성 파일 생성 (캐릭터 톤 튜닝 버전)"""

    async def _generate():
        # 피치(+20Hz)와 속도(+10%)를 조절하여 더 하이톤의 캐릭터 느낌 생성
        communicate = edge_tts.Communicate(text, voice, pitch="+20Hz", rate="+10%")
        await communicate.save(output_path)

    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        asyncio.run(_generate())
        return True
    except Exception as e:
        print(f"Edge TTS Error: {e}")
        return False
