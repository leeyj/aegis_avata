from google import genai
import os


def check_available_models(api_key):
    print(f"Checking models with API Key: {api_key[:10]}...")
    client = genai.Client(api_key=api_key)

    try:
        print("\n[Available Generative Models]")
        print("-" * 50)
        # 새로운 SDK에서는 models.list() 사용
        for m in client.models.list():
            # supported_actions 또는 capabilities를 확인할 수 있음
            print(f"Model ID: {m.name}")
            print(f"Supported Actions: {m.supported_actions}")
            print("-" * 50)
    except Exception as e:
        print(f"Error checking models: {e}")


if __name__ == "__main__":
    # 사용자의 API 키
    MY_API_KEY = "YOUR_GEMINI_API_KEY_HERE"
    check_available_models(MY_API_KEY)
