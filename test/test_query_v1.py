import requests
import json


def test_api_query():
    """
    AEGIS 양방향 AI 질의 엔드포인트(/api/v1/external/query)를 테스트합니다.
    """
    url = "http://localhost:8001/api/v1/external/query"

    # 헤더에 API 키 포함 (ollama 소스로 인증)
    headers = {
        "X-AEGIS-API-KEY": "aegis_ollama_key_2026",
        "Content-Type": "application/json",
    }

    # 질문 내용
    payload = {"prompt": "안녕? 오늘 날씨에 대해서 아바타로서 짧게 인사해줘."}

    print(f"[*] AI 질의 요청 중: {url}")
    print(f"[*] 질문: {payload['prompt']}")

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        print(f"[!] 상태 코드: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print("[+] AI 응답 성공!")
            print(f"[모델]: {result.get('model')}")
            print("-" * 30)
            print(f"[답변]: {result.get('answer')}")
            print("-" * 30)
            print("[*] 이 응답은 잠시 후 대시보드 아바타가 음성으로 출력합니다.")
        else:
            print("[!] 실패!")
            print(response.text)

    except Exception as e:
        print(f"[!] 오류 발생: {e}")


if __name__ == "__main__":
    test_api_query()
