# Utils 모듈 기능 명세서

`utils.py` 모듈은 프로젝트 전체에서 공통적으로 사용되는 설정 파일 로드, 저장, 보안 검증, 모델 탐색 등의 보조 기능을 담당합니다.

---

## 🏗️ 함수 목록 (Functions)

### 1. `load_json_config(path)`
*   **기능**: 지정된 경로의 JSON 파일을 안전하게 열고 파싱합니다. 파일이 없거나 비어 있으면 빈 딕셔너리(`{}`)를 반환합니다.
*   **함수 호출 방법**:
    ```python
    data = load_json_config("config/secrets.json")
    ```
*   **파라미터**: `path` (파일 경로)
*   **반환값**: 파싱된 데이터 객체 (딕셔너리 또는 리스트).

### 2. `save_json_config(path, data, merge=True)` 🛡️
*   **기능**: JSON 데이터를 지정된 경로에 안전하게 저장합니다. **원자적 쓰기(Atomic Write)** 방식을 사용하여 파일 손상을 방지하며, 필요 시 기존 데이터와 병합합니다.
*   **함수 호출 방법**:
    ```python
    save_json_config("settings.json", {"last_model": "..."})
    ```
*   **파라미터**:
    - `path`: 저장할 파일 경로.
    - `data`: 저장할 데이터 객체.
    - `merge`: `True`일 경우 기존 데이터와 합치고, `False`일 경우 덮어씁니다.
*   **반환값**: `True` (성공 시) / `False` (실패 시).

### 3. `is_sponsor()` 💎
*   **기능**: 암호화된 `SPONSOR_KEY`와 `SEED_KEY_VALUE`를 분석하여 현재 사용자가 유효한 후원자인지 검증합니다.
*   **함수 호출 방법**:
    ```python
    if is_sponsor():
        # 스폰서 전용 기능 실행
    ```
*   **내부 로직**:
    - `SECRETS_FILE`에서 키를 로드하여 형식을 체크합니다.
    - `SHA-256` 해시 알고리즘과 고유 솔트(`_S`)를 사용하여 무결성을 검증합니다.

### 4. `get_model_list(models_dir)`
*   **기능**: 지정된 디렉토리에서 유효한 서브 디렉토리(모델 폴더) 목록을 스캔하여 정렬된 배열로 반환합니다.
*   **함수 호출 방법**:
    ```python
    models = get_model_list("models/")
    ```
*   **파라미터**: `models_dir` (스캔할 대상 폴더 경로)
*   **반환값**: 폴더 이름 문자열 배열 (예: `['akari', 'hiyoru', ...]`).

### 5. `get_model_info(models_dir, model_name)`
*   **기능**: 특정 모델 폴더 내부의 자산(motions, expressions, model3.json) 및 에일리어스 데이터를 수집합니다.
*   **함수 호출 방법**:
    ```python
    info = get_model_info("test_models/", "akari_vts")
    ```
*   **파라미터**:
    - `models_dir`: 상위 카테고리 디렉토리.
    - `model_name`: 개별 모델 폴더명.
*   **반환값**: 자산 정보 딕셔너리.
    ```json
    {
      "motions": ["animations/...", "motions/..."],
      "expressions": ["expressions/...", ...],
      "model_settings_file": "...",
      "aliases": { ... }
    }
    ```

---

## 📁 헬퍼 함수 (Loaders/Savers)
*   `load_settings()` / `save_settings(data)`
*   `load_wallpaper_config()` / `save_wallpaper_config(data)`
*   각각 `settings.json` 및 `wallpaper.json` 파일을 전용으로 관리합니다.
