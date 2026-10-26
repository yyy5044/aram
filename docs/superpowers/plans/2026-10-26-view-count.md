# 조회수 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 글마다 "본 사람 수"(같은 사람은 하루 한 번, 글쓴이 제외, 로그인 안 한 사람은 브라우저 단위)를 세어 글 화면·글 목록에 보여주고 조회순 정렬을 더한다.

**Architecture:** `GET /api/posts/{id}`가 응답 전에 `PostViewCounter`로 센다. `post_views`(글·보는 사람 열쇠·한국 시간 날짜) 기본 키로 하루 한 번을 지키고, 새 행이 들어갔을 때만 `posts.view_count`를 SQL로 1 올린다. 로그인 안 한 사람은 `ARAM_VIEWER` 쿠키(UUID)로 구분한다. 화면은 받은 `viewCount`를 보여주기만 한다.

**Tech Stack:** Spring Boot 4.1, JdbcTemplate, Flyway, PostgreSQL 18, React 19, TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-26-view-count-design.md`

## Global Constraints

- DB 변경은 새 Flyway 파일 `V13__post_views.sql`로만. Hibernate `ddl-auto: validate`.
- "하루"는 `Asia/Seoul` 날짜(`profile/ActivityQuery.KST`와 같은 기준).
- 보는 사람 열쇠: 로그인 `u:{userId}`, 비로그인 `a:{UUID}`.
- 쿠키: 이름 `ARAM_VIEWER`, `Max-Age` 31536000(1년), `Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure`는 `server.servlet.session.cookie.secure` 값을 따른다(운영 `true`).
- 조회수가 올라도 `posts.updated_at`·`edited`는 바뀌지 않는다.
- 세기가 실패해도 글은 정상 응답(경고 로그만).
- 정렬 값: `latest`·`likes`·`views`. 잘못된 값 문구는 정확히 `정렬은 latest, likes, views만 쓸 수 있어요`.
- 화면 문구(해요체): `조회 12`, 정렬 버튼 `조회순`. 숫자는 `toLocaleString('ko-KR')`(1,234).
- 백엔드 실행: `cd backend && ./gradlew test`. 화면: `cd frontend && npm test && npm run build && npm run lint`(Git Bash는 `export PATH="/c/Program Files/nodejs:$PATH"`).
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 작업 가지 `view-count`.

## Review Focus

1. 글쓴이가 글을 **수정**하면(PUT) JPA가 `view_count`를 옛 값으로 덮어쓰지 않아야 한다 → Task 1 `editingKeepsViewCount`.
2. 로그인한 사람에게 예전에 받은 `ARAM_VIEWER` 쿠키가 남아 있어도 계정 열쇠(`u:`)로만 세야 한다(두 번 세지 않음) → Task 1 `loggedInIgnoresLeftoverViewerCookie`.
3. 조회 기록이 있는 글도 지울 수 있어야 한다(외래 키) → Task 1 `deletingViewedPostWorks`.
4. 운영에서 쿠키가 `Secure`여야 한다(MockMvc 기본 설정은 `false`) → Task 1 `ViewerCookieTest.secureWhenConfigured`.
5. 추천을 누른 뒤 글이 다시 불려도 숫자가 더 오르지 않아야 한다 → Task 1 `sameDayRepeatDoesNotCount`(같은 GET 반복과 같은 경로).

---

### Task 1: 세기와 글 화면 응답 (서버)

**Files:**
- Create: `backend/src/main/resources/db/migration/V13__post_views.sql`
- Create: `backend/src/main/java/com/aram/community/post/PostViewCounter.java`
- Create: `backend/src/main/java/com/aram/community/post/ViewerCookie.java`
- Modify: `backend/src/main/java/com/aram/community/post/Post.java` (필드 `viewCount`)
- Modify: `backend/src/main/java/com/aram/community/post/PostDetailResponse.java` (`int viewCount`를 `commentCount` 뒤에)
- Modify: `backend/src/main/java/com/aram/community/post/PostService.java:115-127` (`get`이 `viewCount`를 채움)
- Modify: `backend/src/main/java/com/aram/community/post/PostController.java:53-56`
- Test: `backend/src/test/java/com/aram/community/post/PostViewApiTest.java`, `backend/src/test/java/com/aram/community/post/ViewerCookieTest.java`

**Interfaces:**
- Produces: 컬럼 `posts.view_count`, 테이블 `post_views(post_id, viewer_key, view_date)`(스펙 4장 SQL 그대로, 인덱스 포함). `Post.getViewCount(): int`.
- Produces: `PostViewCounter`(`@Component`, JdbcTemplate + TransactionTemplate):
  - `static LocalDate kstDate(Instant at)`
  - `boolean count(long postId, Long viewerUserId, String anonymousId)` = `countOn(..., kstDate(Instant.now()))`, 예외는 `DataAccessException`을 잡아 경고 로그 후 `false`.
  - `boolean countOn(long postId, Long viewerUserId, String anonymousId, LocalDate day)` — 스펙 5.1의 1~5단계를 한 트랜잭션에서. `viewerUserId`가 있으면 열쇠 `u:{id}`(anonymousId 무시), 없으면 `a:{anonymousId}`. 둘 다 null이면 `false`.
- Produces: `ViewerCookie`(`@Component`):
  - 생성자 `ViewerCookie(@Value("${server.servlet.session.cookie.secure:false}") boolean secure)`
  - `String resolve(HttpServletRequest req, HttpServletResponse res)` — 유효한 UUID 쿠키면 그 값, 아니면 새 UUID를 만들어 `Set-Cookie`(Global Constraints 속성, `ResponseCookie`로 `SameSite` 지정)하고 반환.
  - `static final String NAME = "ARAM_VIEWER"`
- 컨트롤러 `get`: `principal`이 있으면 `counter.count(postId, principal.userId(), null)`, 없으면 `counter.count(postId, null, viewerCookie.resolve(req, res))`, 그다음 기존 `postService.get`.

- [ ] **Step 1: 실패하는 테스트 쓰기** — `PostViewApiTest extends IntegrationTest`. 시드는 `PostListApiTest.seed`·`insertPost`와 같은 방식(직접 `insert into posts … returning id`), 글쓴이 `author`, 다른 사람 `reader`, 관리자 `admin`.

```java
@Test void firstViewByOtherUserCounts()        // GET as(reader) → $.viewCount == 1
@Test void sameDayRepeatDoesNotCount()         // as(reader) 3번 → 1
@Test void authorViewDoesNotCount()            // as(author) 2번 → 0
@Test void adminViewCounts()                   // as(admin) → 1
@Test void anonymousGetsCookieAndCounts()      // 쿠키 없이 GET → 1, 응답 cookie ARAM_VIEWER 존재, maxAge 31536000, httpOnly
@Test void anonymousSameCookieCountsOnce()     // 받은 쿠키로 다시 GET → 1, Set-Cookie 없음
@Test void anonymousDifferentCookieCountsAgain() // 다른 UUID 쿠키 → 2
@Test void malformedCookieGetsNewOne()         // ARAM_VIEWER=abc → 새 UUID 쿠키, 1
@Test void loggedInIgnoresLeftoverViewerCookie() // as(reader)+쿠키 X, 다시 as(reader)+쿠키 Y → 1
@Test void nextDayCountsAgain()                // counter.countOn(id, reader, null, D), 다시 D → false, D+1 → true; DB view_count 2
@Test void concurrentSameViewerCountsOnce()    // 스레드 2개가 CountDownLatch로 동시에 countOn(같은 열쇠, 같은 날) → true 하나, view_count 1
@Test void viewDoesNotTouchUpdatedAt()         // 보기 전후 posts.updated_at 같음, $.edited false
@Test void editingKeepsViewCount()             // reader 1회 → author PUT(PostApiTest.body 방식) → GET as(author) $.viewCount 1
@Test void deletingViewedPostWorks()           // reader 1회 → author DELETE 204, post_views 0행
@Test void missingPostIs404WithoutRecord()     // GET /api/posts/9999 → 404 POST_NOT_FOUND, post_views 0행
@Test void kstDateBoundary()                   // kstDate(2026-10-26T14:59:59Z) == 2026-10-26, kstDate(2026-10-26T15:00:00Z) == 2026-10-27
```

`ViewerCookieTest`(스프링 없이): `secureWhenConfigured` — `new ViewerCookie(true).resolve(MockHttpServletRequest, MockHttpServletResponse)` 후 `Set-Cookie` 머리글에 `Secure`, `SameSite=Lax`, `HttpOnly`, `Max-Age=31536000`, `Path=/`; `new ViewerCookie(false)`는 `Secure` 없음.

- [ ] **Step 2: 실패 확인** — `cd backend && ./gradlew test --tests "*PostViewApiTest" --tests "*ViewerCookieTest"` → 컴파일 실패(`PostViewCounter` 없음).
- [ ] **Step 3: 구현** — 마이그레이션(스펙 4장), `Post.viewCount`(`@Column(name = "view_count", nullable = false, insertable = false, updatable = false)`), `PostViewCounter`, `ViewerCookie`, `PostDetailResponse.viewCount`, `PostService.get`, 컨트롤러(`HttpServletRequest`, `HttpServletResponse` 인자 추가). 비로그인 UUID 검사는 `UUID.fromString` 후 `toString()`이 원래 값과 같은지로(소문자 36자).
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS. 이어서 `./gradlew test` 전체 PASS(`PostApiTest` 등 기존 테스트가 응답 필드 추가로 깨지지 않음).
- [ ] **Step 5: 커밋** — `git commit -m "Count post views once a day per viewer"`

### Task 2: 목록의 조회수와 조회순 (서버)

**Files:**
- Modify: `backend/src/main/java/com/aram/community/post/PostListItem.java` (`int viewCount`를 `commentCount` 뒤에)
- Modify: `backend/src/main/java/com/aram/community/post/PostListService.java:20-55,109` (`VIEWS` 정렬, 오류 문구, `toPage`)
- Test: `backend/src/test/java/com/aram/community/post/PostListApiTest.java`

**Interfaces:**
- Consumes: Task 1의 `posts.view_count`, `Post.getViewCount()`.
- Produces: `GET /api/posts?sort=views`, 목록 항목 `viewCount`. 태그 글 목록·프로필 글/스크랩 목록도 같은 `toPage`를 써서 자동으로 `viewCount`가 붙는다.

- [ ] **Step 1: 실패하는 테스트 쓰기** — `insertPost`에 `views` 인자를 받는 겹치기 `insertPost(String title, int minutesAgo, int likes, int comments, int views)`를 더하고:

```java
@Test void sortsByViews()          // 5회(3분 전), 9회(2분 전), 1회(1분 전) → items 순서 9회, 5회, 1회
@Test void viewsTieNewestFirst()   // 둘 다 4회, "새 글"(1분 전)·"옛 글"(5분 전) → 새 글 먼저
@Test void listIncludesViewCount() // 7회 글 → $.items[0].viewCount == 7
```

`unknownSortRejected`는 `sort=popular`로 바꾸고 `$.fieldErrors.sort` == `정렬은 latest, likes, views만 쓸 수 있어요`를 확인한다(오류 응답 모양은 `{ code, message, fieldErrors }`).

- [ ] **Step 2: 실패 확인** — `./gradlew test --tests "*PostListApiTest"` → FAIL(`sort=views` 400, `viewCount` 없음).
- [ ] **Step 3: 구현** — `VIEWS = Sort.by(desc("viewCount"), desc("createdAt"), desc("id"))`, `case "views" -> VIEWS`, 문구 교체, `toPage`에서 `p.getViewCount()`.
- [ ] **Step 4: 통과 확인** — `./gradlew test` 전체 PASS.
- [ ] **Step 5: 커밋** — `git commit -m "Show view counts in lists and sort by views"`

### Task 3: 오래된 조회 기록 정리 (서버)

**Files:**
- Create: `backend/src/main/java/com/aram/community/post/PostViewCleanupJob.java`
- Test: `backend/src/test/java/com/aram/community/post/PostViewCleanupJobTest.java`

**Interfaces:**
- Consumes: Task 1의 `post_views`, `PostViewCounter.kstDate`.
- Produces: `PostViewCleanupJob`(`@Component`): `@Scheduled(cron = "0 30 4 * * *", zone = "Asia/Seoul") void run()`(지운 수가 있으면 INFO `Removed {} old post view records`), `@Transactional int cleanup(LocalDate today)` — `delete from post_views where view_date < today - 1일`, 지운 행 수 반환. 스케줄링은 이미 켜져 있다(`ImageCleanupJob`이 쓰는 중).

- [ ] **Step 1: 실패하는 테스트 쓰기** — `PostViewCleanupJobTest extends IntegrationTest`: 글 하나에 `view_date` 그저께·어제·오늘 행 3개와 `view_count = 3`을 직접 넣고 `cleanup(오늘)` → 반환 1, 남은 날짜는 어제·오늘, `posts.view_count`는 3 그대로.
- [ ] **Step 2: 실패 확인** — `./gradlew test --tests "*PostViewCleanupJobTest"` → 컴파일 실패.
- [ ] **Step 3: 구현** — 위 Interfaces 그대로(JdbcTemplate). `run()`은 `cleanup(PostViewCounter.kstDate(Instant.now()))`.
- [ ] **Step 4: 통과 확인** — `./gradlew test` 전체 PASS.
- [ ] **Step 5: 커밋** — `git commit -m "Clear post view records older than yesterday"`

### Task 4: 화면 — 조회수 표시와 조회순

**Files:**
- Modify: `frontend/src/api/types.ts:109-124` (`PostListItem`·`PostDetail`에 `viewCount: number`)
- Modify: `frontend/src/api/posts.ts:5` (`PostSort = 'latest' | 'likes' | 'views'`)
- Modify: `frontend/src/components/SortPills.tsx` (세 번째 `{ value: 'views', label: '조회순' }`, 주석 갱신)
- Modify: `frontend/src/components/PostList.tsx:22` (주소 `sort`를 세 값 중 하나로 읽기)
- Modify: `frontend/src/components/tags/TagPostsPanel.tsx:49` (주소 `order`를 세 값 중 하나로 읽기)
- Modify: `frontend/src/components/PostListItem.tsx:61-65,90` (일반 줄 `댓글 n` 뒤 `조회 n`; 좁은 줄(`CompactRow`)은 시간 옆에 같은 `hidden sm:inline` 모양으로 `조회 n`)
- Modify: `frontend/src/pages/PostDetailPage.tsx:64-66` (시간·수정됨 뒤, 패치 묶음 앞에 `<span>조회 n</span>`)
- Modify: `frontend/src/test/fixtures.ts:60-70` (`listItem` 기본 `viewCount: 31`), `frontend/src/pages/PostDetailPage.test.tsx:28`·`frontend/src/pages/WritePage.test.tsx:33`의 글 자료에 `viewCount`
- Create: `frontend/src/lib/formatCount.ts` (`export function formatCount(n: number): string` → `n.toLocaleString('ko-KR')`)
- Test: `frontend/src/components/PostListItem.test.tsx`, `frontend/src/pages/PostDetailPage.test.tsx`, `frontend/src/pages/HomePage.test.tsx`, `frontend/src/components/tags/TagPostsPanel.test.tsx`

**Interfaces:**
- Consumes: Task 1·2 API의 `viewCount`, `sort=views`.

- [ ] **Step 1: 실패하는 테스트 쓰기**
  - `PostListItem.test.tsx` 기존 "shows tags…" 테스트에 `expect(screen.getByText('조회 31')).toBeInTheDocument()`; 새 테스트 `formats large view counts` — `listItem({ viewCount: 1234 })` → `조회 1,234`.
  - `PostDetailPage.test.tsx`: 글 자료 `viewCount: 12` → `조회 12`가 보인다.
  - `HomePage.test.tsx`: `switches to 조회순 and updates the URL` — 추천순 테스트와 같은 모양으로 `sort=views` 요청·주소·`aria-pressed`. 그리고 `/?sort=views`로 열면 첫 요청이 `sort=views`.
  - `TagPostsPanel.test.tsx`: `조회순`을 누르면 요청 `sort=views`, 주소 `order=views`.
- [ ] **Step 2: 실패 확인** — `cd frontend && npx vitest run src/components/PostListItem.test.tsx src/pages/PostDetailPage.test.tsx src/pages/HomePage.test.tsx src/components/tags/TagPostsPanel.test.tsx` → FAIL.
- [ ] **Step 3: 구현** — 위 Files 그대로. 글자 모양은 옆 글자와 같은 13 `text-ink-3`(이미 감싼 요소가 정함). 주소 값 읽기는 `(['likes', 'views'] as const).includes(...)` 꼴로 두 곳이 같은 규칙.
- [ ] **Step 4: 통과 확인** — `npm test && npm run build && npm run lint` 모두 PASS.
- [ ] **Step 5: 커밋** — `git commit -m "Show view counts and a views sort on screen"`

### Task 5: 브라우저 확인과 문서

**Files:**
- Modify: `CLAUDE.md` (구조 문단은 그대로, "기술 주의사항"에 조회수 한 줄: `post_views`·하루 한 번·`ARAM_VIEWER`·`view_count`는 SQL로만 올림·정리 작업. "완료"에 2026-10-26 조회수 항목과 설계·계획 경로)

- [ ] **Step 1: 서버 다시 띄우기** — 8080에 남은 `com.aram.community.BackendApplication` 프로세스를 정리하고 `./gradlew bootRun`(V13 적용 로그 확인), 화면은 `.claude/launch.json`의 `frontend` 미리보기.
- [ ] **Step 2: 확인** — 개발 로그인(`POST /api/dev/login`, `X-XSRF-TOKEN`)으로 사람 A가 글을 쓰고, 사람 B로 그 글을 열면 `조회 1`, 새로고침해도 1, 추천을 눌러도 1. A로 열면 그대로. 로그인 안 한 창(다른 브라우저 탭에서 쿠키 없이)으로 열면 2. 글 목록 줄과 증강 탭 펼침 목록에 `조회 n`, 조회순 정렬이 맞게 바뀐다. 글 화면 스크린샷을 남긴다.
- [ ] **Step 3: CLAUDE.md 고치기** 후 커밋 — `git commit -m "Document view counts"`
