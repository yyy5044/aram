# CLAUDE.md

ARAM(증강 칼바람 커뮤니티): 리그 오브 레전드 증강 칼바람 나락 모드의 증강 정보를 친구들(약 10명)과 공유하는 취미 커뮤니티 사이트.

- 설계: `docs/superpowers/specs/2026-10-24-aram-community-v1-design.md` (기능·권한·데이터·API의 기준)
- 구현 계획: `docs/superpowers/plans/2026-10-24-aram-community-v1.md` (v1 14개 작업, 모두 완료)
- 사용자용 안내: `README.md` (디스코드 앱 등록, `.env`, 실행 방법)

## 일하는 방식

- 사용자는 **바이브코딩**으로 진행한다. 코드를 직접 읽거나 리뷰하지 않는다. 확인은 Claude가 직접 하고(테스트 실행, 브라우저로 동작 확인), 결과는 화면 기준의 쉬운 한국어로 보고한다.
- 사용자에게는 기능·화면 관점의 질문만 한다. 코드 구조 같은 기술 결정은 Claude가 정하고 이유를 짧게 알린다.
- 새 기능은 superpowers 흐름을 따른다: brainstorming → 설계 문서 → writing-plans → 실행. 테스트를 먼저 쓴다.
- 화면 문구는 모두 한국어 해요체.
- 기능 하나가 끝날 때마다 커밋한다. 원격(GitHub `yyy5044/aram`, **공개 저장소**)에 푸시는 사용자가 요청할 때만 한다.
- 가지 흐름: 기능 가지에서 작업하고 끝나면 **`dev`에 합친다**(`main`에 바로 합치지 않는다). "dev에 올려줘"는 `dev` 푸시 = GitHub에서 테스트만. "업데이트해줘"는 `dev`를 `main`에 합쳐 푸시 = 테스트 통과 시 **운영 사이트에 자동 배포**(`docs/deploy.md`).
- 커밋 이메일은 저장소 로컬 설정의 GitHub noreply 주소(`48915312+yyy5044@users.noreply.github.com`)를 쓴다. 바꾸지 않는다. 실제 이메일이 공개 기록에 남지 않게 하기 위함.

## 구조

| 폴더 | 내용 |
|---|---|
| `backend/` | Spring Boot 4.1, Java 21, JPA(Hibernate 7), Flyway, PostgreSQL 18, Spring Security OAuth2(디스코드) |
| `frontend/` | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Tiptap 3 |
| `deploy/` | 운영 Compose(`compose.prod.yaml`), Caddy 설정·업데이트 중 안내 페이지, 화면 이미지(`web.Dockerfile`), 배포·되돌리기(`deploy.sh`), 서버 준비(`server-setup.sh`) |
| `.github/workflows/ci.yml` | 푸시마다 백엔드·화면 테스트, `main` 푸시면 이미지(ghcr.io) → 서버 반영 |

백엔드는 기능별 패키지(`auth`, `user`, `gamedata`, `post`, `image`, `video`, `comment`, `like`, `scrap`, `profile`, `common`)로 나뉜다. 프론트엔드는 `api/`, `components/`(공통 디자인 부품은 `ui/`, 프로필 부품은 `profile/`, 증강·챔피언 탭 부품은 `tags/`, 아이템 설명 상자는 `item/`), `pages/`(증강·챔피언·아이템 탭은 `AugmentsPage`·`ChampionsPage`·`ItemsPage`), `editor/`(본문 편집기·영상 칸·`/` 메뉴·`@` 메뉴와 본문 태그 박스), `lib/`, `test/`.

## 실행과 테스트

```bash
cd backend && ./gradlew bootRun        # PostgreSQL은 compose.yaml로 자동으로 뜬다 (Docker 필요)
cd frontend && npm run dev             # http://localhost:5173, /api·/oauth2·/login/oauth2는 8080으로 프록시
cd backend && ./gradlew test           # Testcontainers로 실제 PostgreSQL 사용
cd frontend && npm test && npm run build && npm run lint
```

- Node는 `C:\Program Files\nodejs`에 있다. Git Bash에서는 `export PATH="/c/Program Files/nodejs:$PATH"`가 필요할 수 있다.
- 영상 변환 테스트와 로컬 영상 올리기에는 **ffmpeg·ffprobe**가 PATH에 있어야 한다. 이 컴퓨터에는 winget(`Gyan.FFmpeg`)으로 깔려 있고, 설치 전에 열린 셸에서는 `export PATH="/c/Users/오양호/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin:$PATH"`가 필요하다. CI는 apt로 설치한다.
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
- 증강 설명은 동기화 때 언어별(영어·한국어)로 문자열 표를 받아 `gamedata/text/`에서 자리표시자(`@TotalShield@` 등)를 수치 표로 계산해 완성된 글로 `augment_texts`에 저장한다(V8). 언어를 더하려면 `AugmentLocale`에 항목을 추가한다. 못 채운 자리표시자는 DB에 이름 그대로 남고(동기화 로그에 수가 찍힌다) 화면과 복사 글에서는 `?`로 보인다(`lib/augmentDescription.ts`). 계산식·수치 이름도 이름을 모르면 `{해시}`(소문자 이름의 FNV-1a 32비트, 8자리 16진수)로 들어 있어서 `SpellValues.hashedName`으로 한 번 더 찾는다(문자열 표의 XXH3 해시와 다른 방식). 스탯 번호는 0 주문력, 1 방어력, 2 공격력, 6 마법 저항력, 7 이동 속도, 9 치명타 피해, 11 스킬 가속, 12 최대 체력, 34 체력 회복 및 보호막 효과까지 확인했다. 남은 원인은 게임 중 누적치·중첩, 자료에 없는 퀘스트 목표치, 모르는 계산 종류, 스탯 번호 4·8 등(16.21 기준 계산 못 한 칸 15곳). 색 표식 허용 목록은 서버 `AugmentDescriptionBuilder.COLOR_TAGS`와 화면 `lib/augmentDescription.ts`가 같아야 한다. CommunityDragon 문자열 표는 이름을 모르는 키를 `{해시}`(소문자 키의 XXH3-64 하위 38비트, 10자리 16진수. 커뮤니티드래곤 `data/hashes/lol/hashes.rst.xxh3.txt`가 원래 키 이름 목록)로 내보낸다. 새 패치 증강(16.21 기준 41개, "장갑 충격"·"보석 팔찌" 등)의 이름·툴팁이 그렇게 들어 있어서 `StringTableKeys.hashedKey`로 같은 해시를 만들어 찾는다(16.21 기준 240개 모두 설명이 있다). 증강 아이콘은 작은 것(`_small`)이 흰 그림이고 큰 것(`_large`)에 등급 색이 들어 있어서, API `iconUrl`은 큰 아이콘을 준다. 새 증강은 큰 아이콘 경로가 `{해시}`(경로의 xxh64)로만 있고 CommunityDragon에 파일도 없어서 작은 아이콘을 주고 `iconTinted: true`로 알린다. 화면 `components/augment/AugmentIcon.tsx`가 CSS 마스크로 등급 색을 입힌다(CommunityDragon 그림은 CORS 허용). 그래도 글이 없는 증강은 클라이언트 증강 목록 `plugins/rcp-be-lol-game-data/global/{ko_kr|default}/v1/cherry-augments.json`(이름은 옛것이지만 칼바람 증강도 들어 있음)에서 이름만 보충하고, 카드에는 "아직 설명이 없어요"가 보인다. 이 목록은 보조 자료라 못 받아도 동기화는 계속된다. 실제 증강 풀은 같은 폴더의 `augment-lists.json`의 `KIWI` 목록(249개 = 활성 240 + 꺼진 9)과 비교해 확인할 수 있다. 그중 `GoH_PentakillAug_Generic`은 게임 자료에 이름이 없는 펜타킬 자리표시라 이름 칸에 키(`GoH_PentakillAug_Generic_BlankName`)가 그대로 들어 있어서, 이름이 자기 키와 같으면 이름 없는 증강으로 보고 받지 않는다(16.21 기준 활성 239개).
- 아이템(설계 `docs/superpowers/specs/2026-10-26-item-tab-design.md`)은 같은 동기화 때 함께 받는다(`GameDataSyncService`). 증강 칼바람 상점 목록은 CommunityDragon `game/data/maps/shipping/map12/map12.bin.json`의 `Maps/Shipping/Map12/Modes/KIWI` `itemLists`가 가리키는 목록들의 합집합이고, 아이템 자료는 `game/items.cdtb.bin.json`을 스트리밍으로 읽어 `ItemData`만 쓴다(`gamedata/item/ItemCatalog`). 살 수 있는 것은 `mItemDataAvailability.mInStore == true`만이고 챔피언 전용(`mRequiredChampion`)·총가격 0 이하는 뺀다(16.21 기준 192개). 총가격은 조합 가격 + 재료 총가격. 단계는 `epicness`(최상위 값만. `mItemDataClient.epicness`는 상점 묶음과 달라 쓰지 않는다)와 `mCategories`로 정한다: 8·7은 증강 모드 전용, `Boots`는 신발, `Consumable`·epicness 0·1·3은 시작, 5 전설, 4 서사, 나머지 기본(16.21 기준 전설 108·서사 44·기본 16·시작 11·신발 8·증강 모드 5). 수치는 증강 칼바람 값이 먼저다: `DataValuesModeOverride`의 `Kiwi` > `ARAM` > 기본(`ItemValues`). 옛 방식 수치 배열 `mEffectAmount[i]`는 `@Effect{i+1}Amount@`로 넣는다(칸이 배열이면 첫 값). 설명은 `generatedtip_item_{id}_description` 틀의 `<section>`을 이어 붙이고(빈 section·`<flavorText>`·능력치 아이콘 `%i:…%`는 버림) 증강 설명 파이프라인(`AugmentDescriptionBuilder`)으로 채운다(`item/ItemDescriptionBuilder`, 못 찾은 `{{참조}}`는 지우고 수만 센다. 목록 항목 `<li>`는 줄바꿈으로 바꾸고 section 맨 앞의 것은 빈 줄이 안 생기게 지운다). 저장은 `items`·`item_texts`·`post_items`(V12). 첫 시작 때 아이템이 하나도 없으면(`items.count() == 0`) 버전이 그대로여도 전체 재동기화를 한다. V12는 `current_ddragon_version`을 비우지 않는다(비우면 챔피언 그림·아이템 아이콘 주소가 그동안 null이 된다). 아이템 단계만 실패하면 옛 아이템을 그대로 두고 동기화는 FAILED로 끝나 30분 뒤 다시 한다. 상점에서 빠진 아이템은 지우지 않고 `active=false`(글에 붙어 있던 태그 보존). 못 채운 자리표시자는 아직 남아 있다(16.21 기준 두 언어 합쳐 64곳, 27개 아이템. 증강처럼 화면에서 `?`). 동기화 때 INFO 한 줄 `Items with unresolved placeholders: 아이템번호(수), …`로 남는다. 아이콘은 Data Dragon `cdn/{버전}/img/item/{id}.png`. 아이템 설명에 쓰이는 색 표식 중 `AugmentDescriptionBuilder.COLOR_TAGS`에 없는 것(`font`·`li`·`rarityLegendary`·`ornnBonus`·`keywordStealth` 등)은 서버가 지운다.
- 로그인 정보는 Spring Session JDBC로 DB(`spring_session`, V10)에 있어서 서버를 다시 켜도 유지된다. 쿠키 이름은 `SESSION`. 테스트에서 로그인을 이어 갈 때는 `MockHttpSession`이 아니라 응답의 `SESSION` 쿠키를 넘긴다. 쿠키의 `Max-Age`·`HttpOnly`·`Secure`는 실제 서버(내장 Tomcat)에서만 적용돼서 MockMvc로는 확인되지 않는다(`SessionPersistenceTest`, `ProdProfileTest`는 실제 포트로 띄운다).
- 운영 설정은 `application-prod.yml`(이미지가 `SPRING_PROFILES_ACTIVE=prod`로 켠다): DB는 Compose의 `db`, `forward-headers-strategy: native`(Caddy의 `X-Forwarded-Proto`로 디스코드 돌아올 주소가 https), 세션 쿠키 `Secure`, 사진은 `/data/images` 볼륨. 개발 로그인은 `@Profile("!prod")`라 운영에서는 설정과 상관없이 없다(환경 변수가 설정 파일보다 우선해서 파일로는 못 막는다).
- Docker 이미지는 저장소 루트를 빌드 위치로 만든다: `docker build -f backend/Dockerfile .`, `docker build -f deploy/web.Dockerfile .`. 실행 jar 이름은 `app.jar`로 고정. 백엔드가 꺼져도 Caddy가 화면 파일은 주므로, 업데이트 중에는 화면이 열리고 API만 503 `MAINTENANCE`("잠시 업데이트 중이에요…")를 준다(목록·글·프로필이 이 문장을 그대로 띄운다). Caddy의 `header`는 `try_files`보다 먼저 정해져서 `/assets/*` 밖은 블록 전체에 `no-cache`를 붙인다.
- 서버 `deploy.sh`는 `.env`의 `IMAGE_TAG`만 바꿔 교체하고, 백엔드 `127.0.0.1:8080/actuator/health`가 UP이고 Caddy가 `Host: $DOMAIN`의 http 요청에 308을 줄 때까지 180초 기다린다. 교체(`up -d`)가 실패하거나 시간 안에 정상이 안 되면 직전 태그로 되돌리고, 직전 태그가 없으면 줄을 지운다. Caddyfile 오타는 `web` 이미지를 만들 때(`caddy validate`) 막힌다. 백엔드 이미지 사용자는 UID 10001로 고정(사진 볼륨 소유자).
- 영상 클립(설계 `docs/superpowers/specs/2026-10-26-video-clip-design.md`): 글쓰기에서 `/` 메뉴(영상·사진, `@tiptap/suggestion`)나 도구 줄 **영상** 버튼으로 점선 칸을 넣고, 끌어다 놓거나 눌러서 고른 영상을 `POST /api/videos`로 올린다(원본 200MB, `app.videos.max-bytes`). 서버 `video/VideoQueue`가 한 번에 하나씩 `FfmpegVideoTranscoder`로 **앞 30초·1280×720 안·24fps·무음·H.264 MP4 + 첫 장면 JPEG**로 바꿔 이미지 저장소 `videos/{id}.mp4|.jpg`에 두고, 원본(`app.videos.tmp-dir`, 운영 `/data/images/tmp`)은 지운다. 화면은 `GET /api/videos/{id}/status`를 1초마다 물어 "올리는 중 n%" → "변환 중 n%"를 보여준다. 본문 글자 없이 제목과 클립(또는 사진)만 있는 글도 저장된다(글자·사진·영상이 모두 없을 때만 "본문을 입력해주세요"). 본문 노드 `video`(`src=/api/videos/{uuid}`, 한 글에 3칸)는 서버 `PostContentValidator`·화면 `editor/extensions.ts`가 함께 지키고, 글 저장 때 `DbVideoPostLinker`가 내 것·READY·다른 글에 안 쓰인 영상만 연결한다. 글에서는 `VideoPlayer`가 소리 없이 반복하고 화면에 보일 때만 재생하며, 누르면 멈춘다. `GET /api/videos/{id}`는 `FileSystemResource`라 Range(206)를 지원한다(iPhone 재생에 필요). 편집기 전용인 사진 칸 노드 `uploadBox`와 영상 노드의 `uploadId`·`truncated` 속성은 저장 전 `editor/cleanContent.ts`가 빼고, 변환 중이면 등록 버튼이 잠긴다. 변환이 끝난 클립은 ✕ 버튼으로만 지운다(`VideoNode`의 `protectClips` 플러그인이 클립 수가 줄어드는 변경을 막고, ✕ 버튼만 `clipGuard.ts`의 메타를 붙인다). 올리기 상태는 칸(NodeView) 밖 `editor/uploadJobs.ts`에 있어서 칸을 옮겨도 끊기지 않고, 칸이 본문에서 사라지면 멈춘다. 쓰이지 않은 영상은 하루 뒤 `VideoCleanupJob`이 지우고, 서버 재시작 때는 이번 시작 전에 멈춘 변환만 FAILED로 바꾸고 그 전 임시 파일만 지운다(켜지는 사이 들어온 올리기는 건드리지 않음). 한도: 한 사람이 변환을 기다리는 영상 3개(`VIDEO_BUSY`), 원본을 받은 뒤 디스크 여유 5GB 미만이면 거절(`VIDEO_NO_SPACE`, `app.videos.min-free-bytes`; DB와 같은 디스크라서), 4K(3840×2160 화소) 초과 거절. ffmpeg·ffprobe의 오류 출력은 반드시 파일로 받는다(파이프로 두면 망가진 영상의 오류 출력에 막혀 줄 전체가 3분씩 멈췄다). 화면의 상태 조회는 네트워크 오류·5xx(업데이트 중 503)를 5번까지 늘려 가며 다시 묻고 10분이 지나면 포기한다. 형식은 mp4·mov·webm·mkv만(서버가 ftyp/EBML 머리로 거름), 글쓰기 화면은 편집기 밖에 놓인 파일을 브라우저가 열지 못하게 막는다. 운영 백엔드 이미지에는 apt ffmpeg가 들어 있고(이미지 약 1.2GB), 메모리 한도 1500m·`MaxRAMPercentage=50`.
- 서비스 이름은 **ARAM**. 아이콘은 포로 그림(사용자가 이미지 생성으로 고름)으로 `frontend/public/`의 `favicon.ico`(16·32·48), `apple-touch-icon.png`(180, 모서리 채움), `logo.png`(128, 둥근 모서리 투명, 머리말 로고·업데이트 중 안내 페이지)에 있다. 모든 화면 맨 아래 `components/SiteFooter.tsx`에 사이트 이름·문의(`CONTACT_EMAIL`, 사용자가 정한 주소)·GitHub 링크, 게임 자료 출처(Data Dragon·CommunityDragon)와 지금 패치(`/api/patches`), ©, 라이엇 팬 콘텐츠 정책의 안내 문구(영어 원문 "ARAM isn't endorsed by Riot Games…". 번역이 AI 말투 같다는 사용자 의견으로 원문을 씀)가 있다. 게임 그림을 쓰는 공개 사이트라 라이엇 문구는 지우지 않는다.
- 태그 검색(`lib/tagSearch.ts`의 `matchesName`·`matchIndex`)은 띄어쓰기·대소문자를 무시하고 초성(`ㄱㅅㅅ`)과 섞어 쓰기(`거ㅅ상`)도 찾는다. 태그 칸(`TagPicker`)과 `@` 메뉴가 같이 쓴다.
- 본문 태그 박스(설계 `docs/superpowers/specs/2026-10-26-tag-mentions-design.md`): 글쓰기에서 줄 맨 앞이나 띄어쓰기 뒤에 `@`를 치면 챔피언·사용 중 증강·아이템 세 종류가 섞인 후보 8개(`lib/mentionCandidates.ts`, 이름이 검색어로 시작하는 것 먼저)가 뜨고(`editor/MentionCommand.ts`·`MentionMenu.tsx`, `/` 메뉴와 다른 플러그인 키), 고르면 인라인 원자 노드 `tagMention`(`kind` champion·augment·item(아이템 `id`는 숫자 번호의 문자열), `id` `^[A-Za-z0-9_]{1,40}$`, `label` 1~50자)과 띄어쓰기를 넣는다. 서버 `PostContentValidator`가 같은 규칙과 한 글 30개를 지키고 `label`을 본문 글자에 넣으며, `PostService`가 저장 전에 챔피언·증강·아이템이 실제로 있는지 본다(옛 증강·옛 아이템도 통과). 고른 것은 `PostEditor`의 `onMention`으로 `WritePage`가 태그 칸에 더한다(한도면 "태그 칸이 가득 차서 본문에만 넣었어요", 박스를 지워도 태그는 남김). 박스 모양은 `components/TagMentionChip.tsx`(테두리·바탕 없이 본문 글자 크기(em)를 따르는 아이콘+중간 굵기 색 글자. 챔피언은 청록, 증강은 등급 색 `text-ink-2`·`text-gold-deep`·`text-prismatic-ink`에 점선 밑줄. 글자 크기가 본문과 달라 조잡해 보인다는 사용자 의견으로 바꿈. 목록에 없으면 이름만), 증강 박스는 `components/HoverTooltip.tsx`가 마우스 0.2초·터치 누르기·키보드 초점으로 선택 언어의 작은 설명 상자(`AugmentTooltip.tsx`, 가로 300px, 아이콘·이름·등급·설명, 복사 버튼 없음. 발더스 게이트 툴팁처럼 하자는 사용자 결정)를 띄운다(`@floating-ui/dom`으로 화면 안에 맞춤). 큰 게임 카드는 증강 탭에만 쓴다. 아이템 박스는 같은 방식으로 `components/HoverTooltip.tsx`(마우스·터치·초점 띄우기를 증강과 나눠 쓰는 공통 부품)가 `components/item/ItemTooltip.tsx`(아이콘·이름·"3000 골드 · 전설"·설명·재료·상위 아이템)를 띄운다. 박스를 눌러도 다른 화면으로 가지 않는다(사용자 결정).
- 화면 언어 설정(`lib/language.ts`, 머리말 드롭다운, localStorage `lang`)은 지금 증강 카드의 번역 언어만 바꾼다. 화면 문구 번역(i18n)은 아직 없다.
- 디자인(칼바람 나락의 밤, 설계 `docs/superpowers/specs/2026-10-25-design-polish-design.md`): 색·모서리·글꼴은 `index.css`의 `@theme` 이름(`bg-night`, `text-gold-deep`, `rounded-touch` …)만 쓴다. 버튼은 `components/ui/button.ts`의 `buttonClass(종류, 높이)`. 크기는 글자 28/20/17/15/13, 버튼 56/48/44/40/36, 간격 4의 배수, 모서리는 담는 것 0·작은 표시 4·누르는 것 8·얼굴은 원. Tailwind 4는 같은 속성의 클래스 두 개가 한 요소에 붙으면 어느 쪽이 이길지 순서로 정해지지 않으니, `buttonClass(...)` 뒤에 높이·여백·글자색·display를 덧붙이지 말고 종류를 더하거나 감싸는 요소를 쓴다(꼭 덮어써야 하면 `!`). 다크 모드는 없다.

## 환경 주의사항 (이 컴퓨터)

- **Docker Desktop을 에이전트 셸에서 실행하지 않는다.** Claude 데스크톱 앱 안에서 켜면 소켓 파일 문제로 계속 꺼진다. `docker info`가 실패하면 사용자에게 시작 메뉴에서 켜달라고 부탁한다. 이미 켜진 Docker를 CLI로 쓰는 것은 괜찮다.
- 백엔드를 다시 띄우기 전에 8080 포트에 남은 이전 프로세스가 있으면 정리한다(명령줄에 `com.aram.community.BackendApplication`이 있는 것만).
- Vite가 연달아 저장된 파일 변경을 놓쳐 예전 코드를 내보낼 때가 있다. 디스크 파일이 맞는데 화면이 이상하면 개발 서버를 재시작한다. 특히 개발 서버가 켜진 채로 git 브랜치를 바꾸거나 합치면 CSS가 반쯤 만들어진 채로 굳어서 디자인 색(`@theme`)이 통째로 빠진 흰 화면이 된다(2026-10-25). 이때는 개발 서버를 재시작하고 브라우저를 새로고침한다.
- 셸 명령 하나에 heredoc 여러 개를 묶으면 따옴표 해석이 깨지는 일이 있었다. 파일은 하나씩 쓴다.

## 남은 일

작업을 마칠 때마다 이 목록을 실제 상태에 맞게 고친다.

**완료**
- 2026-10-24: 디스코드 앱 등록(앱 이름 `aram`, Client ID `1563452857179578451`), 로컬에서 실제 디스코드 로그인 성공. 관리자는 사용자 "하포"(디스코드 ID `472407196144107529`). 디스코드 개발자 포털 Redirects에는 `http://localhost:5173/login/oauth2/code/discord`와 운영 `https://aram.asia/login/oauth2/code/discord`가 등록돼 있다.
- 2026-10-24: 프로필 페이지(`/users/:userId`, `/settings/profile`) — 활동 잔디(한국 시간, 53주/좁은 화면 26주), 통계, 쓴 글·쓴 댓글·스크랩 탭, 공개/비공개, 직접 올린 프로필 사진, 글 스크랩. 설계 `docs/superpowers/specs/2026-10-24-profile-design.md`, 계획 `docs/superpowers/plans/2026-10-24-profile.md`.
- 2026-10-24: 증강 카드 — 증강 탭에서 증강을 누르면 게임 카드 틀(CommunityDragon 그림)로 영어 원문 카드와 선택 언어 카드가 나란히 나오고(같은 언어면 한 장), 수치가 채워진 긴 설명에 게임 색 표식을 입힌다. 마우스를 올리면 복사 버튼, 머리말에 언어 설정(한국어·English), 글 목록은 한 줄짜리. API `GET /api/augments/{id}?lang=`. 설계 `docs/superpowers/specs/2026-10-24-augment-card-design.md`, 계획 `docs/superpowers/plans/2026-10-24-augment-card.md`.
- 2026-10-25: 디자인 다듬기(칼바람 나락의 밤) — 연한 하늘색 바탕, 밤하늘 머리말·머리 띠, 금색 장식, 청록 버튼. 글 목록은 작성자(사진+이름) 칸·20px 제목·아이콘+이름 태그·"26.21 버전 최신" 묶음, 증강·챔피언 칸은 글 수 없이, 프로필 숫자에 받은 추천(API `stats.receivedLikeCount`), 글쓰기 아래 고정 등록 띠, 휴대폰 떠 있는 글쓰기 버튼, 알림은 아래 가운데. 설계·계획·목업은 `docs/superpowers/specs/2026-10-25-design-polish-*`, `plans/2026-10-25-design-polish.md`.
- 2026-10-25: 미뤄둔 작은 문제 정리 — 잘못된 숫자 주소(`/posts/abc`)는 "없는 글이에요"(`lib/routeId.ts`), 디스코드 로그인 실패·취소는 `/auth/done?error`로 와서 안내 후 원래 화면으로, CSRF 실패는 `CSRF_INVALID`("새로고침한 뒤 다시"), 지원하지 않는 메서드 405, 파일 칸 없는/multipart 아닌 업로드 400, 제목 길이는 공백 제거 뒤 검사, 추천·스크랩 버튼이 다시 불러온 값을 따라감, 펼침 영역의 글 정렬은 주소 `?order=likes`에 남음(다른 칸을 열면 지워짐), 남은 글 수는 마지막 페이지 기준, 챔피언 자료가 없으면 "아직 챔피언 정보를 받아오지 못했어요", 마지막 페이지를 넘으면 "이 페이지는 비어 있어요"와 「첫 페이지로」, 가입일은 한국 시간, 사진이 저장 직전 지워지면 "이미지를 찾을 수 없어요", 게임 데이터 동기화가 실패하면 30분 뒤 재시도(`SyncTimer`), 줄바꿈은 루트 `.gitattributes`로 작업 폴더까지 LF.
- 2026-10-24: 증강·챔피언 탭(`/augments`, `/champions`) — 위쪽 메뉴 탭, 증강은 프리즘·골드·실버 묶음(접힘), 이름 검색과 가나다순/글 많은 순, 칸을 누르면 그 줄 아래로 글 목록(5개씩 더 보기)이 펼쳐지고 `?open=`에 남는다. 챔피언에는 자주 함께 쓰는 증강. API `GET /api/tag-counts`, `GET /api/champions/{id}/top-augments`, `GET /api/posts?size=`. 설계 `docs/superpowers/specs/2026-10-24-tag-browse-design.md`, 계획 `docs/superpowers/plans/2026-10-24-tag-browse.md`.
- 2026-10-25: 배포 준비 — 로그인 정보 DB 저장(Spring Session JDBC), `prod` 설정, Docker 이미지 2개, 운영 Compose·Caddy·업데이트 중 안내, 자동 되돌리기 `deploy.sh`, GitHub Actions(테스트·배포), 서버 준비 스크립트, 안내서 `docs/deploy.md`. `dev` 가지를 만들어 이제 작업은 `dev`로 합친다. 설계 `docs/superpowers/specs/2026-10-25-deploy-design.md`, 계획 `docs/superpowers/plans/2026-10-25-deploy.md`.
- 2026-10-25: 이름을 ARAM으로, 포로 아이콘(탭·홈 화면·머리말), 바닥글에 라이엇 안내 문구.
- 2026-10-26: 영상 클립 블록 — `/` 메뉴·영상 버튼·끌어다 놓기, 서버 변환(720p·24fps·무음·30초), 진행률, 자동 반복 재생, 등록 잠금. 운영 배포됨. 설계 `docs/superpowers/specs/2026-10-26-video-clip-design.md`, 계획 `docs/superpowers/plans/2026-10-26-video-clip.md`.
- 2026-10-26: 태그 검색에서 띄어쓰기 무시·초성 검색, 제목과 영상(또는 사진)만 있는 글 허용. 운영 배포됨.
- 2026-10-26: 본문 챔피언·증강 태그(`@` 메뉴, 아이콘+굵은 이름 박스, 태그 칸 자동 추가, 증강 박스에 카드 띄우기). 운영 배포됨. 설계 `docs/superpowers/specs/2026-10-26-tag-mentions-design.md`, 계획 `docs/superpowers/plans/2026-10-26-tag-mentions.md`.
- 2026-10-26: 본문 증강 박스에 마우스를 올리면 큰 게임 카드 대신 작은 설명 상자(아이콘·이름·등급·설명)가 뜬다. 운영 배포됨.
- 2026-10-26: 본문 챔피언·증강 태그를 박스 대신 본문 글자 크기의 아이콘+색 글자로(증강은 점선 밑줄). 운영 배포됨.
- 2026-10-26: 바닥글 정리 — 이름·문의 메일·GitHub, 자료 출처와 패치, ©, 라이엇 안내 영어 원문. `dev`에 합침(운영 배포 전).
- 2026-10-26: 아이템 탭 — 위쪽 메뉴 탭 `/items`(증강·챔피언 옆), 단계(전설·서사·기본·신발·시작·증강 모드) 묶음, 아이템을 누르면 설명 상자(아이콘·이름·가격·설명·재료와 상위 아이템, 재료·상위 아이템을 누르면 그 아이템의 묶음을 열고 검색어를 지운 뒤 그 아이템이 펼쳐지고 화면이 그쪽으로 옮겨짐. 넓은 화면에서는 설명 상자가 왼쪽, 글 목록이 오른쪽(`TagPostsPanel`의 `aside`))가 펼쳐지고 `/items/:itemId` 태그 글 목록, 글쓰기 아이템 태그 칸(10개까지), `@` 메뉴·본문 아이템 박스와 설명 상자, 글 목록·글 화면 아이템 태그. `item-tab` 가지에 있다(`dev`에 합치기 전). 설계 `docs/superpowers/specs/2026-10-26-item-tab-design.md`, 계획 `docs/superpowers/plans/2026-10-26-item-tab.md`.
- 2026-10-26: 첫 배포 — **https://aram.asia** 운영 시작. 도메인은 가비아(`aram.asia`, 첫해 7,700원·연장 약 27,500원, DNS는 가비아 A 레코드 `@` → 고정 IP). Lightsail 인스턴스 `aram`(서울 ap-northeast-2a, Ubuntu 24.04, 월 12달러 2GB, 듀얼 스택, 자동 스냅샷 매일 05:00 KST), 고정 IP `aram-ip` = `3.36.255.35`, 방화벽 22·80·443. 서버 `/opt/aram/.env`는 다 채워짐(DB 비밀번호는 서버에서 만들어 밖에 없음). 서버 호스트 키 지문 `SHA256:X+yQg1G94r8Bdd2egh8MqOxGXfbDYO1BTLureIV6wjE`. GitHub Secrets 4개 등록, 배포 전용 키의 비밀 쪽은 GitHub에만 있다(로컬 사본은 지움 — 서버에 직접 들어갈 때는 Lightsail 브라우저 SSH를 쓰거나 새 키를 만들어 `authorized_keys`에 더한다). AWS 예산 `aram-monthly` 월 15달러(네이버·지메일). 예전 EC2의 놀던 탄력적 IP(월 약 3.6달러)를 지웠다. AWS 크레딧 약 22달러가 2027-03-22까지 남아 있다(가입 크레딧 100달러는 2026-09에 소진).

**다음 단계**
1. 운영 확인 마무리: 사용자가 실제 디스코드 로그인·글쓰기·사진 올리기를 해 본다. 서버 재부팅 후 로그인·사진 유지, 다음 날 첫 자동 스냅샷이 생겼는지 확인한다.
2. 운영 휴대폰 확인: 영상 클립·태그 검색·본문 태그는 2026-10-26에 운영 배포됨. 실제 휴대폰(iPhone 포함)에서 영상 올리기·클립 재생과 증강 태그 누르기를 확인한다. 바닥글 정리는 `dev`에만 있다(다음 "업데이트해줘" 때 올라감).
3. 증강 칼바람에서 강철심장 설명이 5%인지 사용자가 게임에서 확인한다(10%면 `ItemValues`에서 ARAM 단계를 뺀다. 지금 한국어 설명은 "피해의 5%만큼 최대 체력").
4. 화면 문구 영어 번역(i18n).

2026-10-24에 main을 GitHub에 처음 푸시했고, 2026-10-25에 증강 카드와 새 증강 자료 보완(240개 모두 설명), 미뤄둔 작은 문제 정리, 디자인 다듬기(칼바람 나락의 밤)까지 푸시했다. 2026-10-26에 `dev`를 처음 푸시하고 `main`에 합쳐 첫 배포했고, 같은 날 영상 클립·태그 검색·본문 태그·작은 증강 설명 상자·글자 크기 태그를 운영에 올렸다. 이후 푸시는 사용자가 요청할 때만 한다.

**v1 검토에서 미뤄둔 작은 문제** (나머지는 2026-10-25에 고침)
- 본문 검사가 서식 이름만 확인하고 ProseMirror 구조나 추가 속성은 확인하지 않는다. 본문 글자 수에 문단 줄바꿈이 포함된다.

**증강 카드에서 미뤄둔 작은 문제**
- 복사 버튼은 보안 컨텍스트(https 또는 localhost)에서만 동작한다. 그 밖에서는 "복사하지 못했어요"가 뜬다(드래그 복사는 된다).
- 스킬 증강의 `{{SpellName}}`은 대부분 챔피언마다 칸이 달라서(대응표가 자료에 없음) `[스킬]`/`[Ability]`로 보인다. 증강 이름 끝(`GoH_PentakillAug_W`)이나 수치 이름 앞(`WAbilityHaste`)에 칸이 적힌 7개(빵과 버터·잼·치즈, 펜타킬 4종)만 `[Q]`/`[W]`/`[E]`/`[R]`로 보인다(`text/AbilitySlot`).
- 못 채운 자리표시자는 카드에 `?`로 보인다(op.gg도 같음). 스탯 번호 4·8의 뜻과 `BuffCounter…`(게임 중 중첩), 해시 이름 계산 종류를 알아내면 더 줄일 수 있다.
- 문자열 표에 글이 전혀 없는 증강은 카드 자리에 "아직 설명이 없어요"가 보인다(16.21 기준 0개). 게임 중 누적치(`@f2@`)는 "이름표: 값" 줄만 지우고, 문장 안에 섞여 있으면 남겨서 `?`로 보인다.

**본문 태그 검토에서 미뤄둔 작은 문제**
- 한글 입력 조합 중 Enter로 `@` 후보를 고르는 것은 실제 키보드에서 확인하지 못했다(ProseMirror가 조합 중 키 입력을 넘기지 않고, 메뉴도 `isComposing`이면 무시한다).
- 증강 박스를 눌렀다가 떼지 않고 끌어서 벗어나면, 다음에 Tab으로 그 박스에 와도 카드가 안 뜬다(`HoverTooltip`의 `pressedWith`가 남음. 아이템 박스도 같음).
- `PostContentValidator` 주석은 박스 이름이 검색에 걸린다고 하지만 아직 본문 검색은 없다.
- 서버는 박스에 굵게·기울임 마크를 허용하고(굵은 문장 안의 박스 저장이 깨지지 않게), 박스 이름이 실제 이름과 같은지는 보지 않는다.

**프로필 검토에서 미뤄둔 작은 문제** (나머지는 2026-10-25에 고침)
- 같은 이미지를 두 탭에서 동시에 "프로필 사진으로 저장"과 "본문에 넣기"를 하면 둘 다 통과할 수 있다(확인 후 저장 사이 경쟁). 그 글을 지우면 프로필 사진도 사라진다. 이미지 행 잠금이나 글 삭제 시 프로필 사진은 연결만 끊기로 막을 수 있다.
- `PUT /api/me/profile`은 닉네임 없이도 호출되는데 `POST /api/images`는 닉네임이 필요하다(화면에서는 닉네임 화면으로 먼저 보내므로 문제 없음).
