# AEGIS Documentation Structure

이 디렉토리는 역할별로 정리되어 있습니다.
This directory is organized by role.

---

## 📁 폴더 구조 (Folder Structure)

```
/docs/
├── README.md                    ← 이 파일 (문서 구조 안내) / This file (doc structure guide)
│
├── ARCHITECTURE.md              ← 시스템 전체 아키텍처 (모든 인스턴스 필독) / System architecture (must-read)
├── SPECIFICATION.md / _en       ← 시스템 설계 원칙 및 명세 / Design principles & spec
├── HANDOVER_SESSION.md / _en    ← AI 인스턴스 인계 문서 / AI instance handover
├── ROADMAP.md / _en             ← 개발 로드맵 / Development roadmap
├── UPDATE_LOG.md                ← 버전별 업데이트 이력 / Version update log
│
├── for_developer/               ← 🔧 플러그인 개발자 & AI 에이전트 전용 / For plugin developers & AI agents
│   ├── QUICK_START.md           ← 🚀 5분 퀵 스타트 / 5-min quickstart
│   ├── QUICK_START_en.md        ← 🚀 English version
│   ├── PLUGIN_SPEC.md           ← 📐 규격서 (Single Source of Truth) / Full specification
│   ├── PLUGIN_SPEC_en.md        ← 📐 English version
│   ├── AI_AGENT_PROMPT.md       ← 🤖 AI에게 복사-붙여넣기용 프롬프트 / Copy-paste prompt for AI
│   ├── AI_AGENT_PROMPT_en.md    ← 🤖 English version
│   └── archive/                 ← 🗄️ 과거 문서/감사 보고서 (참고용) / Legacy docs (reference only)
│
├── manual/                      ← 📖 최종 사용자 (비개발자) 전용 / For end users
│   ├── USER_GUIDE.md            ← 사용법 종합 가이드 / Comprehensive usage guide
│   ├── CONFIGURATION.md         ← 설정 방법 / Configuration guide
│   └── ...                      ← 위젯별 사용 가이드 / Per-widget guides
│
└── bug_report/                  ← 🐞 버그 리포트 보관 / Bug report archive
```

---

## 🗺️ "어디부터 읽어야 하나요?" / "Where should I start?"

| 역할 (Role) | 필독 경로 (Recommended Path) |
|---|---|
| **새 AI 인스턴스** (New AI Instance) | `HANDOVER_SESSION.md` → `ARCHITECTURE.md` |
| **플러그인 개발 AI** (AI Plugin Dev) | `for_developer/AI_AGENT_PROMPT.md` (이것만 복사 / just copy this) |
| **인간 개발자 (처음)** (Human Dev — First Time) | `for_developer/QUICK_START.md` → `for_developer/PLUGIN_SPEC.md` |
| **English Developers** | `for_developer/QUICK_START_en.md` → `for_developer/PLUGIN_SPEC_en.md` |
| **English (Architecture)** | `ARCHITECTURE_en.md` (System design & data flow) |
| **인간 개발자 (레퍼런스)** (Human Dev — Reference) | `for_developer/PLUGIN_SPEC.md` 직접 참조 |
| **일반 사용자** (End Users) | `manual/USER_GUIDE.md` |

> 💡 **보일러플레이트 생성기 (Boilerplate Generator)**: `python create_plugin.py --id my-widget --name "나의 위젯"`
