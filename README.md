# AEGIS Intelligence Dashboard

AEGIS(에이지스)는 AI(Gemini) 모델과 Edge-TTS를 결합하여 만든 실시간 지능형 개인 비서 대시보드입니다.  
사용자의 하루 일정, 주식/금융 시장 데이터, 실시간 날씨, 최신 뉴스 헤드라인, 미확인 이메일 등을 수집하여 브리핑하고, 실시간 반응형 2D 아바타(Live2D)를 통해 시각적·음성적 상호작용을 제공합니다.


## ✨ 주요 기능
- **통합 대시보드**: 날씨, 뉴스, 구글 일정, 투두리스트, 금융 지수 및 관심 주식 종목, 시스템 리소스 등 한눈에 확인.
- **AI 스마트 브리핑**: 현재 수집된 모든 데이터를 바탕으로 AI(Gemini)가 상황에 맞는 아침/저녁 브리핑을 음성으로 진행.
- **반응형 아바타 (Live2D)**: 상황과 정보(예: 주가 급등/급락)에 따라 모션과 표정이 달라지는 쌍방향 인터랙션.
- **백그라운드 BGM 모듈**: YouTube Music API를 활용하여 사용자가 원하는 플레이리스트나 재생목록을 실시간으로 가져와 BGM 재생.
- **선제적 알림(Proactive Agent)**: 설정한 임계값(예: 주가 급등락, 임박한 일정)에 도달하면 즉시 자동으로 음성 알림 발생.

---
![대시보드 화면](img/main2.png)


![대시보드 화면](img/main1.png)


![대시보드 화면](img/main3.png)
---

## ✨ 애니메이션 기능
- **음성 브리핑, 유튜브 뮤직(프리미엄 계정필요) 리듬에 맞추어 애니메이션이 움직입니다.**:
![애니메이션1](img/ani1.gif)

- **메일 수신, 주식 급등락, 일정 임박 등 알림 발생시 애니메이션이 움직이며 음성이 출력됩니다.**:
![애니메이션2](img/ani2.gif)

![애니메이션3](img/ani3.gif)
 
## 💎 후원자 혜택 (Sponsorship Benefits)
 
AEGIS 프로젝트의 지속적인 발전을 위해 후원해 주시는 분들께는 다음과 같은 프리미엄 기능을 제공합니다.
 
| 분류 | 기능 | 일반 사용자 | 후원자 (Sponsor) |
|:---:|---|:---:|:---:|
| **대시보드** | 날씨, 뉴스, 주식, 일정 위젯 | O | O |
| **아바타** | Live2D 캐릭터 렌더링 및 상호작용 | O | O |
| **설정** | 커스텀 모드 및 테마 설정 | O | O |
| **자동화** | **지능형 알리아스(Alias) 자동 생성 도구** | X | **O (Sponsor Key)** |
| **댄스 모듈** | **YouTube Music 비트 싱크 댄스 로직** | 기본 | **고도화 예정** |
| **지원** | 기술 지원 및 기능 요청 우선순위 | - | **최우선 반영** |
 
> [!TIP]
> 후원은 [**GitHub Sponsors**](https://github.com/sponsors/leeyj)를 통해 진행하실 수 있으며, 후원 시 전용 **Sponsor Key**와 **Seed Value**를 발급해 드립니다.
 
## 🚀 설치 및 실행 방법

### 1. 패키지 설치
이 프로젝트는 Python 3.10 이상 환경을 권장합니다.
```bash
git clone https://github.com/leeyj/aegis_avata.git
cd aegis_avata
pip install -r requirements.txt
```

### 2. 초기 템플릿 설정
저장소에 포함되어 있는 `.example` 설정 파일들을 복사하여 실제 사용할 파일명으로 변경해 주세요.
* `config/secrets.example.json` ➔ `config/secrets.json`
* `config/weather.example.json` ➔ `config/weather.json`
* `headers_auth.example.txt` ➔ `headers_auth.txt`
* `settings.example.json` ➔ `settings.json`

> **Note:** 위 파일들은 `.gitignore`에 등록되어 본인의 민감한 인증 정보가 다시 Github에 노출되지 않도록 보호됩니다.

### 3. Live2D 아바타 모델 준비
라이선스 정책에 의해 GitHub 리포지토리에는 기본 아바타 모델(`models/` 디렉토리 내용물)이 포함되어 있지 않습니다.
1. [Live2D 공식 샘플 모델 배포처](https://www.live2d.com/en/learn/sample/)에서 원하시는 샘플 모델(예: 아카리, 히요리 등)을 다운로드 받습니다.
2. 다운로드 받은 파일들의 압축을 푼 뒤, 프로젝트 루트 디렉토리 안에 있는 `models/` 폴더 내부에 모델별 폴더명(예: `models/akari_vts`)으로 모두 붙여넣습니다.
3. 캐릭터 사용 시 `settings.json`의 `"last_model"` 값을 본인이 다운로드해 지정한 폴더 이름(예: `"akari_vts"`)으로 일치시켜야 정상적으로 화면에 나타납니다.

### 4. 모델 검증 및 자동화 도구 (선택 사항)
다양한 Live2D 모델의 모션/표정 파일명을 표준화된 별명(Alias)으로 통합 관리할 수 있는 도구를 제공합니다.
*   **파일 검증 및 알리아스 생성**: `python test_models/check_assets.py --alias`
*   **누락 모델 확인**: `python test_models/check_missing_alias.py`
*   상세한 사용법은 [**자산 검증 및 알리아스 가이드(ASSET_GUIDE.md)**](test_models/ASSET_GUIDE.md)를 참고하세요.

---

## ⚙️ 외부 API 설정 가이드

### 1. Google API 인증 설정 (일정, 할일, 지메일 연동)
AEGIS는 Google Calendar, Tasks, Gmail API를 읽기 전용(Read-only)으로 호출하여 데이터를 가져옵니다. 
1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트를 만들고, `Google Calendar API`, `Google Tasks API`, `Gmail API`를 활성화하세요.
2. **사용자 인증 정보(Credentials)** 탭에서 'OAuth 2.0 클라이언트 ID (데스크톱 앱)'를 생성한 뒤, `.json` 파일을 다운로드하세요.
3. 다운로드한 파일 이름을 **`credentials.json`**으로 변경하여 `config` 폴더 안에 넣으세요.
4. **`config/google.json`** 파일을 열고 `"auth"` 항목을 본인의 계정 분리 방식에 맞게 설정하세요.
    * **단일 계정 사용 시:** (일정과 업무메일 모두 같은 계정)
      ```json
      "auth": {
          "calendar": "token.json",
          "tasks": "token.json",
          "gmail": "token.json"
      }
      ```
    * **다중 계정 사용 시:** 개인 일정용, 회사 메일용 등 분리하려면 파일명을 다르게 맵핑하면 됩니다.
5. 앱을 최초 실행하면 구글 로그인 창이 팝업되며, 인증 완료 시 설정한 토큰 파일이 자동으로 생성되어 유지됩니다.

### 2. YouTube Music 헤더 설정 (BGM 재생)
재생목록, 플레이리스트 연동 등은 사용자의 YouTube Music 본인 계정 정보가 필요합니다. `ytmusicapi`를 사용하며, 브라우저 쿠키(Headers) 정보 추출이 필요합니다.
1. 크롬(Chrome)이나 엣지(Edge) 브라우저에서 [YouTube Music (music.youtube.com)](https://music.youtube.com/)에 접속하여 본인 계정으로 로그인합니다.
2. **`F12`**를 눌러 **개발자 도구(Developer Tools)**를 엽니다.
3. **네트워크(Network)** 탭으로 이동한 후, 웹페이지를 새로고침(F5)합니다.
4. 목록 중 맨 위에 위치한 네트워크 리소스(보통 `music.youtube.com/` 또는 `browse`)를 클릭합니다.
5. 우측 세부 정보의 **Headers** 탭 스크롤을 내려 **Request Headers** 섹션을 찾습니다.
6. 복사하려는 헤더(`User-Agent`, `Cookie`, `Authorization`, `Accept-Language` 등) 항목을 복사하거나 `Request Headers` 전체를 복사합니다.
7. 루트 디렉토리에 있는 **`headers_auth.txt`** (또는 `.json`) 파일 내부에 복사한 내용을 붙여넣어 줍니다. 
    * 템플릿 파일인 `headers_auth.example.txt`의 구조를 참고하여 `Cookie`와 `Authorization` 데이터 값들을 업데이트하세요.

### 3. OpenWeatherMap 및 기타 설정
* **날씨 API:** [OpenWeatherMap](https://openweathermap.org/)에서 무료 API 키를 발급받아 `config/weather.json`의 `"api_key"` 란에 기입하세요.
* **Gemini API & 보안키:** [Google AI Studio](https://aistudio.google.com/)에서 Gemini API 키를 받고 `config/secrets.json`에 입력하세요. 접속용 관리자 비밀번호도 이곳에서 변경할 수 있습니다.

### 4. 설정 파일 및 핵심 기능 설명 (Debug Mode & Character Panel)
* **디버그 모드 (Debug/Test Mode)**
  * **목적**: API 할당량(Gemini 호출 등)을 아끼거나, 서버 통신 없이 프론트엔드/UI 변경 사항만 빠르게 테스트하고 싶을 때 사용합니다.
  * **적용 방법**: `settings.json` 파일에서 `"test_mode": true`로 변경하거나, 백엔드 코드(`routes/config.py`)내부의 `DEBUG_MODE` 변수 값을 활성화시킵니다.
  * **효과**: 활성화할 경우 음성 브리핑 생성 시 실제 Gemini AI를 거치지 않고 로컬에 임시 저장되어 있는 마지막 텍스트(캐시 데이터)와 TTS 파일을 그대로 불러와 출력합니다.

* **반응형 캐릭터(Live2D) 판넬**
  * **기능**: 대시보드 화면 중앙 하단(또는 측면)에 위치한 캐릭터는 단순한 그림이 아닙니다. 실제 마우스 커서를 따라 시선을 이동하며, 브리핑 시 입 모양을 맞추는 립싱크(Lip-sync)를 지원합니다.
  * **모델 변경**: `settings.json` 내의 `"last_model"` 값(예: `"akari_vts"`)을 변경하여 시작 캐릭터를 고정할 수 있습니다.
  * **인터랙션 액션**: 날씨가 흐릴 때 찡그림, 주식 하락 시 슬픈 모션, 알람 발생 시 놀라는 표정 등, 데이터 수집 결과에 연동된 자동 감정 표현 기능이 `reactions.json` 규칙에 의해 동작합니다.

* **이벤트 반응 규칙 엔진 (`config/reactions.json`) 설정 방법**
  * **목적**: 데이터 수집 결과(예: 관심종목 급등, 비 오는 날씨, 새 메일 도착)에 따라 아바타가 어떤 행동(표정 변화, 모션, 음성 알림)을 할지 **사용자가 직접 프로그래밍**할 수 있는 강력한 기능입니다.
  * **주요 문법 및 구조**:
    * `"condition"`: 자바스크립트(JS) 조건식입니다. (예: 주가가 3% 이상 올랐을 때 ➔ `"change_pct >= 3"`)
    * `"actions"`: 조건이 맞을 때 수행할 행동(배열)입니다.
      * `"type": "MOTION"` 또는 `"EMOTION"` ➔ 캐릭터의 애니메이션을 변경합니다. 이때 `"file"`에는 본인이 사용하는 Live2D 모델의 실제 모션/표정 파일명(예: `Shock.motion3.json`)을 적어주어야 작동합니다. **(★사용하는 아바타 모델마다 파일 이름이 다르므로 반드시 확인 후 매핑해야 합니다.)**
      * `"type": "TTS"` ➔ 대시보드의 스피커를 통해 알림을 읽어줍니다. `"template"` 내에 `{name}`, `{price}`, `{change_pct_abs}` 등 변수를 섞어 넣으면 실시간 데이터가 합성되어 음성으로 재생됩니다.

---

## ▶️ 서버 실행

설정이 모두 완료되었다면 아래 명령어로 대시보드 서버를 구동합니다.
```bash
python gods.py
# 또는
python routes/main.py
```
* 로컬 브라우저에서 `http://127.0.0.1:8001` 로 접속
* 배포용 서버일 경우 운영/내부 네트워크 IP (예: `http://192.168.0.x:8001`)를 통해 접근할 수 있습니다.

## 🤝 라이선스
MIT License (※ 본 프로젝트에 포함된 Live2D 모션/모델의 경우 Live2D 공식 또는 해당 작성자의 라이선스를 따릅니다.)

---

# AEGIS Intelligence Dashboard (English)

AEGIS is a real-time intelligent personal assistant dashboard that combines AI (Gemini) models with Edge-TTS.  
It collects and briefs users on their daily schedules, stock/financial market data, real-time weather, the latest news headlines, unread emails, and more. It provides visual and vocal interactions through a real-time responsive 2D avatar (Live2D).


## ✨ Key Features
- **Integrated Dashboard**: Check weather, news, Google Calendar, To-do list, financial indices, watchlists, and system resources at a glance.
- **AI Smart Briefing**: AI (Gemini) provides context-aware morning/evening briefings via voice, based on all currently collected data.
- **Responsive Avatar (Live2D)**: Interactive 2D characters that change motions and expressions based on context and information (e.g., stock price surges or crashes).
- **Background BGM Module**: Utilizes the YouTube Music API to fetch and play BGM from user-preferred playlists or queues in real-time.
- **Proactive Agent**: Triggers immediate voice notifications when predefined thresholds are met (e.g., significant stock fluctuations, upcoming appointments).

---
![Dashboard Screen](img/main2.png)


![Dashboard Screen](img/main1.png)


![Dashboard Screen](img/main3.png)
---

## ✨ Animation Features
- **Animations move in sync with voice briefings and YouTube Music rhythm (requires Premium account)**:
![Animation 1](img/ani1.gif)

- **Animations play and voice output is generated when notifications occur (email reception, stock fluctuations, upcoming schedules, etc.)**:
![Animation 2](img/ani2.gif)

![Animation 3](img/ani3.gif)
 
## 💎 Sponsorship Benefits
 
We provide premium features to those who support the continuous development of the AEGIS project.
 
| Category | Feature | Free User | Sponsor |
|:---:|---|:---:|:---:|
| **Dashboard** | Weather, News, Stocks, Calendar Widgets | O | O |
| **Avatar** | Live2D Character Rendering & Interaction | O | O |
| **Settings** | Custom Modes and Theme Settings | O | O |
| **Automation** | **Intelligent Alias Auto-Generation Tool** | X | **O (Sponsor Key)** |
| **Dance Mode** | **YouTube Music Beat-Synced Dance Logic** | Basic | **Advanced (Planned)** |
| **Support** | Tech Support & Feature Request Priority | - | **Top Priority** |
 
> [!TIP]
> You can support us via [**GitHub Sponsors**](https://github.com/sponsors/leeyj). Upon sponsoring, you will receive a unique **Sponsor Key** and **Seed Value**.
 
## 🚀 Setup and Execution

### 1. Package Installation
This project recommends a Python 3.10 or higher environment.
```bash
git clone https://github.com/leeyj/aegis_avata.git
cd aegis_avata
pip install -r requirements.txt
```

### 2. Initial Template Configuration
Copy the `.example` configuration files included in the repository and rename them to the actual files to be used.
* `config/secrets.example.json` ➔ `config/secrets.json`
* `config/weather.example.json` ➔ `config/weather.json`
* `headers_auth.example.txt` ➔ `headers_auth.txt`
* `settings.example.json` ➔ `settings.json`

> **Note:** These files are registered in `.gitignore` to prevent your sensitive authentication information from being exposed on GitHub.

### 3. Live2D Avatar Model Preparation
Due to licensing policies, the GitHub repository does not include default avatar models (contents of the `models/` directory).
1. Download your preferred sample models (e.g., Akari, Hiyori, etc.) from the [Live2D Official Sample Model Distribution](https://www.live2d.com/en/learn/sample/).
2. Extract the downloaded files and paste them into the `models/` folder in the project root directory, using model-specific folder names (e.g., `models/akari_vts`).
3. To use a character, match the `"last_model"` value in `settings.json` with the folder name you specified (e.g., `"akari_vts"`) for it to appear correctly on the screen.

### 4. Model Validation and Automation Tools (Some features for Sponsors only)
Tools are provided to manage motion/expression filenames of various Live2D models through standardized aliases.
*   **File Validation**: `python test_models/check_assets.py`
*   **Intelligent Alias Generation [Sponsors Only]**: `python test_models/check_assets.py --alias`
*   **Check Missing Models**: `python test_models/check_missing_alias.py`
*   For detailed usage, refer to the [**Asset Validation and Alias Guide (ASSET_GUIDE.md)**](test_models/ASSET_GUIDE.md).

---

## ⚙️ External API Configuration Guide

### 1. Google API Authentication Setup (Calendar, Tasks, Gmail Integration)
AEGIS calls Google Calendar, Tasks, and Gmail APIs in Read-only mode to fetch data. 
1. Create a new project in the [Google Cloud Console](https://console.cloud.google.com/) and enable `Google Calendar API`, `Google Tasks API`, and `Gmail API`.
2. In the **Credentials** tab, create an "OAuth 2.0 Client ID (Desktop App)" and download the `.json` file.
3. Rename the downloaded file to **`credentials.json`** and place it in the `config` folder.
4. Open the **`config/google.json`** file and set the `"auth"` entry according to your preferred account separation method.
    * **Single Account Usage:** (Both calendar and work email on the same account)
      ```json
      "auth": {
          "calendar": "token.json",
          "tasks": "token.json",
          "gmail": "token.json"
      }
      ```
    * **Multiple Account Usage:** Map different filenames to separate personal calendars, company emails, etc.
5. Upon the first execution, a Google login window will pop up. Once authentication is complete, the specified token file will be automatically generated and maintained.

### 2. YouTube Music Header Setup (BGM Playback)
Fetching playlists and queues requires the user's YouTube Music account information. It uses `ytmusicapi` and requires extracting browser cookie (headers) information.
1. Log in to [YouTube Music (music.youtube.com)](https://music.youtube.com/) with your account in Chrome or Edge.
2. Press **`F12`** to open **Developer Tools**.
3. Go to the **Network** tab and refresh the page (F5).
4. Click on the topmost network resource (usually `music.youtube.com/` or `browse`).
5. In the **Headers** tab on the right, scroll down to the **Request Headers** section.
6. Copy the necessary header entries (`User-Agent`, `Cookie`, `Authorization`, `Accept-Language`, etc.) or copy the entire `Request Headers` section.
7. Paste the copied content into the **`headers_auth.txt`** (or `.json`) file in the root directory. 
    * Refer to the structure of `headers_auth.example.txt` to update the `Cookie` and `Authorization` data values.

### 3. OpenWeatherMap and Other Settings
* **Weather API:** Obtain a free API key from [OpenWeatherMap](https://openweathermap.org/) and enter it in the `"api_key"` field of `config/weather.json`.
* **Gemini API & Security Key:** Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/) and enter it in `config/secrets.json`. You can also change the administrator password for access here.

### 4. Config Files and Core Feature Descriptions (Debug Mode & Character Panel)
* **Debug Mode (Debug/Test Mode)**
  * **Purpose**: Used to save API quotas (e.g., Gemini calls) or to quickly test frontend/UI changes without server communication.
  * **How to Apply**: Change `"test_mode": true` in `settings.json`, or enable the `DEBUG_MODE` variable in the backend code (`routes/config.py`).
  * **Effect**: When enabled, voice briefings will use the last stored text (cached data) and TTS file locally instead of calling the actual Gemini AI.

* **Responsive Character (Live2D) Panel**
  * **Features**: The character at the center bottom (or side) of the dashboard is not just a static image. It tracks the mouse cursor with its gaze and supports lip-syncing during briefings.
  * **Changing Models**: You can fix the starting character by changing the `"last_model"` value in `settings.json` (e.g., `"akari_vts"`).
  * **Interaction Actions**: Automatic emotional expressions (e.g., frowning in cloudy weather, sad motions on stock dips, surprised expressions on alarms) triggered by gathered data function according to `reactions.json` rules.

* **Event Reaction Rules Engine (`config/reactions.json`) Setup**
  * **Purpose**: A powerful feature that allows **users to directly program** what actions (expression changes, motions, voice notifications) the avatar performs based on data collection results (e.g., interest stock surge, rainy weather, new email arrival).
  * **Key Syntax and Structure**:
    * `"condition"`: JavaScript (JS) conditional expression. (e.g., when stock price rises by 3% or more ➔ `"change_pct >= 3"`)
    * `"actions"`: Array of actions to perform when the condition is met.
      * `"type": "MOTION"` or `"EMOTION"` ➔ Changes the character's animation. The `"file"` field must be set to the actual motion/expression filename of your Live2D model (e.g., `Shock.motion3.json`). **(★Since filenames differ per avatar model, ensure you verify and map them correctly.)**
      * `"type": "TTS"` ➔ Reads the notification via the dashboard speaker. You can mix variables like `{name}`, `{price}`, `{change_pct_abs}` within the `"template"` to synthesize real-time data into speech.

---

## ▶️ Running the Server

Once all settings are complete, run the dashboard server with the command below:
```bash
python gods.py
# OR
python routes/main.py
```
* Access via `http://127.0.0.1:8001` in a local browser.
* For deployment servers, access via the production/internal network IP (e.g., `http://192.168.0.x:8001`).

## 🤝 License
MIT License (*Note: Live2D motions/models included in this project follow the official Live2D license or the license of their respective creators.)
