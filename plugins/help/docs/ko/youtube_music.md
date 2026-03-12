# 🎵 YouTube Music (유튜브 뮤직) 가이드

AEGIS는 사용자의 YouTube Music 계정과 연동하여 대시보드 배경음악(BGM)을 스마트하게 제어합니다.

![YouTube Music](/static/img/user_guide_youtube_music.png)

## ✨ 주요 기능
- **백그라운드 BGM**: 사용자의 플레이리스트나 재생목록을 실시간으로 가져와 재생합니다.
- **애니메이션 동기화**: 음악의 비트에 맞춰 아바타가 리듬을 타거나 댄스를 추는 시각적 효과를 제공합니다. (후원자 혜택 고도화 예정)
- **터미널 제어**: 터미널 HUD를 통해 음악 재생, 정지, 다음 곡 등의 명령을 내릴 수 있습니다.

## ⚙️ 설정 방법 (중요)
YouTube Music 연동을 위해서는 본인 계정의 인증 헤더 정보가 필요합니다.

1. PC 브라우저에서 [YouTube Music](https://music.youtube.com/)에 접속하여 로그인합니다.
2. `F12`를 눌러 개발자 도구를 열고 **네트워크(Network)** 탭으로 이동합니다.
3. 페이지를 새로고침(`F5`)한 뒤, 가장 상단의 요청(보통 `browse`)을 클릭합니다.
4. **Headers** 탭의 **Request Headers** 섹션에서 `Cookie`와 `Authorization` 값을 복사합니다.
5. 프로젝트 루트 폴더의 `headers_auth.txt` 파일에 해당 내용을 붙여넣습니다. (기타 상세 내용은 `headers_auth.example.txt` 참고)

## ⌨️ 관련 명령어
- `유튜브 재생`: 음악 재생 시작
- `음악 정지`: 음악 일시 정지
- `다음 곡`: 다음 트랙으로 이동
- `@youtube [검색어]`: 특정 곡이나 플레이리스트 검색 및 재생

> [!TIP]
> YouTube Music 프리미엄 계정 사용 시 더욱 안정적인 스트리밍과 애니메이션 동기화를 경험하실 수 있습니다.
