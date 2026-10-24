# CLAUDE.md

증강 칼바람 커뮤니티: 리그 오브 레전드 증강 칼바람 나락 모드의 증강 정보를 친구들(약 10명)과 공유하는 취미 커뮤니티 사이트.

- 설계: `docs/superpowers/specs/2026-10-24-aram-community-v1-design.md` (기능·권한·데이터·API의 기준)
- 구현 계획: `docs/superpowers/plans/2026-10-24-aram-community-v1.md` (v1 14개 작업, 모두 완료)
- 사용자용 안내: `README.md` (디스코드 앱 등록, `.env`, 실행 방법)

## 일하는 방식

- 사용자는 **바이브코딩**으로 진행한다. 코드를 직접 읽거나 리뷰하지 않는다. 확인은 Claude가 직접 하고(테스트 실행, 브라우저로 동작 확인), 결과는 화면 기준의 쉬운 한국어로 보고한다.
- 사용자에게는 기능·화면 관점의 질문만 한다. 코드 구조 같은 기술 결정은 Claude가 정하고 이유를 짧게 알린다.
- 새 기능은 superpowers 흐름을 따른다: brainstorming → 설계 문서 → writing-plans → 실행. 테스트를 먼저 쓴다.
- 화면 문구는 모두 한국어 해요체.
- 기능 하나가 끝날 때마다 커밋한다. 원격(GitHub `yyy5044/aram`, **공개 저장소**)에 푸시는 사용자가 요청할 때만 한다.
- 커밋 이메일은 저장소 로컬 설정의 GitHub noreply 주소(`48915312+yyy5044@users.noreply.github.com`)를 쓴다. 바꾸지 않는다. 실제 이메일이 공개 기록에 남지 않게 하기 위함.

## 구조

| 폴더 | 내용 |
|---|---|
| `backend/` | Spring Boot 4.1, Java 21, JPA(Hibernate 7), Flyway, PostgreSQL 18, Spring Security OAuth2(디스코드) |
| `frontend/` | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Tiptap 3 |

백엔드는 기능별 패키지(`auth`, `user`, `gamedata`, `post`, `image`, `comment`, `like`, `scrap`, `profile`, `common`)로 나뉜다. 프론트엔드는 `api/`, `components/`(프로필 부품은 `profile/`, 증강·챔피언 탭 부품은 `tags/`), `pages/`, `editor/`, `lib/`, `test/`.

## 실행과 테스트

```bash
cd backend && ./gradlew bootRun        # PostgreSQL은 compose.yaml로 자동으로 뜬다 (Docker 필요)
cd frontend && npm run dev             # http://localhost:5173, /api·/oauth2·/login/oauth2는 8080으로 프록시
cd backend && ./gradlew test           # Testcontainers로 실제 PostgreSQL 사용
cd frontend && npm test && npm run build && npm run lint
```

- Node는 `C:\Program Files\nodejs`에 있다. Git Bash에서는 `export PATH="/c/Program Files/nodejs:$PATH"`가 필요할 수 있다.
- 브라우저 확인은 `.claude/launch.json`의 `frontend` 설정으로 미리보기를 띄운다.
- 디스코드 없이 확인할 때는 `backend/.env`에 `APP_DEV_LOGIN_ENABLED=true`를 두고 `POST /api/dev/login`(`{discordId, nickname}`, `X-XSRF-TOKEN` 헤더 필요)으로 로그인한다. 운영에서는 절대 켜지 않는다.

## 규칙

- DB 변경은 `backend/src/main/resources/db/migration`에 새 Flyway 파일(`V8__...`부터)로만 한다. Hibernate는 `ddl-auto: validate`.
- 본문 허용 서식은 서버 `post/PostContentValidator.java`와 화면 `editor/extensions.ts`가 같은 목록을 지킨다. 하나를 바꾸면 다른 쪽과 `editor/extensions.test.ts`도 바꾼다.
- 오류 응답은 `{ code, message, fieldErrors }`, 메시지는 화면에 그대로 보여줄 한국어 문장. 코드는 `common/ErrorCode.java`.
- 모든 쓰기 API는 서버에서 권한을 검사한다(`auth/CurrentUser.requireWithNickname` + 글쓴이/관리자 확인).
- 추천·댓글 수는 글 행을 `for update`로 잠근 뒤 실제 개수로 다시 센다. 동시 요청에서 숫자가 어긋나지 않게 하기 위함.
- 비밀 값은 `backend/.env`(git 제외)에만 둔다. 디스코드 키를 빈 값으로 두면 서버가 시작되지 않으므로, 값이 없으면 줄을 `#`으로 막아둔다.

## 기술 주의사항

- Spring Boot 4: JSON은 **Jackson 3**(`tools.jackson.*`, `asString()`, `stringValue()`), 어노테이션은 그대로 `com.fasterxml.jackson.annotation`. `RestClient.Builder` 빈은 자동 등록되지 않는다(`RestClient.builder()` 사용). MockMvc 자동 설정은 `org.springframework.boot.webmvc.test.autoconfigure`.
- 테스트 설정 `src/test/resources/application-test.yml`은 개발자의 `backend/.env` 값이 섞이지 않게 개발 로그인을 끈다.
- 프론트엔드 테스트 렌더(`test/render.tsx`)는 실제 앱처럼 StrictMode로 감싼다. StrictMode에서만 드러나는 버그(효과 두 번 실행, 편집기 재생성)가 실제로 있었다.
- 게임 데이터는 서버가 6시간마다 Data Dragon `versions.json`을 확인하고, 패치가 바뀌었을 때만 챔피언(`ko_KR/champion.json`)과 증강(CommunityDragon `kiwi.bin.json` + 한국어 문자열 표)을 다시 받는다. 패치 표기는 `16.21.1` → `26.21`. 증강 등급은 `kiwi.bin.json`의 `rarity`(없음·0 실버, 1 골드, 2 프리즘)에서 오고, `Enabled: false`인 증강은 받지 않는다. 증강 데이터 컬럼을 더했을 때는 마이그레이션에서 `game_data_state.current_ddragon_version`을 비워 시작 시 전체 재동기화를 유도한다(V7 참고).
- 증강 설명은 동기화 때 언어별(영어·한국어)로 문자열 표를 받아 `gamedata/text/`에서 자리표시자(`@TotalShield@` 등)를 수치 표로 계산해 완성된 글로 `augment_texts`에 저장한다(V8). 언어를 더하려면 `AugmentLocale`에 항목을 추가한다. 못 채운 자리표시자는 DB에 이름 그대로 남고(동기화 로그에 수가 찍힌다) 화면과 복사 글에서는 `?`로 보인다(`lib/augmentDescription.ts`). 계산식·수치 이름도 이름을 모르면 `{해시}`(소문자 이름의 FNV-1a 32비트, 8자리 16진수)로 들어 있어서 `SpellValues.hashedName`으로 한 번 더 찾는다(문자열 표의 XXH3 해시와 다른 방식). 남은 원인은 게임 중 누적치, 모르는 계산 종류, 스탯 번호 8·9·34 등. 색 표식 허용 목록은 서버 `AugmentDescriptionBuilder.COLOR_TAGS`와 화면 `lib/augmentDescription.ts`가 같아야 한다. CommunityDragon 문자열 표는 이름을 모르는 키를 `{해시}`(소문자 키의 XXH3-64 하위 38비트, 10자리 16진수. 커뮤니티드래곤 `data/hashes/lol/hashes.rst.xxh3.txt`가 원래 키 이름 목록)로 내보낸다. 새 패치 증강(16.21 기준 41개, "장갑 충격"·"보석 팔찌" 등)의 이름·툴팁이 그렇게 들어 있어서 `StringTableKeys.hashedKey`로 같은 해시를 만들어 찾는다(16.21 기준 240개 모두 설명이 있다). 새 증강은 큰 아이콘 경로도 `{해시}`로만 있어 열리지 않으므로 작은 아이콘을 쓴다. 그래도 글이 없는 증강은 클라이언트 증강 목록 `plugins/rcp-be-lol-game-data/global/{ko_kr|default}/v1/cherry-augments.json`(이름은 옛것이지만 칼바람 증강도 들어 있음)에서 이름만 보충하고, 카드에는 "아직 설명이 없어요"가 보인다. 이 목록은 보조 자료라 못 받아도 동기화는 계속된다. 실제 증강 풀은 같은 폴더의 `augment-lists.json`의 `KIWI` 목록(249개 = 활성 240 + 꺼진 9)과 비교해 확인할 수 있다.
- 화면 언어 설정(`lib/language.ts`, 머리말 드롭다운, localStorage `lang`)은 지금 증강 카드의 번역 언어만 바꾼다. 화면 문구 번역(i18n)은 아직 없다.

## 환경 주의사항 (이 컴퓨터)

- **Docker Desktop을 에이전트 셸에서 실행하지 않는다.** Claude 데스크톱 앱 안에서 켜면 소켓 파일 문제로 계속 꺼진다. `docker info`가 실패하면 사용자에게 시작 메뉴에서 켜달라고 부탁한다. 이미 켜진 Docker를 CLI로 쓰는 것은 괜찮다.
- 백엔드를 다시 띄우기 전에 8080 포트에 남은 이전 프로세스가 있으면 정리한다(명령줄에 `com.aram.community.BackendApplication`이 있는 것만).
- Vite가 연달아 저장된 파일 변경을 놓쳐 예전 코드를 내보낼 때가 있다. 디스크 파일이 맞는데 화면이 이상하면 개발 서버를 재시작한다.
- 셸 명령 하나에 heredoc 여러 개를 묶으면 따옴표 해석이 깨지는 일이 있었다. 파일은 하나씩 쓴다.

## 남은 일

작업을 마칠 때마다 이 목록을 실제 상태에 맞게 고친다.

**완료**
- 2026-10-24: 디스코드 앱 등록(앱 이름 `aram`, Client ID `1563452857179578451`), 로컬에서 실제 디스코드 로그인 성공. 관리자는 사용자 "하포"(디스코드 ID `472407196144107529`). 디스코드 개발자 포털 Redirects에는 `http://localhost:5173/login/oauth2/code/discord`만 등록돼 있다.
- 2026-10-24: 프로필 페이지(`/users/:userId`, `/settings/profile`) — 활동 잔디(한국 시간, 53주/좁은 화면 26주), 통계, 쓴 글·쓴 댓글·스크랩 탭, 공개/비공개, 직접 올린 프로필 사진, 글 스크랩. 설계 `docs/superpowers/specs/2026-10-24-profile-design.md`, 계획 `docs/superpowers/plans/2026-10-24-profile.md`.
- 2026-10-24: 증강 카드 — 증강 탭에서 증강을 누르면 게임 카드 틀(CommunityDragon 그림)로 영어 원문 카드와 선택 언어 카드가 나란히 나오고(같은 언어면 한 장), 수치가 채워진 긴 설명에 게임 색 표식을 입힌다. 마우스를 올리면 복사 버튼, 머리말에 언어 설정(한국어·English), 글 목록은 한 줄짜리. API `GET /api/augments/{id}?lang=`. 설계 `docs/superpowers/specs/2026-10-24-augment-card-design.md`, 계획 `docs/superpowers/plans/2026-10-24-augment-card.md`.
- 2026-10-24: 증강·챔피언 탭(`/augments`, `/champions`) — 위쪽 메뉴 탭, 증강은 프리즘·골드·실버 묶음(접힘), 이름 검색과 가나다순/글 많은 순, 칸을 누르면 그 줄 아래로 글 목록(5개씩 더 보기)이 펼쳐지고 `?open=`에 남는다. 챔피언에는 자주 함께 쓰는 증강. API `GET /api/tag-counts`, `GET /api/champions/{id}/top-augments`, `GET /api/posts?size=`. 설계 `docs/superpowers/specs/2026-10-24-tag-browse-design.md`, 계획 `docs/superpowers/plans/2026-10-24-tag-browse.md`.

**다음 단계**
1. 배포: AWS Lightsail(약 2GB, 월 2만원 이내) + Docker Compose, 이미지 저장소 S3 구현(`image/ImageStorage`), 세션을 DB에 저장(지금은 메모리라 서버 재시작 시 모두 로그아웃), HTTPS, DB 백업, AWS 예산 알림. 배포 주소가 정해지면 디스코드 Redirects에 운영 주소를 추가하고, Vite 프록시 대신 리버스 프록시가 원래 Host를 넘기도록 한다(돌아올 주소가 Host로 만들어진다).
2. 디자인 다듬기(지금은 틀만 잡은 상태).

2026-10-24에 main을 GitHub에 처음 푸시했고, 2026-10-25에 증강 카드와 새 증강 자료 보완(240개 모두 설명)까지 푸시했다. 이후 푸시는 사용자가 요청할 때만 한다.

**v1 검토에서 미뤄둔 작은 문제**
- `/posts/abc`, `/posts/abc/edit` 같은 잘못된 주소가 빈 화면으로 나온다("없는 글이에요"가 맞다).
- 디스코드 로그인을 취소하면 `/login?error`로 가서 "페이지를 찾을 수 없어요"가 뜬다. `failureUrl` 지정과 안내 필요.
- 제목 길이를 공백 제거 전에 검사해서, 끝에 공백이 붙은 100자 제목이 거절된다.
- 다른 사람이 누른 추천 수가 글을 다시 불러와도 추천 버튼에 반영되지 않는다(`LikeButton`이 처음 값만 씀).
- CSRF 실패가 "권한이 없어요"로만 보인다.
- 이미지 업로드에서 파일 칸이 없거나 multipart가 아닌 요청이 400 대신 500으로 기록된다. 지원하지 않는 메서드는 405 대신 404.
- `page=0` 요청이 빈 목록 대신 400을 돌려준다(설계 문서는 빈 목록).
- 본문 검사가 서식 이름만 확인하고 ProseMirror 구조나 추가 속성은 확인하지 않는다. 본문 글자 수에 문단 줄바꿈이 포함된다.

**증강·챔피언 탭 검토에서 미뤄둔 작은 문제**
- 펼침 영역이 다른 줄로 옮겨질 때(창 크기 변경 등) 다시 그려져서 정렬이 최신순으로 돌아간다. 정렬 상태를 페이지로 올리면 해결된다.
- 「더 보기 (n개 남음)」의 n은 첫 페이지의 전체 수를 기준이라, 그 사이 글이 지워지면 숫자가 어긋날 수 있다. 0 아래로 내려가지 않게 막거나 마지막 페이지 값을 쓰면 된다.
- 챔피언 목록이 비어 있을 때(첫 동기화 전) 검색어가 없어도 "검색 결과가 없어요"가 보인다.
- `TagGrid`의 `<li class="contents">`는 오래된 Safari에서 목록 의미가 사라질 수 있다.
- 서버를 켠 직후 게임 데이터 동기화가 실패하면 모든 증강이 실버로 보이고 6시간 뒤에야 다시 시도한다(V7 재동기화가 성공해야 등급이 채워진다).
- 새 파일은 LF, 예전 파일은 CRLF로 섞여 있다(저장소 안은 모두 LF). `.gitattributes`로 통일할 수 있다.

**프로필 검토에서 미뤄둔 작은 문제**
**증강 카드에서 미뤄둔 작은 문제**
- 복사 버튼은 보안 컨텍스트(https 또는 localhost)에서만 동작한다. 그 밖에서는 "복사하지 못했어요"가 뜬다(드래그 복사는 된다).
- 스킬 증강의 `{{SpellName}}`은 챔피언마다 달라서 `[스킬]`/`[Ability]`로 보인다.
- 못 채운 자리표시자는 카드에 `?`로 보인다(op.gg도 같음). 스탯 번호 8·9·34의 뜻과 `BuffCounter…`, `AbilityResource…` 종류를 알아내면 줄일 수 있다.
- 문자열 표에 글이 전혀 없는 증강은 카드 자리에 "아직 설명이 없어요"가 보인다(16.21 기준 0개). 게임 중 누적치(`@f2@`)는 "이름표: 값" 줄만 지우고, 문장 안에 섞여 있으면 남겨서 `?`로 보인다.

- 같은 이미지를 두 탭에서 동시에 "프로필 사진으로 저장"과 "본문에 넣기"를 하면 둘 다 통과할 수 있다(확인 후 저장 사이 경쟁). 그 글을 지우면 프로필 사진도 사라진다. 이미지 행 잠금이나 글 삭제 시 프로필 사진은 연결만 끊기로 막을 수 있다.
- `UserService.saveCheckingNickname`이 모든 DB 제약 위반을 "이미 쓰고 있는 닉네임이에요"로 바꾼다. 저장 직전에 고른 사진이 정리 작업으로 지워지면 엉뚱한 문구가 나온다.
- `ScrapButton`도 `LikeButton`처럼 처음 값만 써서, 글을 다시 불러와도 바뀐 스크랩 상태가 반영되지 않는다.
- 프로필 탭에서 범위를 넘는 페이지(`?page=9`)는 글이 있어도 "아직 쓴 글이 없어요"로 보인다(메인 목록도 같음).
- 가입일은 브라우저 시간대, 잔디는 한국 시간이라 해외에서는 하루 차이가 날 수 있다.
- `PUT /api/me/profile`은 닉네임 없이도 호출되는데 `POST /api/images`는 닉네임이 필요하다(화면에서는 닉네임 화면으로 먼저 보내므로 문제 없음).
- 닉네임 중복 테스트가 사진 id를 함께 보내지 않아, 409 때 사진이 그대로인지는 서버 테스트로 증명되지 않았다(코드는 저장 전에 실패해서 실제로는 안전).
