# 조회수 설계

- 작성일: 2026-10-26
- 상태: 사용자 검토 대기
- 기반: `2026-10-24-aram-community-v1-design.md`(글·추천·목록), `2026-10-25-design-polish-design.md`(글 목록·글 화면 모양)

## 1. 목적

글이 얼마나 읽혔는지 알 수 없다. 추천·댓글은 반응을 남긴 사람만 세므로, 조용히 읽고 간 친구까지 포함한 **본 사람 수**를 글마다 보여준다. 많이 읽힌 글을 모아 볼 수 있게 정렬도 더한다.

**성공 기준**
- 글 화면과 글 목록에 "조회 n"이 보인다.
- 같은 사람이 같은 글을 하루에 여러 번 열어도(새로고침·추천 후 다시 불러오기 포함) 1만 오른다. 다음 날 다시 보면 또 오른다.
- 로그인하지 않은 사람도 센다. 글쓴이 자신은 세지 않는다.
- 정렬에 **조회순**이 있다.

## 2. 범위

**포함**: 조회 기록·숫자 저장, 글 화면을 열 때 세기, 글 화면·글 목록(전체 글, 증강·챔피언·아이템 탭의 펼침 글 목록과 태그 글 목록) 표시, 조회순 정렬, 오래된 조회 기록 정리.

**제외**: 프로필의 "받은 조회" 숫자, 기간별(오늘·이번 주) 조회수, 누가 봤는지 보여주기, 봇 걸러내기, 지난 글의 조회수 복원(이미 있는 글은 0부터 시작).

## 3. 세는 규칙 (사용자 결정)

| 상황 | 세는가 |
|---|---|
| 오늘(한국 시간 날짜) 이 글을 처음 연 사람 | 센다(+1) |
| 같은 날 같은 사람이 다시 열기·새로고침·추천 후 다시 불러오기 | 세지 않는다 |
| 다음 날(한국 시간 자정 이후) 같은 사람 | 다시 센다 |
| 로그인하지 않은 사람 | 브라우저 단위로 센다(시크릿 창·다른 기기는 따로) |
| 글쓴이 자신(로그인 상태) | 세지 않는다 |
| 관리자가 남의 글을 열거나 수정하려고 불러오기 | 다른 사람과 같이 센다 |

"하루"는 한국 시간(`Asia/Seoul`) 날짜다. 활동 잔디(`profile/ActivityQuery.KST`)와 같은 기준이다.

## 4. 데이터

새 Flyway `V13__post_views.sql`:

```sql
alter table posts add column view_count integer not null default 0;
create index posts_view_count_idx on posts (view_count desc, created_at desc, id desc);

create table post_views (
    post_id    bigint      not null references posts (id) on delete cascade,
    viewer_key varchar(50) not null,
    view_date  date        not null,
    primary key (post_id, viewer_key, view_date)
);
create index post_views_view_date_idx on post_views (view_date);
```

- `viewer_key`: 로그인한 사람은 `u:{userId}`, 로그인하지 않은 사람은 `a:{쿠키 값}`(UUID 36자).
- `Post` 엔티티에 `viewCount`(int)를 더한다. 이 열은 JPA가 덮어쓰지 않게 `updatable = false`로 두고, 올릴 때는 SQL로만 올린다(5장).
- 게임 데이터 열이 아니므로 `game_data_state` 버전은 건드리지 않는다.

## 5. 서버

### 5.1 세는 곳

`GET /api/posts/{postId}`(글 화면이 쓰는 API, 화면의 `usePost`)가 응답을 만들기 전에 센다. 따로 "봤어요" API를 두지 않는다. 글 화면을 여는 길이 이 API 하나뿐이고, 디스코드 링크 미리보기는 화면 파일(`index.html`)만 받아서 이 API를 부르지 않기 때문이다.

새 부품 `post/PostViewCounter`:

```
count(postId, viewerUserId 또는 null, anonymousId 또는 null) -> boolean (올렸는가)
```

1. `select author_id from posts where id = ?`. 글이 없으면 아무것도 하지 않는다(이어서 `PostService.get`이 404를 낸다).
2. 로그인한 사람이 글쓴이면 아무것도 하지 않는다.
3. 오늘 날짜는 지금 시각을 한국 시간 날짜로 바꾼 것(`PostViewCounter.kstDate(Instant)`)이다. 날짜를 받는 `countOn(…, LocalDate)`를 따로 두어 테스트가 날짜 넘김을 직접 확인한다.
4. `insert into post_views (post_id, viewer_key, view_date) values (?, ?, ?) on conflict do nothing`
5. 넣은 행이 1이면 `update posts set view_count = view_count + 1 where id = ?`. 0이면(오늘 이미 봄) 그대로 둔다.

같은 사람의 두 요청이 동시에 와도 기본 키가 한 번만 들어가게 막으므로 숫자가 한 번만 오른다. `updated_at`은 건드리지 않으므로 "수정됨" 표시와 수정 시간이 바뀌지 않는다.

`PostService.get`은 지금 `readOnly` 트랜잭션이다. 세기는 쓰기 트랜잭션이 필요하므로 컨트롤러가 `PostViewCounter.count`(자체 트랜잭션)를 먼저 부르고, 그다음 `PostService.get`으로 올라간 숫자가 들어간 응답을 만든다. 없는 글이면 1번에서 멈추고 `get`이 기존처럼 404 `POST_NOT_FOUND`를 낸다.

세기가 실패해도(DB 오류 등) 글은 보여야 한다. `count`에서 난 예외는 경고 로그만 남기고 삼킨다.

### 5.2 로그인하지 않은 사람의 이름표 쿠키

- 이름 `ARAM_VIEWER`, 값은 무작위 UUID, `Max-Age` 1년, `Path=/`, `HttpOnly`, `SameSite=Lax`, 운영(`prod`)에서는 `Secure`.
- 로그인하지 않은 요청에 쿠키가 없거나 값이 UUID 모양이 아니면 새로 만들어 응답에 붙이고, 그 값으로 센다.
- 로그인한 사람에게는 쿠키를 만들지 않는다(이미 있으면 그대로 둔다).
- 개인 정보가 아니다(누구인지 알 수 없는 무작위 번호). 쿠키 안내창은 두지 않는다.

### 5.3 응답

- `PostDetailResponse`, `PostListItem`에 `viewCount`(int)를 더한다.
- `GET /api/posts?sort=` 에 `views`를 더한다: `view_count desc, created_at desc, id desc`(추천순과 같은 방식). 잘못된 값의 오류 문구는 "정렬은 latest, likes, views만 쓸 수 있어요".

### 5.4 기록 정리

새 `post/PostViewCleanupJob`(`ImageCleanupJob`·`VideoCleanupJob`과 같은 `@Scheduled` 방식): 매일 한 번 `view_date < 오늘(한국 시간) - 1일`인 `post_views`를 지운다. 오늘·어제 기록만 남으면 하루 한 번 규칙에 충분하다. 숫자(`posts.view_count`)는 지우지 않는다.

## 6. 화면

- 타입: `PostDetail`, `PostListItem`(`api/posts.ts`)에 `viewCount: number`, `PostSort`에 `'views'`.
- **글 화면**(`PostDetailPage`): 제목 아래 줄 `사진 · 이름 · 시간 · 조회 12 · 패치 묶음`. 13 회색(`text-ink-3`), 기존 시간 글자와 같은 모양.
- **글 목록 한 줄**(`PostListItem`): `9시간 전 · 댓글 0` 뒤에 `· 조회 12`. 같은 부품을 쓰는 증강·챔피언·아이템 탭 글 목록에도 함께 보인다.
- **정렬**(`SortPills`): `최신순 / 추천순 / 조회순`. 주소 `?sort=views`(전체 글), 펼침 영역은 `?order=views`로 남는다(기존 `likes`와 같은 방식, `PostList`·`TagPostsPanel`).
- 글 화면은 서버가 센 뒤의 숫자를 받으므로, 처음 본 사람에게는 자기가 더해진 숫자가 바로 보인다. 같은 날 다시 불러와도 숫자는 그대로다(다른 사람이 그 사이 봤으면 그만큼 늘어 있다).
- 숫자는 그대로 쓴다(`1,234`처럼 쉼표). 10명 규모라 `1.2만` 같은 줄임은 두지 않는다.

## 7. 오류·예외

| 경우 | 처리 |
|---|---|
| 없는 글 | 기존대로 404 `POST_NOT_FOUND`, 세지 않는다 |
| 세기 중 DB 오류 | 경고 로그, 글은 정상 응답(숫자는 안 오른 값) |
| 이름표 쿠키를 지우거나 막은 브라우저 | 열 때마다 새 쿠키를 받으므로 그 사람은 열 때마다 센다. 친구 규모라 받아들인다 |
| 업데이트 중(503 `MAINTENANCE`) | 글이 안 열리므로 세지 않는다 |
| 글 삭제 | `on delete cascade`로 조회 기록도 지워진다 |

## 8. 테스트

**서버**(Testcontainers PostgreSQL)
- 로그인한 다른 사람이 처음 열면 1, 같은 날 다시 열면 그대로 1.
- 날짜가 바뀌면(`countOn`에 다음 날을 넘겨서) 다시 오른다. `kstDate`가 한국 시간 23:59:59와 00:00의 경계에서 날짜를 바꾸는지 확인한다.
- 글쓴이가 열면 오르지 않는다.
- 로그인하지 않은 요청: 쿠키가 없으면 `ARAM_VIEWER`를 받고 1, 같은 쿠키로 다시 열면 그대로, 다른 쿠키면 2.
- 이상한 쿠키 값이면 새 쿠키를 준다.
- 같은 사람의 요청 두 개를 동시에 보내도 1.
- 조회수가 올라도 `updatedAt`·`edited`가 바뀌지 않는다.
- `sort=views` 순서(같으면 최신 글 먼저), 잘못된 정렬 값 오류 문구.
- 정리 작업이 그저께 기록만 지우고 숫자는 남긴다.
- 없는 글은 404이고 기록이 생기지 않는다.

**화면**(Vitest, StrictMode 렌더)
- 글 화면·글 목록 한 줄에 "조회 n"이 보인다.
- 정렬 버튼에 "조회순"이 있고 누르면 `sort=views`로 요청한다.

**브라우저 확인**: 개발 로그인으로 두 사람을 만들어, 다른 사람 글을 열면 1 오르고 새로고침해도 그대로인지, 내 글은 안 오르는지, 로그인하지 않은 창에서도 오르는지, 조회순 정렬을 확인한다.
