# AEGIS v4.0.0 배포 및 전환 전략 (Deployment & Migration Strategy)

본 문서는 v3.8에서 v4.0.0(Iframe 격리 아키텍처)으로의 대규모 업데이트를 기존 사용자 및 개발자들에게 안정적으로 전달하기 위한 공식 전략을 정의합니다. 다른 AI 에이전트나 개발자들은 본 지침에 따라 배포 및 마이그레이션을 수행해야 합니다.

## 1. Git 브랜치 및 버전 관리 정책

| 대상 | 브랜치 | 버전 태그 | 비고 |
|---|---|---|---|
| **Legacy 사용자** | `legacy-v3-stable` | `v3.8.x` | v3.x 환경을 계속 유지하고 싶은 사용자용 |
| **최신 버전 (v4.0)** | `main` | `v4.0.0` | 새로운 표준 아키텍처 (Iframe/ESM) |
| **개발 중 버전** | `v4-dev` | `v4.0.0-rc.x` | 기능 추가 및 테스트 브랜치 |

- **Semantic Versioning**: Iframe 격리 도입은 파괴적 변경(Breaking Changes)을 포함하므로 **v4.0.0**으로 메이저 버전을 올립니다.
- **Merge Flow**: 현재의 `gods_v4` 작업물을 `main`으로 Merge하기 전, 기존 `main`의 상태를 `legacy-v3-stable` 브랜치로 생성하여 보존합니다.

## 2. 사용자 유형별 대응 가이드

### ① v3.8 유지 사용자 (Legacy Preservation)
- 사용자는 `git checkout legacy-v3-stable` 명령을 통해 호환 환경을 유지할 수 있습니다.
- 백엔드 의존성(Python 3.10+) 및 프론트엔드 DOM 구조가 v3 표준을 따릅니다.

### ② v4.0 신규 사용자 (New Installation)
- 최신 `main` 브랜치를 사용하며, 전수 조사된 [Plugin-X Guide](Plugin-X_Guide.md)에 따라 개발을 시작합니다.
- `create_plugin.py` v1.5.0 이상을 사용하여 V4 표준 보일러플레이트를 생성합니다.

### ③ v3.8 -> v4.0 업그레이드 사용자 (Migration)
- **설정 호환**: `config/secrets.json` 및 `settings.json`의 핵심 필드는 v4에서도 호환되도록 유지됩니다.
- **플러그인 전환**: 기존 DOM 기반 플러그인은 Iframe 격리 환경에서 작동하지 않으므로, 마이그레이션 가이드에 따라 `manifest.json` 업데이트 및 Event Delegation 패턴 적용이 필요합니다.

## 3. 플러그인 호환성 엔진 (Plugin-X v4.0)

시스템 로더(`plugin_loader.js`)는 `manifest.json`의 `engine_version`을 기반으로 동작을 결정합니다.

- **`engine_version: 3`**: 로컬 DOM 주입 방식 (v4.0에서는 "Deprecated" 경고 후 로드 차단 권장).
- **`engine_version: 4`**: Iframe Sandbox + ES Module 방식 (v4.0 표준).

## 4. 실행 및 배포 타임라인

1. **검증**: 홈 서버에서 2~3일간 실서버 부하 및 안정성 테스트 수행.
2. **브랜치 동기화**: `legacy-v3-stable` 브랜치 생성 및 `main`으로 v4 코드 수동 Merge.
3. **공식 공지**: `README.md` 수정 및 `UPDATE_LOG.md`에 v4.0.0 릴리즈 기록.

---
**Note to AI Agents**: AEGIS v4.0.0 이후의 모든 플러그인 개발은 반드시 Iframe 격리를 전제로 하며, `context.resolve()`를 통한 절대 경로 참조 규약을 준수해야 합니다.
