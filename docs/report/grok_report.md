AEGIS Plugin-X 위젯 개발 시 가장 위험하고 깨지기 쉬운 패턴 정리
이전 분석에서 문서만으로 위젯 개발이 80~90% 가능하지만, 일부 불확실한 부분이 있다고 결론지었죠. 이제 반대로, 제공된 문서들(MIGRATION_GUIDE_en.md, HANDOVER_SESSION_en.md, AI_AGENT_PROMPT_en.md, Plugin-X_Guide_en.md, FRAMEWORK_REFERENCE_en.md)을 기반으로 가장 위험하고 깨지기 쉬운 패턴을 정리하겠습니다. 이는 개발자가 문서를 보고 코드를 작성할 때 에러가 발생하거나 시스템이 깨질 확률이 높은 부분입니다.
이 패턴들을 알면, 문서의 약점을 파악하고 보강할 수 있습니다. 제가 제안하는 보강 방안은 문서를 공개/개선할 때 다른 AI나 사용자가 개발에 어려움을 겪지 않도록 하는 데 초점을 맞췄습니다. 각 패턴은 "왜 위험한가?", "예상 에러/문제", "보강 제안"으로 구조화했습니다. 이는 문서의 공개 버전을 만들 때 직접 추가하거나 참조할 수 있는 내용입니다.
1. 백엔드 Blueprint 등록 및 자동 발견 관련 패턴 (e.g., router.py의 import 방식)

왜 위험한가?: 문서에서 /plugins/{id}/router.py를 Blueprint로 만들어야 한다고 명시되지만, 시스템이 어떻게 plugins 폴더를 스캔하고 app에 등록하는지 (e.g., app_factory.py의 로직) 상세히 설명되지 않음. 상대 import(from .my_service import ...)를 강조하지만, 실제 등록 시점이나 에러 핸들링이 불명확. 잘못된 import나 naming으로 blueprint이 무시될 수 있음.
예상 에러/문제: ModuleNotFoundError나 blueprint이 로드되지 않아 API 엔드포인트가 404 에러. 특히 여러 플러그인 간 namespace 충돌 (e.g., service.py 이름 사용 금지 위반).
보강 제안: 문서에 "플러그인 로더 내부 동작" 섹션을 추가. 예: "app_factory.py에서 plugins/를 os.walk()로 스캔하고, manifest.json의 entry.backend을 기준으로 동적 import (e.g., importlib.import_module(f'plugins.{id}.router'))를 수행합니다. 등록 순서는 알파벳 순." 다이어그램으로 스캔 → import → register 순서 설명. 공개 문서에 예제 router.py 전체 코드를 더 추가.

2. Frontend 초기화 타이밍 및 context 객체 주입 패턴 (e.g., widget.js의 init/destroy 호출 시점)

왜 위험한가?: init(shadowRoot, context)가 언제 호출되는지 (e.g., 페이지 로드 후? 사용자 인터랙션 시?) 명확하지 않음. destroy()에서 cleanup을 강조하지만, 타이밍 mismatch로 memory leak이나 undefined context 에러 발생. Request context guard를 언급하지만, 실제 Flask session/request와의 연동이 불명확.
예상 에러/문제: RuntimeError: Working outside of request context나 context가 undefined 되어 speak() 등 API 호출 실패. Polling(setInterval)이 destroy되지 않아 누적.
보강 제안: 문서에 "Widget Lifecycle" 섹션 추가. 예: "PluginLoader가 index.html 로드 후 Shadow DOM을 생성하고, manifest.json 순서대로 init() 호출. destroy()는 위젯 제거/페이지 unload 시 자동 호출." 시퀀스 다이어그램(PlantUML 스타일)으로 설명. 공개 시, 간단한 widget.js 템플릿에 주석으로 타이밍 예시 추가.

3. widget.html 주입 및 Shadow DOM 조작 패턴

왜 위험한가?: widget.html이 "Shadow DOM UI skeleton"이라고 하지만, 어떻게 주입되는지 (innerHTML? template clone?) 구체적이지 않음. querySelector만 사용하라고 하지만, <slot>이나 dynamic element 추가 시 호환성 문제. Global pollution 금지 강조지만, 실제 DOM traversal 범위가 불확실.
예상 에러/문제: Shadow DOM isolation 실패로 CSS bleed나 DOM not found 에러. widget.html에 <script> 태그 넣으면 global pollution 발생.
보강 제안: 문서에 "Shadow DOM Injection 상세" 섹션 추가. 예: "widget.html은 fetch로 로드되어 shadowRoot.innerHTML = htmlContent; 형태로 주입. <slot> 지원 안 함, 모든 element는 shadowRoot.querySelector로 접근." 예제 HTML/JS 쌍을 더 추가. 공개 문서에 "Common Pitfalls" 섹션으로 이 패턴 경고.

4. 환경 효과(ENVIRONMENT_CONTROL) 적용 패턴 (e.g., applyEffect(type))

왜 위험한가?: v1.9 신규 기능으로 RAINY, SNOWY, STORM, CLEAR 타입을 언급하지만, 추가 옵션(duration, intensity)이나 지원 타입 전체 목록이 없음. permissions에 등록해야 하지만, 잘못된 type으로 호출 시 silent fail.
예상 에러/문제: 효과가 트리거 안 되거나, 무한 루프로 UI freeze. 다른 플러그인과의 충돌 (e.g., 여러 플러그인이 동시에 applyEffect 호출).
보강 제안: FRAMEWORK_REFERENCE에 "Environment Effects Catalog" 테이블 추가. 예: | Type | Description | Options | e.g., RAINY | Rain effect | {duration: seconds, intensity: 0-1} |. 공개 시, weather 플러그인 예시 코드를 풀 버전으로 공유.

5. CSP 및 csp_domains 선언 패턴

왜 위험한가?: manifest.json에 csp_domains을 등록하라고 하지만, 형식(wildcard 지원? scheme 포함?)이나 적용 범위(frontend only)가 불명확. Backend에서 requests.get()은 CSP 무관하다고 하지만, 혼동으로 frontend fetch가 차단됨.
예상 에러/문제: CSP violation 에러로 external API 호출 실패. data:나 blob: 같은 특수 URI 처리 미지원 시 이미지 로드 에러.
보강 제안: manifest.json 스펙에 "CSP Domains Format" 서브섹션 추가. 예: "형식: ['https://api.example.com', '.sub.example.com']. wildcard() 지원, scheme 필수. data: 미지원." 공개 문서에 CSP 테스트 스크립트 예시 추가.

6. register_context_provider 및 Briefing 통합 패턴

왜 위험한가?: router.py에서 register_context_provider 호출하라고 하지만, 호출 시점(한 번? 매 request?)이나 provider 반환 형식(dict vs str)의 세부 규칙이 부족. Briefing 엔진과의 연동이 불명확.
예상 에러/문제: Provider가 등록 안 되어 AI briefing에서 플러그인 데이터 누락. Multiple registration으로 중복 에러.
보강 제안: FRAMEWORK_REFERENCE에 "Provider Registration Guide" 추가. 예: "router.py 최상단에서 한 번 호출: if name == 'main': pass else: register_context_provider('id', func). func는 no-arg, return dict or str." 공개 시, notion 플러그인 같은 예시에서 이 부분 highlight.

7. 플러그인 간 의존성 및 Exports 참조 패턴

왜 위험한가?: exports.sensors를 다른 플러그인이 참조할 수 있다고 암시되지만, manifest에 dependency 배열이 없음. Condition Watch에서 endpoint polling 시 인증/권한 문제 발생 가능.
예상 에러/문제: 403 Forbidden (permission mismatch)이나 무한 polling 루프로 성능 저하. 플러그인 제거 시 의존성 깨짐.
보강 제안: Plugin-X_Guide에 "Inter-Plugin Dependencies" 섹션 추가. 예: "manifest.json에 'dependencies': ['other-id'] 추가 (미지원 시 수동 체크). Exports 참조: context.askAI로 간접 쿼리." 공개 문서에 다중 플러그인 예제 (e.g., weather → scheduler 연동) 추가.

