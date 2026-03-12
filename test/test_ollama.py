import requests
import json


def test_ollama_connection(model_name="qwen2.5-coder:7b"):
    """
    로컬에 설치된 Ollama 서버와 통신을 테스트합니다.
    """
    url = "http://localhost:11434/api/generate"

    payload = {
        "model": model_name,
        "prompt": "안녕! 너는 AEGIS 시스템의 외부 AI 엔진이야. 짧게 네 소개를 해줘.",
        "stream": False,
    }

    print(f"[*] Ollama 서버에 요청 중... (모델: {model_name})")

    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()

        result = response.json()
        print("\n[+] Ollama 응답:")
        print("-" * 30)
        print(result.get("response", "응답 내용이 없습니다."))
        print("-" * 30)
        return True

    except requests.exceptions.ConnectionError:
        print(
            "\n[!] 오류: Ollama 서버에 연결할 수 없습니다. Ollama가 실행 중인지 확인하세요."
        )
        return False
    except Exception as e:
        print(f"\n[!] 알 수 없는 오류 발생: {e}")
        return False


if __name__ == "__main__":
    test_ollama_connection()
