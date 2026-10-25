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

- DB 변경은 `backend/src/main/resources/db/migration`에 새 Flyway 파일(`V10__...`부터)로만 한다. Hibernate는 `ddl-auto: validate`.
- 본문 허용 서식은 서버 `post/PostContentValidator.java`와 화면 `editor/extensions.ts`가 같은 목록을 지킨다. 하나를 바꾸면 다른 쪽과 `editor/extensions.test.ts`도 바꾼다.
- 오류 응답은 `{ code, message, fieldErrors }`, 메시지는 화면에 그대로 보여줄 한국어 문장. 코드는 `common/ErrorCode.java`.
- 모든 쓰기 API는 서버에서 권한을 검사한다(`auth/CurrentUser.requireWithNickname` + 글쓴이/관리자 확인).
- 추천·댓글 수는 글 행을 `for update`로 잠근 뒤 실제 개수로 다시 센다. 동시 요청에서 숫자가 어긋나지 않게 하기 위함.
- 비밀 값은 `backend/.env`(git 제외)에만 둔다. 디스코드 키를 빈 값으로 두면 서버가 시작되지 않으므로, 값이 없으면 줄을 `#`으로 막아둔다.

## 기술 주의사항

- Spring Boot 4: JSON은 **Jackson 3**(`tools.jackson.*`, `asString()`, `stringValue()`), 어노테이션은 그대로 `com.fasterxml.jackson.annotation`. `RestClient.Builder` 빈은 자동 등록되지 않는다(`RestClient.builder()` 사용). MockMvc 자동 설정은 `org.springframework.boot.webmvc.test.autoconfigure`.
- 테스트 설정 `src/test/resources/application-test.yml`은 개발자의 `backend/.env` 값이 섞이지 않게 개발 로그인을 끈다.
- 프론트엔드 테스트 렌더(`test/render.tsx`)는 실제 앱처럼 StrictMode로 감싼다. StrictMode에서만 드러나는 버그(효과 두 번 실행, 편집기 재생성)가 실제로 있었다.
- 게임 데이터는 서버가 6시간마다(실패하면 30분 뒤) Data Dragon `versions.json`과 CommunityDragon `latest/content-metadata.json`의 버전을 확인하고, 둘 중 하나라도 바뀌었을 때만 챔피언(`ko_KR/champion.json`)과 증강(CommunityDragon `kiwi.bin.json` + 문자열 표)을 다시 받는다. CommunityDragon은 라이엇보다 늦게 갱신되거나 패치 중간에 자료를 고칠 때가 있어서다(V9 `current_cdragon_version`). 그 버전 파일을 못 읽으면 경고만 남기고 패치 번호만 본다. 패치 표기는 `16.21.1` → `26.21`. 증강 등급은 `kiwi.bin.json`의 `rarity`(없음·0 실버, 1 골드, 2 프리즘)에서 오고, `Enabled: false`인 증강은 받지 않는다. 증강 데이터 컬럼을 더했을 때는 마이그레이션에서 `game_data_state.current_ddragon_version`을 비워 시작 시 전체 재동기화를 유도한다(V7 참고).
- 증강 설명은 동기화 때 언어별(영어·한국어)로 문자열 표를 받아 `gamedata/text/`에서 자리표시자(`@TotalShield@` 등)를 수치 표로 계산해 완성된 글로 `augment_texts`에 저장한다(V8). 언어를 더하려면 `AugmentLocale`에 항목을 추가한다. 못 채운 자리표시자는 DB에 이름 그대로 남고(동기화 로그에 수가 찍힌다) 화면과 복사 글에서는 `?`로 보인다(`lib/augmentDescription.ts`). 계산식·수치 이름도 이름을 모르면 `{해시}`(소문자 이름의 FNV-1a 32비트, 8자리 16진수)로 들어 있어서 `SpellValues.hashedName`으로 한 번 더 찾는다(문자열 표의 XXH3 해시와 다른 방식). 스탯 번호는 0 주문력, 1 방어력, 2 공격력, 6 마법 저항력, 7 이동 속도, 9 치명타 피해, 11 스킬 가속, 12 최대 체력, 34 체력 회복 및 보호막 효과까지 확인했다. 남은 원인은 게임 중 누적치·중첩, 자료에 없는 퀘스트 목표치, 모르는 계산 종류, 스탯 번호 4·8 등(16.21 기준 계산 못 한 칸 15곳). 색 표식 허용 목록은 서버 `AugmentDescriptionBuilder.COLOR_TAGS`와 화면 `lib/augmentDescription.ts`가 같아야 한다. CommunityDragon 문자열 표는 이름을 모르는 키를 `{해시}`(소문자 키의 XXH3-64 하위 38비트, 10자리 16진수. 커뮤니티드래곤 `data/hashes/lol/hashes.rst.xxh3.txt`가 원래 키 이름 목록)로 내보낸다. 새 패치 증강(16.21 기준 41개, "장갑 충격"·"보석 팔찌" 등)의 이름·툴팁이 그렇게 들어 있어서 `StringTableKeys.hashedKey`로 같은 해시를 만들어 찾는다(16.21 기준 240개 모두 설명이 있다). 증강 아이콘은 작은 것(`_small`)이 흰 그림이고 큰 것(`_large`)에 등급 색이 들어 있어서, API `iconUrl`은 큰 아이콘을 준다. 새 증강은 큰 아이콘 경로가 `{해시}`(경로의 xxh64)로만 있고 CommunityDragon에 파일도 없어서 작은 아이콘을 주고 `iconTinted: true`로 알린다. 화면 `components/augment/AugmentIcon.tsx`가 CSS 마스크로 등급 색을 입힌다(CommunityDragon 그림은 CORS 허용). 그래도 글이 없는 증강은 클라이언트 증강 목록 `plugins/rcp-be-lol-game-data/global/{ko_kr|default}/v1/cherry-augments.json`(이름은 옛것이지만 칼바람 증강도 들어 있음)에서 이름만 보충하고, 카드에는 "아직 설명이 없어요"가 보인다. 이 목록은 보조 자료라 못 받아도 동기화는 계속된다. 실제 증강 풀은 같은 폴더의 `augment-lists.json`의 `KIWI` 목록(249개 = 활성 240 + 꺼진 9)과 비교해 확인할 수 있다.
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
- 2026-10-25: 미뤄둔 작은 문제 정리 — 잘못된 숫자 주소(`/posts/abc`)는 "없는 글이에요"(`lib/routeId.ts`), 디스코드 로그인 실패·취소는 `/auth/done?error`로 와서 안내 후 원래 화면으로, CSRF 실패는 `CSRF_INVALID`("새로고침한 뒤 다시"), 지원하지 않는 메서드 405, 파일 칸 없는/multipart 아닌 업로드 400, 제목 길이는 공백 제거 뒤 검사, 추천·스크랩 버튼이 다시 불러온 값을 따라감, 펼침 영역의 글 정렬은 주소 `?order=likes`에 남음(다른 칸을 열면 지워짐), 남은 글 수는 마지막 페이지 기준, 챔피언 자료가 없으면 "아직 챔피언 정보를 받아오지 못했어요", 마지막 페이지를 넘으면 "이 페이지는 비어 있어요"와 「첫 페이지로」, 가입일은 한국 시간, 사진이 저장 직전 지워지면 "이미지를 찾을 수 없어요", 게임 데이터 동기화가 실패하면 30분 뒤 재시도(`SyncTimer`), 줄바꿈은 루트 `.gitattributes`로 작업 폴더까지 LF.
- 2026-10-24: 증강·챔피언 탭(`/augments`, `/champions`) — 위쪽 메뉴 탭, 증강은 프리즘·골드·실버 묶음(접힘), 이름 검색과 가나다순/글 많은 순, 칸을 누르면 그 줄 아래로 글 목록(5개씩 더 보기)이 펼쳐지고 `?open=`에 남는다. 챔피언에는 자주 함께 쓰는 증강. API `GET /api/tag-counts`, `GET /api/champions/{id}/top-augments`, `GET /api/posts?size=`. 설계 `docs/superpowers/specs/2026-10-24-tag-browse-design.md`, 계획 `docs/superpowers/plans/2026-10-24-tag-browse.md`.

**다음 단계**
1. 배포: AWS Lightsail(약 2GB, 월 2만원 이내) + Docker Compose, 이미지 저장소 S3 구현(`image/ImageStorage`), 세션을 DB에 저장(지금은 메모리라 서버 재시작 시 모두 로그아웃), HTTPS, DB 백업, AWS 예산 알림. 배포 주소가 정해지면 디스코드 Redirects에 운영 주소를 추가하고, Vite 프록시 대신 리버스 프록시가 원래 Host를 넘기도록 한다(돌아올 주소가 Host로 만들어진다).
2. 디자인 다듬기(지금은 틀만 잡은 상태).

2026-10-24에 main을 GitHub에 처음 푸시했고, 2026-10-25에 증강 카드와 새 증강 자료 보완(240개 모두 설명), 미뤄둔 작은 문제 정리까지 푸시했다. 이후 푸시는 사용자가 요청할 때만 한다.

**v1 검토에서 미뤄둔 작은 문제** (나머지는 2026-10-25에 고침)
- 본문 검사가 서식 이름만 확인하고 ProseMirror 구조나 추가 속성은 확인하지 않는다. 본문 글자 수에 문단 줄바꿈이 포함된다.

**증강 카드에서 미뤄둔 작은 문제**
- 복사 버튼은 보안 컨텍스트(https 또는 localhost)에서만 동작한다. 그 밖에서는 "복사하지 못했어요"가 뜬다(드래그 복사는 된다).
- 스킬 증강의 `{{SpellName}}`은 대부분 챔피언마다 칸이 달라서(대응표가 자료에 없음) `[스킬]`/`[Ability]`로 보인다. 증강 이름 끝(`GoH_PentakillAug_W`)이나 수치 이름 앞(`WAbilityHaste`)에 칸이 적힌 7개(빵과 버터·잼·치즈, 펜타킬 4종)만 `[Q]`/`[W]`/`[E]`/`[R]`로 보인다(`text/AbilitySlot`).
- 못 채운 자리표시자는 카드에 `?`로 보인다(op.gg도 같음). 스탯 번호 4·8의 뜻과 `BuffCounter…`(게임 중 중첩), 해시 이름 계산 종류를 알아내면 더 줄일 수 있다.
- 문자열 표에 글이 전혀 없는 증강은 카드 자리에 "아직 설명이 없어요"가 보인다(16.21 기준 0개). 게임 중 누적치(`@f2@`)는 "이름표: 값" 줄만 지우고, 문장 안에 섞여 있으면 남겨서 `?`로 보인다.

**프로필 검토에서 미뤄둔 작은 문제** (나머지는 2026-10-25에 고침)
- 같은 이미지를 두 탭에서 동시에 "프로필 사진으로 저장"과 "본문에 넣기"를 하면 둘 다 통과할 수 있다(확인 후 저장 사이 경쟁). 그 글을 지우면 프로필 사진도 사라진다. 이미지 행 잠금이나 글 삭제 시 프로필 사진은 연결만 끊기로 막을 수 있다.
- `PUT /api/me/profile`은 닉네임 없이도 호출되는데 `POST /api/images`는 닉네임이 필요하다(화면에서는 닉네임 화면으로 먼저 보내므로 문제 없음).
