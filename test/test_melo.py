import os
import sys

# MeloTTS 폴더를 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
melo_dir = os.path.join(current_dir, "MeloTTS")
sys.path.append(melo_dir)

# 상세 에러 확인을 위해 try-except 제거
from melo.api import TTS

print("[Success] MeloTTS 모듈 로드 성공")


def test_melo():
    # 기기 설정 (CPU 전용)
    device = "cpu"

    print(
        "[Voice] MeloTTS 모델 로딩 중 (최초 실행 시 모델 다운로드로 인해 시간이 소요될 수 있습니다)..."
    )
    try:
        # 한국어 모델 로드
        model = TTS(language="KR", device=device)
        speaker_ids = model.hps.data.spk2id
        print(f"[Info] 사용 가능한 화자: {speaker_ids}")

        for lang, spk_id in model.hps.data.spk2id.items():
            print(f"언어: {lang}, 화자 ID: {spk_id}")

        output_path = os.path.join(current_dir, "test_melo_output.wav")
        text = "안녕하세요? 멜로 티티에스 테스트입니다. 사람처럼 자연스러운 목소리가 나오는지 확인해 보세요. 이 엔진은 씨피유에서도 아주 빠르게 동작합니다."

        print(f"[Voice] 음성 생성 중: '{text}'")
        # 화자 ID 0번 사용 (기본)
        model.tts_to_file(text, speaker_ids["KR"], output_path, speed=1.3)

        print(f"\n[Success] 음성 생성 완료: {output_path}")
        print("파일을 재생하여 음질을 확인해 보세요.")

    except Exception as e:
        import traceback

        traceback.print_exc()
        print(f"[Error] 테스트 실패: {e}")


if __name__ == "__main__":
    test_melo()
