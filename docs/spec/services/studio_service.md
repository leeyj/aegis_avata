# StudioService 모듈 기능 명세서

`services/studio_service.py` 모듈은 Live2D 스튜디오 기능의 핵심 비즈니스 로직을 담당합니다. 테스트 모델 관리, 에일리어스 저장, 운영 환경 배포 등의 기능을 제공합니다.

---

## 🏗️ 클래스: `StudioService`

### 1. `get_test_models()`
*   **기능**: `test_models/` 폴더 내에 존재하는 유효한 Live2D 모델 디렉토리 목록을 반환합니다.
*   **함수 호출 방법**:
    ```python
    models = StudioService.get_test_models()
    ```
*   **반환값**: 모델 이름(폴더명) 문자열 배열 (예: `['akari_vts', 'aijier_4']`).
*   **내부 로직**: `utils.get_model_list()`를 호출하여 리스트를 필터링하고 정렬합니다.

### 2. `get_test_model_info(name)`
*   **기능**: 특정 테스트 모델의 상세 자산 정보(모션, 표정, 설정 파일 경로, 기존 에일리어스)를 조회합니다.
*   **함수 호출 방법**:
    ```python
    info = StudioService.get_test_model_info("akari_vts")
    ```
*   **파라미터**: `name` (모델 폴더명)
*   **반환값**: 자산 정보 딕셔너리
    ```json
    {
      "motions": ["motions/idle.motion3.json", ...],
      "expressions": ["expressions/joy.exp3.json", ...],
      "model_settings_file": "akari.model3.json",
      "aliases": { ... }
    }
    ```

### 3. `save_alias(name, data)`
*   **기능**: 사용자가 모델 에디터에서 설정한 에일리어스 매핑 정보를 `alias.json` 파일로 저장합니다.
*   **함수 호출 방법**:
    ```python
    StudioService.save_alias("akari_vts", {"motions": {"idle": "..."}})
    ```
*   **파라미터**: 
    - `name`: 모델 폴더명
    - `data`: 저장할 JSON 객체 데이터
*   **반환값**: `True` (성공 시) / 실패 시 예외 발생.

### 4. `apply_model(name)` 💎 (Sponsor)
*   **기능**: 테스트 환경에서 최적화된 모델을 실제 운영 환경(`models/`)으로 배포하고, 서버의 기본 모델 설정을 해당 모델로 변경합니다.
*   **함수 호출 방법**:
    ```python
    StudioService.apply_model("akari_vts")
    ```
*   **내부 로직**:
    1. `test_models/`의 원본을 `models/` 폴더로 복사 (기존 파일 존재 시 덮어쓰기).
    2. `settings.json`의 `last_model` 값을 변경하여 즉시 적용되도록 설정.

### 5. `get_reactions()`
*   **기능**: 시뮬레이터에서 사용할 `config/reactions.json`의 전체 데이터를 로드합니다.
*   **함수 호출 방법**:
    ```python
    reactions = StudioService.get_reactions()
    ```
