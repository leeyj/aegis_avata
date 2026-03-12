import requests
import json


def test_api_interact():
    """
    AEGIS 외부 API 엔드포인트(/api/v1/external/interact)를 테스트합니다.
    """
    url = "http://localhost:8001/api/v1/external/interact"

    # 헤더에 API 키 포함 (secrets.json에 설정된 ollama 키)
    headers = {
        "X-AEGIS-API-KEY": "aegis_ollama_key_2026",
        "Content-Type": "application/json",
    }

    # 요청 페이로드
    payload = {
        "source": "Ollama",
        "command": "speak",
        "payload": {
            "text": "외부 시스템 API 연동 테스트 중입니다. 아바타가 정상적으로 반응하는지 확인하세요.",
            "motion": "joy",
            "interrupt": True,
        },
    }

    print(f"[*] API 요청 중: {url}")

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        print(f"[!] 상태 코드: {response.status_code}")

        if response.status_code == 200:
            print("[+] 성공!")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        else:
            print("[!] 실패!")
            print(response.text)

    except Exception as e:
        print(f"[!] 오류 발생: {e}")


if __name__ == "__main__":
    test_api_interact()
