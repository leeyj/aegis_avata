# 구현 계획서 (Implementation Plan): AEGIS Core Hardening (Sponsorship & Key Protection)

## 1. 개요 (Overview)
- **목적**: AEGIS 시스템의 핵심 가치인 '스폰서쉽 무결성'과 '사용자 API 키 보안'을 강화함.
- **핵심 전략**: 
    1. **Binary Shield**: Cython을 이용하여 보안 로직을 기계어(.pyd/.so)로 컴파일하여 소스 코드 노출 및 디컴파일 방지.
#    3. **Import Level Security (Import Firewall)**: 플러그인 로딩 시 위험한 모듈(`os`, `subprocess`, `shutil` 등)의 임포트를 검사하거나 화이트리스트 기반의 제한된 환경 제공.
    4. **Zero-Trust UI Isolation (Sandboxing)**: 브라우저 레벨의 SOP(동일 출처 정책)를 활용하여 위젯 간 데이터 탈취를 물리적으로 차단하고, 전역 객체 변조 방지. (기술적 부채로 인해 단계별 도입 필수)

## 2. 보안 타켓 및 방식 (Security Targets)

### 2.1 스폰서쉽 보호 (Sponsorship Protection)
- **대상**: `utils.py` 내의 `is_sponsor()` 로직 및 `_S (Salt)` 값.
- **방식**: 
    - 별도의 `core_security.py` 모듈로 분리 및 Cython 바이너리 컴파일.
    - Git 공개 시 소스 제외, 컴파일된 결과물만 배포.

### 2.2 API 키 보호 (Secret Key Protection)
- **대상**: `config/secrets.json` 및 `utils.load_json_config`.
- **방식**:
    - **Path Lockdown**: `inspect.stack()` 기반 호출자 경로 검증으로 `config/` 직접 접근 차단.
    - **Proxy Secret API**: 정당한 권한을 가진 플러그인에만 메모리에서 키 값 전달.

### 2.3 임포트 및 실행 보안 (Import & Execution Security)
- **대상**: 모든 플러그인 `router.py`, `{id}_service.py`, 외부 프로세스 호출부.
- **방식**:
    - **Module Allow-listing**: `sys.meta_path` 커스텀 임포터를 통한 위험 모듈(`os`, `subprocess`) 차단.
    - **Safe Execution (Subprocess)**: `shell=True` 원천 봉쇄 및 `utils.safe_run(args)` 를 통한 인자 리스트 방식 강제.

### 2.4 UI 및 브라우저 격리 (UI Sandbox - Long-term)
- **대상**: `widget.html`, `widget.js` 및 프론트엔드 전역 객체.
- **방식**:
    - **Physical Isolation**: 각 위젯을 서로 다른 서브도메인의 `iframe sandbox`에 배치하여 SOP(동일 출처 정책) 강제.
    - **Prototype Locking**: `Object.freeze`를 사용하여 `Object`, `Array` 등 JS 전역 프로토타입 변조(Monkey Patching) 방지.

## 3. 단계별 구현 계획 (Execution Steps)

| 단계 | 작업 항목 (Task) | 구현 방식 / 기술 (Method) | 보안 목표 (Security Goal) |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **보안 로직 분리 및 은닉** | `utils.py`에서 `is_sponsor` 로직을 `core_security.py`로 분리 | [DONE] 핵심 솔트(`_S`) 및 알고리즘 노출 방지 |
| **Phase 2** | **바이너리 컴파일 자동화** | Cython 사용, `setup_security.py` 빌드 스크립트 작성 | [DONE] 소스 코드 디컴파일 및 위변조 원천 차단 |
| **Phase 3** | **접근 제어 브로커 구현** | `inspect.stack()` 기반 호출자 경로 검증 레이어 도입 | 타사 위젯의 `config/` 폴더 직접 접근 차단 |
| **Phase 4.1** | **임포트 방화벽 (기본)** | `sys.meta_path`로 위험 모듈(`os`, `shutil` 등) 임포트 인터셉트 | 무분별한 시스템 자원 접근 차단 |
| **Phase 4.2** | **실행 권한 대조 (Execution)** | `manifest.json` 의 `api.system_execution` 유무 확인 | 실행 전 의도 확인 및 명시적 선언 유도 |
| **Phase 4.3** | **안전 실행 래퍼 (Safe Run)** | `utils.safe_run()` 인터페이스 제공 (Shell=False 강제) | 커맨드 인젝션 및 허가되지 않은 명령 차단 |
| **Phase 4.4** | **실행 감사 로그 (Audit)** | 모든 외부 명령 실행 내역을 `logs/execution.log`에 기록 | 사후 추적성 확보 및 사고 원인 규명 |
| **Phase 5** | **배포 파이프라인 통합** | `deploy.py`에 바이너리 빌드 및 원본 제거 로직 통합 | 배포 서버의 소스 코드 무결성 확보 |
| **Phase 6** | **보안 취약점 테스트** | 악의적 위젯(Mock)을 통한 키 탈취/시스템 파괴 시뮬레이션 | 구축된 전방위 보안 체계의 유효성 최종 검증 |
| **Phase 7** | **Zero-Trust UI 샌드박싱** | `iframe` 격리 및 전역 JS 객체 동적 잠금 (Prototype Freeze) | 위젯 간 XSS 및 세션 탈취 물리적 차단 |

> [!NOTE]
> **현재 시스템 위젯 결합도에 따른 제약 사항**:
> 현재 많은 코어 위젯이 대시보드 메인 JS와 강하게 결합되어 있어, **Phase 7**의 즉각적인 전체 적용은 어려움. 따라서 시스템 성격의 위젯은 점진적으로 API 기반 통신으로 전환하고, 제3자(Third-party) 위젯부터 우선적으로 샌드박스를 적용하는 하이브리드 전략을 취함.

## 4. 기대 효과
- **코드 유출 방지**: Git에 전체 프로젝트가 노출되어도 핵심 보안 로직은 바이너리 형태로 보호됨.
- **플러그인 보안**: 타사 위젯이 사용자 몰래 API 키를 가로채는 'Supply Chain Attack'을 원천 봉쇄.
- **임포트 원천 차단**: 악의적인 시스템 접근 라이브러리 사용을 로딩 단계에서 거부.
- **스폰서쉽 유지**: 솔트값 유출로 인한 가짜 키 생성을 방지하여 프로젝트 수익성 보호.
