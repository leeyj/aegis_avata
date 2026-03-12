import os
import wave
import json
from piper.voice import PiperVoice


def test_piper():
    # test 폴더 기준으로 모델 경로 설정
    test_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(test_dir, "models", "piper")

    model_name = "piper-kss-korean"
    onnx_path = os.path.join(model_dir, f"{model_name}.onnx")
    json_path = os.path.join(model_dir, f"{model_name}.onnx.json")

    if not os.path.exists(onnx_path):
        print(f"[Error] 모델 파일이 없습니다: {onnx_path}")
        return

    # 오디오 생성
    print("[Voice] Initializing Piper Voice...")
    try:
        voice = PiperVoice.load(onnx_path, config_path=json_path)
    except Exception as e:
        print(f"[Error] 모델 로드 실패: {e}")
        return

    output_path = os.path.join(test_dir, "test_piper_output.wav")
    text = "안녕하세요. 파이퍼 티 티 에스 테스트입니다. 한국어 음성 퀄리티를 확인 중입니다."

    print(f"[Voice] Generating audio for: '{text}'")
    with wave.open(output_path, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(voice.config.sample_rate)

        for chunk in voice.synthesize(text):
            wav_file.writeframes(chunk.audio_int16_bytes)

    print(f"\n[Success] Audio generated: {output_path}")


if __name__ == "__main__":
    test_piper()
