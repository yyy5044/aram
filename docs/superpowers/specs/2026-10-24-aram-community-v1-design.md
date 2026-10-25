# 증강 칼바람 커뮤니티 v1 설계

- 작성일: 2026-10-24
- 상태: 사용자 검토 대기
- 관련 목업: `.superpowers/brainstorm/` (git 제외, 참고용)

## 1. 목적

리그 오브 레전드 증강 칼바람 나락 모드의 증강 정보를 친구들과 공유하는 커뮤니티다. 챔피언별 추천 증강, 특정 증강 소개, 증강 조합 추천을 게시글로 올리고 공유한다.

**사용자 규모**: 친구 10명 안팎. 동시 접속, 대용량 트래픽은 고려하지 않는다.

**성공 기준**: 친구가 받은 글 링크를 로그인 없이 바로 읽을 수 있고, 디스코드로 로그인해서 글, 댓글, 추천을 남길 수 있다. 운영자가 챔피언, 증강, 패치 데이터를 손으로 관리할 필요가 없다.

**운영 원칙**: 취미 프로젝트라 운영 부담이 생기는 기능은 넣지 않는다. 패치 소식 정리, 인기 순위 큐레이션처럼 사람이 계속 채워야 하는 기능은 범위 밖이다.

## 2. 범위

### v1에 포함

- 게시글 목록, 상세, 작성, 수정, 삭제
- 챔피언 태그, 증강 태그, 패치 지정
- 본문 서식(굵게, 기울임, 목록, 인용)과 이미지 첨부
- 댓글 작성, 수정, 삭제 (한 단계, 대댓글 없음)
- 게시글 추천과 추천 취소
- 태그로 모아보기
- 디스코드 로그인, 첫 로그인 시 닉네임 설정
- 관리자의 글·댓글 삭제
- 챔피언, 현재 패치, 증강 목록 자동 동기화

### v1에서 제외 (나중 후보)

검색, 알림, 대댓글, 내 글 모아보기·프로필 페이지, 증강 설명 문구 표시, 실제 서버 배포, 디자인 다듬기, 디스코드 외 로그인.

## 3. 화면

모든 화면 위쪽 메뉴: 왼쪽 로고(누르면 메인), 오른쪽 글쓰기 버튼과 내 프로필(로그인 전에는 "디스코드로 로그인" 버튼). 로그인 상태의 프로필을 누르면 닉네임과 로그아웃 메뉴가 나온다.

| 화면 | 주소 | 로그인 필요 |
|---|---|---|
| 메인 (글 목록) | `/` | 아니요 |
| 글 상세 | `/posts/:postId` | 아니요 |
| 태그 모아보기 (챔피언) | `/champions/:championId` | 아니요 |
| 태그 모아보기 (증강) | `/augments/:augmentId` | 아니요 |
| 글쓰기 | `/write` | 예 |
| 글 수정 | `/posts/:postId/edit` | 예, 글쓴이만 |
| 닉네임 설정 | `/welcome` | 예 |

### 3.1 메인 (글 목록)

- 위쪽에 정렬 버튼 두 개: **최신순**(기본), **추천순**. 선택은 주소의 `?sort=latest|likes`에 반영해 공유와 새로고침에도 유지된다.
- 글이 위에서 아래로 한 줄씩 나온다. 한 줄에: 추천 수, 제목, 챔피언 아이콘, 증강 아이콘, 패치 번호, 글쓴이 닉네임, 상대 시간("2시간 전"), 댓글 수.
- 한 페이지 20개. 맨 아래 페이지 번호. 주소의 `?page=`에 반영한다.
- 시간 표시 규칙(모든 화면 공통): 1분 미만 "방금", 1시간 미만 "N분 전", 24시간 미만 "N시간 전", 7일 미만 "N일 전", 그 이후 "2026.10.24".
- 글이 하나도 없으면 "아직 글이 없어요. 첫 글을 써보세요" 문구와 글쓰기 버튼을 보여준다.
- 옆 상자, 배너, 인기 카드는 두지 않는다.

### 3.2 글쓰기 / 글 수정

위에서 아래 순서: **제목 → 본문 → 챔피언 태그 → 증강 태그 → 패치 → 등록 버튼**.

- **제목**: 1~100자.
- **본문**: 서식 편집기. 굵게, 기울임, 글머리 목록, 번호 목록, 인용만 지원한다. 이미지는 붙여넣기, 끌어다 놓기, 이미지 버튼으로 본문 중간에 넣는다. 본문 글자 수(이미지 제외) 1~10,000자.
- **챔피언 태그**: 이름 일부를 입력하면 초상화와 함께 후보가 뜨고, 눌러서 추가한다. ✕로 제거. 0~5개.
- **증강 태그**: 챔피언 태그와 같은 방식. 아이콘과 한국어 이름. 0~10개. 현재 게임에 없는 증강(비활성)은 후보에 뜨지 않는다. 수정 화면에서 이미 붙어 있던 비활성 증강은 그대로 보이고 제거할 수 있다.
- **패치**: 선택 상자. 기본값은 현재 패치이고 "(현재 패치)"라고 표시한다. 최근 패치 8개 중에서 고를 수 있다. 수정 화면에서는 글에 저장된 패치가 선택되어 있고, 그 패치가 최근 8개 밖이면 목록 맨 아래에 덧붙여 보여준다.
- 태그는 없어도 등록할 수 있다.
- 등록에 성공하면 그 글의 상세 화면으로 이동한다.
- 입력 중 페이지를 떠나려 하면 "작성 중인 내용이 사라져요" 확인을 띄운다.

### 3.3 글 상세

위에서 아래 순서: 목록으로 링크, 제목, 메타 줄(패치, 글쓴이, 작성 시간, "수정됨" 표시), 본문(이미지 포함), 태그 줄, 추천 버튼, 댓글 목록, 댓글 입력칸.

- **수정·삭제 버튼**: 글쓴이에게만 보인다. 관리자에게는 삭제 버튼만 보인다. 삭제는 확인 창을 거친다. 삭제 후 메인으로 이동한다.
- **태그 줄**: 챔피언과 증강을 아이콘+이름 칩으로 보여주고, 누르면 해당 모아보기로 간다.
- **추천 버튼**: "▲ 추천 N". 로그인 상태에서 누르면 추천, 다시 누르면 취소. 내가 추천한 상태는 색으로 구분한다. 로그인 전에 누르면 로그인 안내를 띄운다. 자기 글도 추천할 수 있다.
- **댓글**: 오래된 순으로 한 줄씩. 닉네임, 디스코드 프로필 사진, 상대 시간, 내용. 내 댓글에는 수정·삭제, 관리자에게는 삭제가 보인다. 댓글 1~1,000자, 줄바꿈 유지, 서식 없음. 댓글은 페이지를 나누지 않고 전부 보여준다.
- 로그인 전에는 댓글 입력칸 대신 "로그인하고 댓글 달기" 버튼을 보여준다.

### 3.4 태그 모아보기

- 위쪽 상자: 챔피언이면 초상화와 이름, 증강이면 아이콘과 이름. "이 태그가 붙은 글 N개". 오른쪽에 "✕ 전체 글 보기"(메인으로).
- 그 아래는 메인과 같은 정렬 버튼, 목록, 페이지 번호.
- 증강이 비활성이면 이름 옆에 "현재 게임에 없음"을 표시한다.

### 3.5 닉네임 설정

- 첫 로그인 직후, 닉네임이 없는 사용자는 어떤 화면에 있든 `/welcome`으로 보낸다.
- 디스코드 표시 이름을 기본값으로 채워둔다.
- 2~12자, 한글·영문·숫자·밑줄만. 다른 사용자와 대소문자 무시하고 겹칠 수 없다.
- 저장하면 로그인 직전에 보던 화면으로 돌아간다.

## 4. 권한

| 행동 | 로그인 전 | 로그인 | 글쓴이 본인 | 관리자 |
|---|---|---|---|---|
| 글·댓글 읽기 | O | O | O | O |
| 글쓰기, 댓글, 추천 | X | O | O | O |
| 글·댓글 수정 | X | X | O | X (본인 것만) |
| 글·댓글 삭제 | X | X | O | O |

- 관리자는 설정값 `app.admin-discord-ids`에 적힌 디스코드 사용자 ID로 정한다. 로그인할 때마다 이 목록으로 역할을 다시 계산한다.
- 권한은 서버에서 검사한다. 화면에서 버튼을 숨기는 건 편의일 뿐이다.

## 5. 시스템 구성

```
브라우저 ── React 앱 (Vite)
   │  /api/*  (같은 주소, 개발 중에는 Vite 프록시)
   ▼
Spring Boot ── PostgreSQL 18
   │   ├─ 이미지 저장소 (개발: 로컬 폴더 / 운영: S3)
   │   └─ 예약 작업: 외부 데이터 동기화, 버려진 이미지 정리
   ▼
외부: Discord OAuth2, Riot Data Dragon, CommunityDragon
```

- 화면과 API는 같은 주소에서 서빙한다. 개발 중에는 Vite 프록시가 `/api`, `/oauth2`, `/login`을 백엔드로 넘긴다. 그래서 CORS 설정이 필요 없고 세션 쿠키를 그대로 쓴다.

### 5.1 백엔드 (`backend/`)

Spring Boot 4.1, Java 21, Spring Data JPA(Hibernate, `ddl-auto: validate`), Flyway, Spring Security OAuth2 Client.

기능별 패키지로 나눈다. 각 패키지는 컨트롤러, 서비스, 리포지토리, 엔티티, DTO를 자기 안에 둔다.

| 패키지 | 책임 |
|---|---|
| `auth` | 디스코드 로그인, 현재 사용자 조회, 닉네임 설정, 관리자 판정 |
| `user` | 사용자 엔티티와 조회 |
| `post` | 글 CRUD, 목록 조회(정렬, 페이지, 태그 필터), 본문 검증 |
| `comment` | 댓글 CRUD |
| `like` | 추천, 추천 취소 |
| `gamedata` | 챔피언, 증강, 패치 데이터와 외부 동기화 |
| `image` | 이미지 업로드, 제공, 정리, 저장소 추상화 |
| `common` | 오류 응답 형식, 공통 설정 |

### 5.2 프론트엔드 (`frontend/`)

React 19, TypeScript, Vite, Tailwind CSS, React Router(화면 이동), TanStack Query(서버 데이터 캐시), Tiptap(본문 편집기와 본문 표시).

| 폴더 | 내용 |
|---|---|
| `src/pages/` | 화면 단위 컴포넌트 (메인, 상세, 글쓰기, 모아보기, 닉네임) |
| `src/components/` | 공통 부품 (글 목록 한 줄, 태그 칩, 태그 선택기, 페이지 번호, 메뉴) |
| `src/api/` | API 호출 함수와 타입 |
| `src/editor/` | Tiptap 편집기 설정과 본문 표시기 |

## 6. 데이터 모델

테이블은 Flyway 마이그레이션으로 만든다. 시간은 모두 `timestamptz`.

### users
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint PK | |
| discord_id | varchar(32) unique not null | |
| nickname | varchar(12) null | 설정 전에는 null. `lower(nickname)` 유니크 인덱스 |
| avatar_url | varchar(255) null | 디스코드 프로필 사진 |
| role | varchar(10) not null | `USER` / `ADMIN` |
| created_at | timestamptz not null | |

### champions
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | varchar(40) PK | Data Dragon id, 예: `Amumu` |
| name_ko | varchar(40) not null | 예: 아무무 |
| image_file | varchar(80) not null | 예: `Amumu.png` |

이미지 주소는 `https://ddragon.leagueoflegends.com/cdn/{현재 Data Dragon 버전}/img/champion/{image_file}`로 만든다.

### augments
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | varchar(80) PK | CommunityDragon `AugmentNameId`, 예: `ARAM_LegDay` |
| name_ko | varchar(80) not null | 예: 하체 운동의 날 |
| icon_path | varchar(200) not null | 예: `assets/ux/cherry/augments/icons/legday_small.png` |
| active | boolean not null | 최근 동기화 데이터에 있으면 true |
| updated_at | timestamptz not null | |

아이콘 주소는 `https://raw.communitydragon.org/latest/game/{icon_path}`로 만든다.

### patches
| 컬럼 | 타입 | 비고 |
|---|---|---|
| ddragon_version | varchar(20) PK | 예: `16.21.1` |
| game_patch | varchar(10) not null | 예: `26.21` |
| released_order | int not null | 클수록 최신 |

패치 행은 지우지 않는다. 패치 선택 상자는 `released_order` 내림차순 상위 8개를 쓴다. 현재 패치는 `game_data_state.current_game_patch`다.

### game_data_state (한 줄짜리 테이블)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | int PK | 항상 1 |
| current_ddragon_version | varchar(20) null | |
| current_game_patch | varchar(10) null | |
| last_checked_at | timestamptz null | |
| last_synced_at | timestamptz null | |
| last_error | text null | 마지막 실패 사유 |

### posts
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint PK | |
| author_id | bigint FK users not null | |
| title | varchar(100) not null | |
| content | jsonb not null | Tiptap 문서 JSON |
| content_text | text not null | 본문 순수 글자. 글자 수 검사와 링크 미리보기 설명용 |
| game_patch | varchar(10) not null | 예: `26.21` |
| like_count | int not null default 0 | |
| comment_count | int not null default 0 | |
| created_at, updated_at | timestamptz not null | 수정 시 updated_at 갱신, 화면에 "수정됨" |

인덱스: `(created_at desc)`, `(like_count desc, created_at desc)`.

### post_champions / post_augments
`(post_id, champion_id)` / `(post_id, augment_id)` 복합 PK. 글 삭제 시 함께 삭제. 태그별 목록 조회용으로 `champion_id`, `augment_id` 인덱스.

### comments
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint PK | |
| post_id | bigint FK posts not null | 글 삭제 시 함께 삭제 |
| author_id | bigint FK users not null | |
| content | varchar(1000) not null | |
| created_at, updated_at | timestamptz not null | |

### post_likes
`(post_id, user_id)` 복합 PK, `created_at`. 글 삭제 시 함께 삭제.

### images
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| uploader_id | bigint FK users not null | |
| post_id | bigint FK posts null | 글 저장 시 연결. 글 삭제 시 이미지도 삭제 |
| storage_key | varchar(200) not null | |
| content_type | varchar(40) not null | |
| size_bytes | int not null | |
| created_at | timestamptz not null | |

`like_count`, `comment_count`는 추천·댓글 추가와 삭제 시 같은 트랜잭션 안에서 함께 갱신한다.

## 7. API

모든 API는 `/api` 아래에 있다. 응답은 JSON이다. 목록 응답 형식은 `{ items, page, size, totalItems, totalPages }`이고 페이지는 1부터 센다.

| 메서드 | 주소 | 설명 | 권한 |
|---|---|---|---|
| GET | `/api/me` | 현재 사용자 (`null`이면 로그인 전) | 누구나 |
| PUT | `/api/me/nickname` | 닉네임 설정·변경 | 로그인 |
| POST | `/api/logout` | 로그아웃 | 로그인 |
| GET | `/api/posts?sort=&page=&champion=&augment=` | 글 목록. `champion`, `augment`는 태그 필터 | 누구나 |
| GET | `/api/posts/{id}` | 글 상세 (내 추천 여부 포함) | 누구나 |
| POST | `/api/posts` | 글 작성 | 로그인 |
| PUT | `/api/posts/{id}` | 글 수정 | 글쓴이 |
| DELETE | `/api/posts/{id}` | 글 삭제 | 글쓴이, 관리자 |
| PUT | `/api/posts/{id}/like` | 추천 | 로그인 |
| DELETE | `/api/posts/{id}/like` | 추천 취소 | 로그인 |
| GET | `/api/posts/{id}/comments` | 댓글 목록 | 누구나 |
| POST | `/api/posts/{id}/comments` | 댓글 작성 | 로그인 |
| PUT | `/api/comments/{id}` | 댓글 수정 | 글쓴이 |
| DELETE | `/api/comments/{id}` | 댓글 삭제 | 글쓴이, 관리자 |
| GET | `/api/champions` | 챔피언 전체 (이름순) | 누구나 |
| GET | `/api/augments` | 증강 전체 (`active` 포함, 이름순) | 누구나 |
| GET | `/api/patches` | 선택 가능한 패치 8개와 현재 패치 | 누구나 |
| POST | `/api/images` | 이미지 업로드 (multipart) → `{ id, url }` | 로그인 |
| GET | `/api/images/{id}` | 이미지 제공 | 누구나 |
| GET | `/api/status` | 서버·DB 상태 (기존) | 누구나 |

- 추천 PUT/DELETE는 여러 번 호출해도 결과가 같다(멱등).
- 글 목록의 `champion`, `augment`는 각각 하나의 ID다. 화면은 둘 중 하나만 쓰지만, 둘 다 오면 두 조건을 모두 만족하는 글만 준다. `sort` 기본값은 `latest`, `page` 기본값은 1이고 마지막 페이지를 넘으면 빈 목록을 준다. 1보다 작으면 400(`INVALID_INPUT`)이다.
- 글 작성·수정 요청: `{ title, content, championIds[], augmentIds[], gamePatch }`. `gamePatch`는 `patches` 테이블에 있는 값이어야 한다. 태그 ID는 존재해야 하고 중복은 하나로 합친다. 새로 붙이는 증강은 `active`여야 한다(이미 붙어 있던 비활성 증강은 유지 가능).

### 7.1 오류 응답

형식: `{ "code": "POST_NOT_FOUND", "message": "글을 찾을 수 없어요" }`. 입력 오류는 `fieldErrors: { title: "제목은 100자 이하로 써주세요" }`를 함께 준다. 메시지는 한국어로 화면에 그대로 보여줄 수 있게 쓴다.

| 상태 | 쓰임 |
|---|---|
| 400 | 입력값 오류 |
| 401 | 로그인 필요 |
| 403 | 권한 없음, 닉네임 미설정 상태에서 쓰기 시도 |
| 404 | 글, 댓글, 이미지 없음 |
| 409 | 닉네임 중복 |
| 413 | 이미지 용량 초과 |

화면은 401이면 로그인 안내, 404면 "없는 글이에요" 화면, 그 밖의 오류는 화면 위쪽에 잠깐 뜨는 알림으로 메시지를 보여준다.

## 8. 로그인 (디스코드)

- Spring Security `oauth2Login`에 디스코드를 직접 등록한다.
  - 인가: `https://discord.com/oauth2/authorize`
  - 토큰: `https://discord.com/api/oauth2/token`
  - 사용자 정보: `https://discord.com/api/users/@me`
  - 범위: `identify` (이메일은 받지 않는다)
- 로그인 버튼은 `/oauth2/authorization/discord`로 이동한다. 로그인 전 보던 주소를 기억했다가 성공 후 돌아간다. 닉네임이 없으면 `/welcome`으로 보낸다.
- 처음 보는 `discord_id`면 사용자를 만든다. 로그인할 때마다 프로필 사진과 관리자 여부를 갱신한다.
- 세션은 서버 세션 쿠키를 쓴다. 유효 기간 30일.
- CSRF는 쿠키 기반 토큰(`XSRF-TOKEN` 쿠키, `X-XSRF-TOKEN` 헤더)으로 막는다.
- 디스코드 클라이언트 ID와 비밀 키, 관리자 디스코드 ID는 git에 올라가지 않는 `backend/.env`에서 읽는다. 저장소에는 빈 값의 `backend/.env.example`만 둔다.

## 9. 본문 편집기와 안전한 표시

- 본문은 Tiptap 문서 JSON으로 저장한다. HTML로 저장하지 않는다.
- 서버는 저장 전에 JSON을 검사한다. 허용 노드: `doc, paragraph, text, hardBreak, bulletList, orderedList, listItem, blockquote, image`. 허용 마크: `bold, italic`. 그 밖의 노드나 마크가 있으면 400.
- `image` 노드의 `src`는 반드시 `/api/images/{uuid}` 형식이고, 그 이미지는 요청한 사용자가 올린 것이어야 한다.
- 화면에서는 같은 Tiptap 설정의 읽기 전용 표시기로 그린다. 사용자 입력을 HTML로 직접 끼워 넣지 않으므로 스크립트 삽입이 불가능하다.
- `content_text`는 서버가 JSON에서 글자만 뽑아 만든다.

## 10. 이미지

- 형식: jpg, png, webp, gif. 서버가 파일 앞부분 바이트로 실제 형식을 확인한다(확장자만 믿지 않는다).
- 한 장 10MB 이하, 한 글에 10장 이하.
- 업로드 순간에는 글과 연결되지 않은 상태로 저장된다. 글을 저장할 때 본문에 들어 있는 이미지들을 그 글에 연결한다. 수정으로 본문에서 빠진 이미지는 연결을 끊는다.
- 예약 작업이 매일 한 번, 만든 지 24시간이 지났는데 글에 연결되지 않은 이미지를 지운다.
- 저장소는 `ImageStorage` 인터페이스로 감싼다. v1 구현은 로컬 폴더(`backend/data/images`, git 제외). S3 구현은 배포 단계에서 추가한다.
- `GET /api/images/{id}`는 서버가 파일을 직접 내려주고, 오래 캐시하도록 `Cache-Control: public, max-age=31536000, immutable`을 붙인다.

## 11. 게임 데이터 자동 동기화

### 11.1 패치 확인 (6시간마다, 서버 시작 시 1회)

1. `https://ddragon.leagueoflegends.com/api/versions.json`을 받는다. 맨 앞이 최신 Data Dragon 버전이다.
2. 앞에서부터 8개를 `patches`에 넣는다. 게임 패치 표기는 Data Dragon 버전 `A.B.x`를 `(A+10).B`로 바꾼다. 예: `16.21.1` → `26.21`.
3. 최신 버전이 `game_data_state.current_ddragon_version`과 다르거나 챔피언·증강 테이블이 비어 있으면 11.2, 11.3을 실행하고, 둘 다 성공한 뒤에 현재 버전을 갱신한다.

### 11.2 챔피언

`https://ddragon.leagueoflegends.com/cdn/{버전}/data/ko_KR/champion.json`에서 `id`, `name`, `image.full`을 읽어 `champions`를 갱신한다(있으면 수정, 없으면 추가). 챔피언은 지우지 않는다.

### 11.3 증강

1. `https://raw.communitydragon.org/latest/game/maps/modespecificdata/kiwi.bin.json`에서 `__type`이 `AugmentData`인 항목을 모은다.
2. `https://raw.communitydragon.org/latest/game/ko_kr/data/menu/en_us/lol.stringtable.json`의 `entries`에서 `NameTra` 키(대소문자 무시)로 한국어 이름을 찾는다.
3. 한국어 이름이 있는 항목만 쓴다. 아이콘은 `AugmentSmallIconPath`를 소문자로 바꾸고 확장자 `.tex`를 `.png`로 바꾼다.
4. 받은 목록에 있는 증강은 추가·수정하고 `active=true`. 기존에 있었지만 이번에 없는 증강은 `active=false`. 지우지 않는다.
5. 받아온 증강이 20개 미만이면 데이터 구조가 바뀐 것으로 보고 실패 처리한다(기존 목록 유지).

2026-10-24 확인 결과: AugmentData 249개 중 한국어 이름이 있는 항목 208개.

### 11.4 실패 처리

- 외부 요청은 연결·응답 각각 30초 제한.
- 실패하면 기존 데이터를 그대로 두고 `last_error`에 사유를 남긴다. 다음 주기에 다시 시도한다.
- 챔피언·증강 갱신은 각각 하나의 트랜잭션이다. 중간에 실패하면 반쯤 바뀐 상태가 남지 않는다.

## 12. 테스트

- **백엔드**: Testcontainers로 실제 PostgreSQL 18을 띄워 통합 테스트한다. 기능마다 정상 동작, 권한(로그인 전·다른 사람·관리자), 입력 오류를 검사한다. 로그인은 Spring Security 테스트 지원으로 흉내 낸다.
- **외부 데이터**: Data Dragon과 CommunityDragon 응답을 축소한 샘플 파일을 `src/test/resources`에 두고, 가짜 HTTP 서버로 동기화 로직을 검사한다. 실제 외부 사이트에 의존하지 않는다.
- **프론트엔드**: Vitest와 Testing Library로 주요 화면 동작(목록 정렬·페이지, 태그 선택기, 추천 토글, 로그인 전 안내, 글쓰기 검증 메시지)을 검사한다.
- **완료 확인**: 기능마다 로컬에서 서버를 띄워 브라우저로 실제 동작을 확인한다.

## 13. 개발 환경과 설정

- PostgreSQL은 `backend/compose.yaml`로 띄운다(`./gradlew bootRun` 시 자동).
- Docker Desktop은 사용자가 시작 메뉴로 켠다.
- 비밀 값: `backend/.env` (git 제외). 필요한 값: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `APP_ADMIN_DISCORD_IDS`.
- 디스코드 개발자 포털에 등록할 리디렉트 주소(개발): `http://localhost:5173/login/oauth2/code/discord`.
