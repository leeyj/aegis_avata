# AEGIS v3.8.0 도움말 시스템 강화 및 UX 개선 인수인계

## 1. 개요 및 핵심 목표
- **목표**: 사용자 접근성 향상을 위한 도움말 센터 콘텐츠의 완전한 내재화 및 단축키 UX 완성을 목표로 함.
- **주요 개선 사항**:
    - **콘텐츠 포팅**: `README.md`의 파편화된 정보를 위젯 내 국/영문 전용 문서로 통합.
    - **UX 최적화**: `Shift + H` 단축키 및 고해상도 이미지 즉시 서빙 체계 구축.
    - **시각적 강화**: 마크다운 테이블 스타일링을 통해 전술 레퍼런스 가독성 확보.

## 2. 향후 과제
- **도움말 센터 고도화 (Phase 3)**:
    - 단계별 대화형 튜토리얼(Interactive Tutorial) 기능 추가 검토.
    - 도움말 내 키워드 검색 기능 및 카테고리 분류 세분화.
- **이미지 서빙 최적화**: 향후 `img/` 폴더 대신 `static/img/`를 표준으로 관리하거나, `app_factory.py`의 라우트를 배포 모드에서도 안전하게 활성화하는 방안 검토.
- **디스코드 명령어 도움말 연동**: 디스코드 봇에서도 위젯 내 마크다운 문서를 읽어 브리핑해 주는 기능 연동.

## 3. 관련 핵심 파일
- [plugins/help/docs/](file:///c:/Python312/gods/plugins/help/docs/): 다국어 도움말 마크다운 저장소.
- [plugins/help/assets/](file:///c:/Python312/gods/plugins/help/assets/): 도움말 위젯 UI/UX 로직 (CSS/JS).
- [static/img/](file:///c:/Python312/gods/static/img/): 대시보드 및 도움말 공용 이미지 자산함.
- [routes/main.py](file:///c:/Python312/gods/routes/main.py): 이미지 서빙 폴백 라우트 포함.
- [utils.py](file:///c:/Python312/gods/utils.py): i18n 유틸리티 및 전역 설정 관리.
