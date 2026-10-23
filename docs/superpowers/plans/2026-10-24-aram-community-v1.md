# 증강 칼바람 커뮤니티 v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 친구들이 디스코드로 로그인해 증강 칼바람 글을 쓰고, 챔피언·증강 태그로 모아 보고, 댓글과 추천을 남기는 v1 커뮤니티를 완성한다.

**Architecture:** Spring Boot 백엔드가 `/api`로 JSON을 주고, React(Vite) 앱이 같은 주소에서 화면을 그린다. 백엔드는 기능별 패키지(`auth`, `user`, `gamedata`, `post`, `image`, `comment`, `like`, `common`)로 나누고, 테이블은 기능마다 Flyway 마이그레이션 하나씩 추가한다. 게임 데이터는 예약 작업이 Data Dragon과 CommunityDragon에서 받아온다.

**Tech Stack:** Spring Boot 4.1, Java 21, Spring Data JPA(Hibernate 7), Flyway, PostgreSQL 18, Spring Security OAuth2 Client, Jackson 3, Testcontainers / React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query 5, Tiptap 3, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-24-aram-community-v1-design.md`

## Global Constraints

- 모든 테이블 변경은 `backend/src/main/resources/db/migration/V{n}__*.sql`로만 한다. Hibernate는 `ddl-auto: validate`.
- 오류 응답 형식: `{ "code": "...", "message": "...", "fieldErrors": { ... } }`. 메시지는 한국어, 화면에 그대로 보여줄 수 있는 문장.
- 화면 문구는 모두 한국어 해요체.
- 목록 페이지 크기 20, 페이지는 1부터.
- 제목 1~100자, 본문 글자 1~10,000자, 챔피언 태그 0~5개, 증강 태그 0~10개, 이미지 한 장 10MB 이하·한 글 10장 이하, 댓글 1~1,000자, 닉네임 2~12자(한글·영문·숫자·밑줄, 대소문자 무시 유니크).
- 본문 허용 노드: `doc, paragraph, text, hardBreak, bulletList, orderedList, listItem, blockquote, image`. 허용 마크: `bold, italic`.
- 이미지 형식: jpg, png, webp, gif (파일 앞부분 바이트로 확인).
- 시간 표시: 1분 미만 "방금", 1시간 미만 "N분 전", 24시간 미만 "N시간 전", 7일 미만 "N일 전", 이후 "2026.10.24".
- 게임 패치 표기: Data Dragon `A.B.x` → `(A+10).B`. 예: `16.21.1` → `26.21`.
- Spring Boot 4의 JSON은 Jackson 3(`tools.jackson.*`)이다. 어노테이션은 여전히 `com.fasterxml.jackson.annotation.*`.
- 비밀 값은 `backend/.env`(git 제외)에서 `spring.config.import: optional:file:.env[.properties]`로 읽는다.
- Docker Desktop은 사용자가 켠다. 에이전트가 Docker Desktop을 실행하지 않는다.

**스펙에 없는 추가 1건:** 로컬 확인용 개발 로그인(`POST /api/dev/login`). 기본 꺼짐이고 `APP_DEV_LOGIN_ENABLED=true`일 때만 등록된다. 디스코드 계정 없이 에이전트가 브라우저에서 기능을 확인하기 위함이다. 운영 배포 설정에서는 켜지 않는다.

## Review Focus

1. **추천 버튼 연타**: 같은 사용자가 추천 PUT을 빠르게 두 번 보내도 `like_count`는 1이고 오류가 나지 않아야 한다. → Task 9 테스트.
2. **글 작성 중 세션 만료**: 등록 시 401이 와도 입력한 제목·본문·태그가 사라지지 않고 로그인 안내만 떠야 한다. → Task 13 테스트.
3. **공백만 있는 입력**: 제목·댓글·닉네임이 공백뿐이면 400이고, 앞뒤 공백은 잘라서 저장한다. → Task 2(닉네임), Task 5(제목), Task 8(댓글) 테스트.
4. **디스코드 프로필 일부 없음**: `avatar`나 `global_name`이 null인 계정도 로그인되고, 닉네임 기본값은 `username`, 프로필 사진은 null이다. → Task 2 테스트.
5. **이미지 파일이 디스크에 없음**: DB에는 있는데 파일이 없으면 이미지 요청은 404, 글 삭제와 정리 작업은 실패하지 않아야 한다. → Task 7 테스트.

---

## File Structure

### Backend (`backend/src/main/java/com/aram/community/`)

| 파일 | 책임 |
|---|---|
| `common/ErrorCode.java` | 오류 코드, HTTP 상태, 한국어 메시지 |
| `common/ApiException.java` | `ErrorCode`를 담는 런타임 예외 |
| `common/ErrorResponse.java` | 오류 응답 record |
| `common/GlobalExceptionHandler.java` | 예외 → `ErrorResponse` |
| `common/PageResponse.java` | 목록 응답 record |
| `common/SchedulingConfig.java` | `app.scheduling.enabled`일 때만 `@EnableScheduling` |
| `auth/SecurityConfig.java` | 접근 규칙, oauth2Login, CSRF, 401 JSON, 로그아웃 |
| `auth/AppUserPrincipal.java` | 로그인 사용자 principal (`OAuth2User` 구현) |
| `auth/DiscordOAuth2UserService.java` | 디스코드 사용자 정보 → 사용자 생성·갱신 |
| `auth/LoginSuccessHandler.java` | 로그인 후 `/welcome` 또는 `/auth/done`으로 이동 |
| `auth/MeController.java` | `/api/me`, `/api/me/nickname` |
| `auth/DevLoginController.java` | 개발 로그인 (조건부) |
| `auth/CurrentUser.java` | principal에서 로그인·닉네임 요구 검사 헬퍼 |
| `user/User.java`, `user/Role.java`, `user/UserRepository.java`, `user/UserService.java` | 사용자 |
| `gamedata/*` | 챔피언·증강·패치 엔티티, 조회 API, 외부 클라이언트, 동기화 |
| `post/*` | 글 엔티티, 본문 검증, 작성·수정·삭제·조회·목록 |
| `image/*` | 이미지 엔티티, 저장소, 업로드·제공·연결·정리 |
| `comment/*` | 댓글 |
| `like/*` | 추천 |

### Frontend (`frontend/src/`)

| 파일 | 책임 |
|---|---|
| `api/client.ts` | `apiFetch<T>()`, `ApiError`, CSRF 헤더 |
| `api/types.ts` | 응답 타입 |
| `api/me.ts`, `api/posts.ts`, `api/comments.ts`, `api/gamedata.ts`, `api/images.ts` | API 함수와 쿼리 훅 |
| `lib/relativeTime.ts` | 시간 표시 규칙 |
| `lib/returnTo.ts` | 로그인 후 돌아갈 주소 저장 |
| `components/Header.tsx` | 위쪽 메뉴 |
| `components/PostListItem.tsx`, `Pagination.tsx`, `SortPills.tsx`, `TagChip.tsx`, `PostList.tsx` | 목록 부품 |
| `components/TagPicker.tsx` | 챔피언·증강 검색 선택기 |
| `components/Toast.tsx` | 화면 위 알림 |
| `editor/extensions.ts` | 허용 노드·마크만 담은 Tiptap 확장 목록 |
| `editor/PostEditor.tsx` | 편집기 + 이미지 붙여넣기·끌어놓기·버튼 |
| `editor/PostContentView.tsx` | 읽기 전용 표시기 |
| `pages/HomePage.tsx`, `TagPage.tsx`, `PostDetailPage.tsx`, `WritePage.tsx`, `WelcomePage.tsx`, `AuthDonePage.tsx`, `NotFoundPage.tsx` | 화면 |
| `routes.tsx`, `App.tsx` | 라우팅, 닉네임 미설정 시 `/welcome` 강제 |
| `test/render.tsx`, `test/mockApi.ts` | 테스트 헬퍼 |

---

### Task 1: 오류 형식, 보안 뼈대, 통합 테스트 기반

**Files:**
- Create: `backend/src/main/java/com/aram/community/common/{ErrorCode,ApiException,ErrorResponse,GlobalExceptionHandler,PageResponse,SchedulingConfig}.java`
- Create: `backend/src/main/java/com/aram/community/auth/SecurityConfig.java`
- Modify: `backend/build.gradle` (add `spring-boot-starter-security`, `spring-boot-starter-oauth2-client`, test `spring-security-test`)
- Modify: `backend/src/main/resources/application.yml`
- Create: `backend/src/test/resources/application-test.yml`
- Create: `backend/src/test/java/com/aram/community/support/IntegrationTest.java`
- Create: `backend/src/test/java/com/aram/community/support/ProbeController.java` (테스트 전용)
- Test: `backend/src/test/java/com/aram/community/common/ErrorHandlingTest.java`
- Modify: `backend/src/test/java/com/aram/community/status/StatusControllerTest.java` (extend `IntegrationTest`)

**Interfaces:**
- Produces:
  - `enum ErrorCode { UNAUTHORIZED(401,"로그인이 필요해요"), FORBIDDEN(403,"권한이 없어요"), NICKNAME_REQUIRED(403,"닉네임을 먼저 정해주세요"), INVALID_INPUT(400,"입력값을 확인해주세요"), POST_NOT_FOUND(404,"글을 찾을 수 없어요"), COMMENT_NOT_FOUND(404,"댓글을 찾을 수 없어요"), IMAGE_NOT_FOUND(404,"이미지를 찾을 수 없어요"), NICKNAME_TAKEN(409,"이미 쓰고 있는 닉네임이에요"), NOT_FOUND(404,"찾을 수 없어요"), IMAGE_TOO_LARGE(413,"이미지는 10MB 이하만 올릴 수 있어요"), UNSUPPORTED_IMAGE(400,"jpg, png, webp, gif 이미지만 올릴 수 있어요"), INTERNAL_ERROR(500,"잠시 후 다시 시도해주세요") }` with `int status()`, `String message()`
  - `ApiException(ErrorCode code)`, `ApiException(ErrorCode code, Map<String,String> fieldErrors)`
  - `record ErrorResponse(String code, String message, Map<String,String> fieldErrors)` — `fieldErrors` omitted from JSON when null (`@JsonInclude(NON_NULL)`)
  - `record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages)` with `static <T> PageResponse<T> of(Page<T> page)` (converts 0-based Spring page to 1-based)
  - `abstract class IntegrationTest` (`@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Import(TestcontainersConfiguration.class)`): fields `MockMvc mockMvc`, `JdbcTemplate jdbc`; `@BeforeEach void cleanDatabase()` truncates every table in schema `public` except `flyway_schema_history` with `RESTART IDENTITY CASCADE`
- Security rules (later tasks rely on these): `GET /api/**` permitAll; `POST /api/dev/login` permitAll; `/oauth2/**`, `/login/oauth2/**` permitAll; any other `/api/**` authenticated; unauthenticated `/api/**` → 401 `ErrorResponse(UNAUTHORIZED)`; access denied → 403 `ErrorResponse(FORBIDDEN)`. CSRF: cookie `XSRF-TOKEN` (not HttpOnly), header `X-XSRF-TOKEN`, SPA mode (`csrf.spa()`). Logout: `POST /api/logout` → 204.
- `application.yml` additions: `spring.config.import: optional:file:.env[.properties]`, `server.servlet.session.timeout: 30d`, `server.servlet.session.cookie.max-age: 30d`, `spring.servlet.multipart.max-file-size: 10MB`, `spring.servlet.multipart.max-request-size: 11MB`, `app.scheduling.enabled: true`. `application-test.yml`: `app.scheduling.enabled: false`.

- [ ] **Step 1: Add dependencies and write the failing tests**

`ProbeController` (test sources only) exposes `GET /api/probe/not-found` (throws `ApiException(POST_NOT_FOUND)`), `POST /api/probe/echo` (body `record Echo(@NotBlank(message="제목을 입력해주세요") String title)`, returns it), `GET /api/probe/boom` (throws `IllegalStateException`).

```java
class ErrorHandlingTest extends IntegrationTest {
  @Test void apiExceptionBecomesErrorResponse() throws Exception {
    mockMvc.perform(get("/api/probe/not-found"))
      .andExpect(status().isNotFound())
      .andExpect(jsonPath("$.code").value("POST_NOT_FOUND"))
      .andExpect(jsonPath("$.message").value("글을 찾을 수 없어요"))
      .andExpect(jsonPath("$.fieldErrors").doesNotExist());
  }
  @Test void unauthenticatedWriteIs401Json() throws Exception {
    mockMvc.perform(post("/api/probe/echo").with(csrf()).contentType(JSON).content("{\"title\":\"a\"}"))
      .andExpect(status().isUnauthorized())
      .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }
  @Test void missingCsrfIs403() throws Exception {
    mockMvc.perform(post("/api/probe/echo").with(user("u")).contentType(JSON).content("{\"title\":\"a\"}"))
      .andExpect(status().isForbidden());
  }
  @Test void validationErrorsListFields() throws Exception {
    mockMvc.perform(post("/api/probe/echo").with(user("u")).with(csrf()).contentType(JSON).content("{\"title\":\" \"}"))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.code").value("INVALID_INPUT"))
      .andExpect(jsonPath("$.fieldErrors.title").value("제목을 입력해주세요"));
  }
  @Test void unexpectedErrorIs500WithoutDetails() throws Exception {
    mockMvc.perform(get("/api/probe/boom"))
      .andExpect(status().isInternalServerError())
      .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
      .andExpect(jsonPath("$.message").value("잠시 후 다시 시도해주세요"));
  }
  @Test void statusEndpointStillPublic() throws Exception {
    mockMvc.perform(get("/api/status")).andExpect(status().isOk());
  }
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && ./gradlew test --tests '*ErrorHandlingTest'`
Expected: FAIL (compile errors: `ApiException`, `IntegrationTest` missing)

- [ ] **Step 3: Implement the common classes, `SecurityConfig`, `SchedulingConfig`, config files, and `IntegrationTest`**

`GlobalExceptionHandler` maps: `ApiException` → its code; `MethodArgumentNotValidException` and `HandlerMethodValidationException` → `INVALID_INPUT` with `fieldErrors` (first message per field); `HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException`, `MissingServletRequestParameterException` → `INVALID_INPUT`; `MaxUploadSizeExceededException` → `IMAGE_TOO_LARGE`; `NoResourceFoundException` → `NOT_FOUND`; `HttpRequestMethodNotSupportedException` → `NOT_FOUND`; anything else → `INTERNAL_ERROR` (log the exception with stack trace). The Discord client registration is added in Task 2; until then `oauth2Login` is not configured.

- [ ] **Step 4: Run all backend tests**

Run: `cd backend && ./gradlew test`
Expected: PASS (ErrorHandlingTest 6, StatusControllerTest 1, BackendApplicationTests 1)

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "Add API error format, security baseline, and integration test base"
```

---

### Task 2: 사용자, 디스코드 로그인, 닉네임, 개발 로그인

**Files:**
- Create: `backend/src/main/resources/db/migration/V1__users.sql`
- Create: `user/{User,Role,UserRepository,UserService}.java`
- Create: `auth/{AppUserPrincipal,DiscordOAuth2UserService,LoginSuccessHandler,MeController,DevLoginController,CurrentUser}.java`
- Modify: `auth/SecurityConfig.java`, `application.yml`
- Create: `backend/.env.example`; Modify: `backend/.gitignore` (add `.env`, `data/`)
- Create: `backend/src/test/java/com/aram/community/support/TestUsers.java`
- Test: `auth/DiscordOAuth2UserServiceTest.java`, `auth/MeControllerTest.java`, `auth/DevLoginControllerTest.java`

**Interfaces:**
- Consumes: Task 1 `ApiException`, `ErrorCode`, `IntegrationTest`.
- Produces:
  - Table `users(id bigserial pk, discord_id varchar(32) unique not null, nickname varchar(12), avatar_url varchar(255), role varchar(10) not null, created_at timestamptz not null)` + unique index on `lower(nickname)`.
  - `enum Role { USER, ADMIN }`
  - `User` entity: `Long getId()`, `String getDiscordId()`, `String getNickname()`, `String getAvatarUrl()`, `Role getRole()`, `boolean isAdmin()`, `Instant getCreatedAt()`
  - `UserService.upsertFromDiscord(String discordId, String avatarUrl): User` (role recomputed from `app.admin-discord-ids`), `UserService.changeNickname(long userId, String raw): User` (trim → validate pattern `^[가-힣A-Za-z0-9_]{2,12}$` → `INVALID_INPUT` with `fieldErrors.nickname="닉네임은 2~12자 한글, 영문, 숫자, 밑줄만 쓸 수 있어요"`; case-insensitive duplicate → `NICKNAME_TAKEN`)
  - `AppUserPrincipal implements OAuth2User`: `long userId()`, `String discordDefaultName()`; attributes are the Discord map.
  - `CurrentUser.require(AppUserPrincipal p): User` (null → `UNAUTHORIZED`), `CurrentUser.requireWithNickname(AppUserPrincipal p): User` (nickname null → `NICKNAME_REQUIRED`). Later controllers take `@AuthenticationPrincipal AppUserPrincipal principal` and call these.
  - `GET /api/me` → `null` body when anonymous; otherwise `{ id, nickname, avatarUrl, admin, suggestedNickname }` (`suggestedNickname` = Discord `global_name` ?? `username`, only for the welcome screen).
  - `PUT /api/me/nickname` body `{ nickname }` → same shape as `/api/me`.
  - `POST /api/dev/login` body `{ discordId, nickname }` — only when `app.dev-login.enabled=true`; upserts the user, sets nickname, and stores an authenticated `OAuth2AuthenticationToken` with `AppUserPrincipal` in the session. Returns `/api/me` shape.
  - Login success: redirect to `/welcome` if nickname is null, else `/auth/done`.
  - `TestUsers` (test support, Spring bean): `User create(String nickname)`, `User createAdmin(String nickname)`, `User createWithoutNickname()`, `RequestPostProcessor as(User u)` (builds `OAuth2AuthenticationToken` with `AppUserPrincipal` + `csrf()`).
- Config: Discord registration `spring.security.oauth2.client.registration.discord` (client-id `${DISCORD_CLIENT_ID:local-placeholder}`, client-secret `${DISCORD_CLIENT_SECRET:local-placeholder}`, `authorization-grant-type: authorization_code`, `redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"`, scope `identify`) and provider (`authorization-uri: https://discord.com/oauth2/authorize`, `token-uri: https://discord.com/api/oauth2/token`, `user-info-uri: https://discord.com/api/users/@me`, `user-name-attribute: id`). `app.admin-discord-ids: ${APP_ADMIN_DISCORD_IDS:}` (comma list). `app.dev-login.enabled: ${APP_DEV_LOGIN_ENABLED:false}`. Avatar URL: `https://cdn.discordapp.com/avatars/{id}/{avatar}.png`, null when `avatar` is null.
- `.env.example` lists `DISCORD_CLIENT_ID=`, `DISCORD_CLIENT_SECRET=`, `APP_ADMIN_DISCORD_IDS=`, `APP_DEV_LOGIN_ENABLED=false` with Korean comments.

- [ ] **Step 1: Write the failing tests**

`DiscordOAuth2UserServiceTest` tests the attribute-mapping method directly: `AppUserPrincipal loadFromAttributes(Map<String,Object> attrs)` on `DiscordOAuth2UserService` (the `loadUser` override delegates to it after `DefaultOAuth2UserService` fetches attributes).

```java
@Test void createsUserOnFirstLogin() {
  var p = service.loadFromAttributes(Map.of("id","111","username","yangho","global_name","양호","avatar","abc"));
  User u = users.findById(p.userId()).orElseThrow();
  assertThat(u.getDiscordId()).isEqualTo("111");
  assertThat(u.getAvatarUrl()).isEqualTo("https://cdn.discordapp.com/avatars/111/abc.png");
  assertThat(u.getNickname()).isNull();
  assertThat(p.discordDefaultName()).isEqualTo("양호");
}
@Test void secondLoginReusesUserAndRefreshesAvatar() { /* same id twice, avatar "abc" then "def" → one row, avatar ends with def.png */ }
@Test void missingAvatarAndGlobalNameStillLogsIn() {
  var attrs = new HashMap<String,Object>(); attrs.put("id","222"); attrs.put("username","minsu"); attrs.put("global_name", null); attrs.put("avatar", null);
  var p = service.loadFromAttributes(attrs);
  assertThat(users.findById(p.userId()).orElseThrow().getAvatarUrl()).isNull();
  assertThat(p.discordDefaultName()).isEqualTo("minsu");
}
@Test void adminIdsGetAdminRole() { /* @TestPropertySource app.admin-discord-ids=999 → id "999" isAdmin() true, id "111" false */ }
```

```java
class MeControllerTest extends IntegrationTest {
  @Test void anonymousMeIsNull() { mockMvc.perform(get("/api/me")).andExpect(status().isOk()).andExpect(content().string("")); }
  @Test void loggedInMeReturnsProfile() { /* testUsers.create("양호") → $.nickname "양호", $.admin false */ }
  @Test void setsNicknameTrimmed() { /* createWithoutNickname → PUT {"nickname":"  양호_1 "} → 200 $.nickname "양호_1" */ }
  @Test void rejectsBlankOrInvalidNickname() { /* "   " , "a", "열세글자이상의닉네임입니다", "양 호", "😀😀" → 400 INVALID_INPUT, fieldErrors.nickname present */ }
  @Test void rejectsDuplicateIgnoringCase() { /* create("Yangho"); other user PUT "yangho" → 409 NICKNAME_TAKEN */ }
  @Test void keepingOwnNicknameIsAllowed() { /* create("양호") PUT "양호" → 200 */ }
  @Test void logoutReturns204() { /* POST /api/logout as user with csrf → 204 */ }
}
class DevLoginControllerTest extends IntegrationTest {
  // default test profile: disabled
  @Test void devLoginIsNotRegisteredByDefault() { /* POST /api/dev/login with csrf → 404 NOT_FOUND */ }
}
@TestPropertySource(properties = "app.dev-login.enabled=true")
class DevLoginEnabledTest extends IntegrationTest {
  @Test void devLoginCreatesSession() { /* POST {"discordId":"dev-1","nickname":"테스터"} with csrf → 200; reuse returned MockHttpSession on GET /api/me → $.nickname "테스터" */ }
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && ./gradlew test --tests '*auth*'`
Expected: FAIL (missing classes / table)

- [ ] **Step 3: Implement migration, user package, auth package, config, `.env.example`, `TestUsers`**

`DevLoginController` uses `@ConditionalOnProperty(name="app.dev-login.enabled", havingValue="true")`. It saves the security context with `HttpSessionSecurityContextRepository`.

- [ ] **Step 4: Run all backend tests**

Run: `cd backend && ./gradlew test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend && git commit -m "Add users, Discord login, nickname setup, and dev login"
```

---

### Task 3: 게임 데이터 모델과 조회 API

**Files:**
- Create: `db/migration/V2__game_data.sql`
- Create: `gamedata/{Champion,Augment,Patch,GameDataState}.java` + repositories, `gamedata/GameDataService.java`, `gamedata/GameDataController.java`, `gamedata/GamePatches.java`
- Test: `gamedata/GameDataControllerTest.java`, `gamedata/GamePatchesTest.java`

**Interfaces:**
- Produces:
  - Tables exactly as spec §6 `champions`, `augments`, `patches`, `game_data_state` (seed row `id=1` with nulls in the migration).
  - `GamePatches.toGamePatch(String ddragonVersion): String` (`"16.21.1"` → `"26.21"`, `"15.3.1"` → `"25.3"`; invalid → `IllegalArgumentException`)
  - `GameDataService`: `String championImageUrl(String imageFile)` (null when no current version), `String augmentIconUrl(String iconPath)` (`https://raw.communitydragon.org/latest/game/` + path), `Optional<String> currentGamePatch()`, `List<String> selectablePatches()` (top 8 by `released_order` desc), `ChampionDto toDto(Champion)`, `AugmentDto toDto(Augment)`
  - `record ChampionDto(String id, String nameKo, String imageUrl)`, `record AugmentDto(String id, String nameKo, String iconUrl, boolean active)`
  - `GET /api/champions` → `ChampionDto[]` sorted by `nameKo`; `GET /api/augments` → `AugmentDto[]` sorted by `nameKo` (includes inactive); `GET /api/patches` → `{ current: "26.21" | null, patches: ["26.21", ...] }`

- [ ] **Step 1: Write the failing tests**

```java
class GamePatchesTest {
  @Test void convertsDdragonVersion() { assertThat(GamePatches.toGamePatch("16.21.1")).isEqualTo("26.21"); assertThat(GamePatches.toGamePatch("15.3.1")).isEqualTo("25.3"); }
  @Test void rejectsGarbage() { assertThatThrownBy(() -> GamePatches.toGamePatch("lolpatch_7.20")).isInstanceOf(IllegalArgumentException.class); }
}
class GameDataControllerTest extends IntegrationTest {
  // seed via jdbc: state current_ddragon_version '16.21.1'; champions Amumu/아무무/Amumu.png, Jinx/징크스/Jinx.png;
  // augments ARAM_LegDay/하체 운동의 날/assets/ux/cherry/augments/icons/legday_small.png active, Old/옛 증강/x.png inactive;
  // patches 9 rows released_order 1..9 (16.13.1 .. 16.21.1)
  @Test void listsChampionsByName() { /* $[0].nameKo "아무무", $[0].imageUrl "https://ddragon.leagueoflegends.com/cdn/16.21.1/img/champion/Amumu.png" */ }
  @Test void listsAugmentsIncludingInactive() { /* length 2, inactive one has active=false, iconUrl "https://raw.communitydragon.org/latest/game/assets/ux/cherry/augments/icons/legday_small.png" */ }
  @Test void patchesReturnsCurrentAndTopEight() { /* $.current "26.21", $.patches length 8, $.patches[0] "26.21", $.patches[7] "26.14" */ }
  @Test void emptyStateIsSafe() { /* no seed → champions [], patches.current null, patches.patches [] */ }
}
```

- [ ] **Step 2: Run to verify failure** — `./gradlew test --tests '*gamedata*'` → FAIL
- [ ] **Step 3: Implement migration, entities, repositories, service, controller**
- [ ] **Step 4: Run all backend tests** — `./gradlew test` → PASS
- [ ] **Step 5: Commit** — `git commit -m "Add game data tables and read APIs"`

---

### Task 4: 게임 데이터 자동 동기화

**Files:**
- Create: `gamedata/GameDataClient.java`, `gamedata/GameDataSyncService.java`, `gamedata/GameDataSyncScheduler.java`, `gamedata/GameDataProperties.java`
- Modify: `application.yml` (`app.gamedata.ddragon-base-url: https://ddragon.leagueoflegends.com`, `app.gamedata.cdragon-base-url: https://raw.communitydragon.org`, timeouts 30s)
- Create fixtures: `backend/src/test/resources/gamedata/{versions.json,champion.json,kiwi.bin.json,kiwi-small.bin.json,stringtable.json}`
- Test: `gamedata/GameDataSyncServiceTest.java`

**Interfaces:**
- Consumes: Task 3 entities, `GamePatches`.
- Produces:
  - `GameDataClient` (uses `RestClient` built from an injected `RestClient.Builder`): `List<String> fetchVersions()`, `List<ChampionData> fetchChampions(String ddragonVersion)`, `List<AugmentData> fetchAugments()`; records `ChampionData(String id, String nameKo, String imageFile)`, `AugmentData(String id, String nameKo, String iconPath)`.
    - Champions URL: `{ddragon}/cdn/{version}/data/ko_KR/champion.json`, fields `data.*.id`, `name`, `image.full`.
    - Augments: `{cdragon}/latest/game/maps/modespecificdata/kiwi.bin.json` entries with `__type == "AugmentData"`; names from `{cdragon}/latest/game/ko_kr/data/menu/en_us/lol.stringtable.json` `entries[NameTra]` (case-insensitive key lookup); skip entries without a Korean name; `iconPath` = `AugmentSmallIconPath` lowercased with `.tex` → `.png`.
  - `GameDataSyncService.sync(): SyncResult` where `enum SyncResult { UPDATED, UNCHANGED, FAILED }`. Algorithm per spec §11: upsert top 8 versions into `patches` (`released_order` larger = newer, never delete); if latest differs from state or champions/augments empty → champions (one transaction) then augments (one transaction; fewer than 20 → treat as failure); only after both succeed set `current_ddragon_version`, `current_game_patch`, `last_synced_at`, clear `last_error`. Always set `last_checked_at`. Any exception → `last_error` = message, return `FAILED`, existing rows untouched.
  - `GameDataSyncScheduler`: runs `sync()` on `ApplicationReadyEvent` and `@Scheduled(fixedDelayString = "PT6H", initialDelayString = "PT6H")`; whole bean `@ConditionalOnProperty(name="app.scheduling.enabled", havingValue="true")`.
- Fixtures: `kiwi.bin.json` has 22 `AugmentData` entries with names in `stringtable.json` plus 1 without a name and 3 non-augment objects; `kiwi-small.bin.json` has 5 named entries. `champion.json` has Amumu, Jinx, Lux. `versions.json` has 10 versions starting `16.21.1`. Build them by trimming the real files (spec §11 URLs) with a throwaway script; commit only the fixtures.

- [ ] **Step 1: Write the failing tests**

Bind `MockRestServiceServer` to the `RestClient.Builder` used by `GameDataClient` (expect requests in order; use `ExpectedCount.manyTimes()` where repeated).

```java
@Test void firstSyncFillsEverything() {
  // versions, champions(16.21.1), kiwi, stringtable → UPDATED
  assertThat(champions.count()).isEqualTo(3);
  assertThat(augments.count()).isEqualTo(22);
  assertThat(augments.findById("ARAM_LegDay").orElseThrow().getIconPath()).isEqualTo("assets/ux/cherry/augments/icons/legday_small.png");
  assertThat(state().getCurrentGamePatch()).isEqualTo("26.21");
  assertThat(patchRepo.count()).isEqualTo(8);
}
@Test void sameVersionSkipsHeavyDownloads() { /* after first sync, second sync only hits versions.json → UNCHANGED, server.verify() passes */ }
@Test void missingAugmentBecomesInactiveNotDeleted() { /* seed augment "Gone" active → sync → exists, active=false */ }
@Test void tooFewAugmentsFailsAndKeepsOldData() { /* seed state 16.20.1 + 1 augment; serve kiwi-small → FAILED, augments unchanged, current_ddragon_version still 16.20.1, last_error not null */ }
@Test void championFailureDoesNotAdvanceVersion() { /* champion.json → 500 → FAILED, current version unchanged, champions unchanged */ }
@Test void successClearsPreviousError() { /* seed last_error "x" → successful sync → last_error null */ }
```

- [ ] **Step 2: Run to verify failure** — `./gradlew test --tests '*GameDataSyncServiceTest'` → FAIL
- [ ] **Step 3: Implement client, properties, sync service, scheduler; create fixtures**
- [ ] **Step 4: Run all backend tests** — `./gradlew test` → PASS
- [ ] **Step 5: Manual check against real sources**

Run backend (`./gradlew bootRun`, Docker already running), then `curl -s localhost:8080/api/patches` and `curl -s localhost:8080/api/augments | head -c 400`.
Expected: `current` like `"26.21"`, about 200 augments with Korean names. Stop the server afterwards.

- [ ] **Step 6: Commit** — `git commit -m "Sync champions, patches, and augments from Data Dragon and CommunityDragon"`

---

### Task 5: 글 작성·조회·수정·삭제와 본문 검증

**Files:**
- Create: `db/migration/V3__posts.sql` (tables `posts`, `post_champions`, `post_augments`, `images` per spec §6; FKs `on delete cascade` for tag tables; `images.post_id` FK `on delete set null` — image rows of a deleted post are removed explicitly in Task 7)
- Create: `post/{Post,PostRepository,PostContentValidator,ValidatedContent,PostService,PostController,PostRequest,PostDetailResponse,AuthorDto}.java`
- Test: `post/PostContentValidatorTest.java`, `post/PostApiTest.java`

**Interfaces:**
- Consumes: `CurrentUser`, `TestUsers`, `GameDataService.toDto`, Task 3 repositories.
- Produces:
  - `PostContentValidator.validate(String contentJson): ValidatedContent` → `record ValidatedContent(String normalizedJson, String plainText, List<UUID> imageIds)`. Rejects (→ `ApiException(INVALID_INPUT, {content: ...})`): unparsable JSON, root not `doc`, node type or mark outside the allowlist, image `src` not matching `^/api/images/([0-9a-f-]{36})$`, more than 10 images, `plainText` (trimmed) empty or longer than 10,000 chars. Messages: `"본문을 입력해주세요"`, `"본문은 10,000자 이하로 써주세요"`, `"이미지는 한 글에 10장까지 넣을 수 있어요"`, `"지원하지 않는 본문 형식이에요"`.
  - `record PostRequest(@NotBlank(message="제목을 입력해주세요") @Size(max=100, message="제목은 100자 이하로 써주세요") String title, @NotNull JsonNode content, List<String> championIds, List<String> augmentIds, @NotBlank String gamePatch)` — title trimmed in service; content serialized to string before validation.
  - `PostService`: `long create(User author, PostRequest req)`, `void update(User actor, long postId, PostRequest req)` (author only → else `FORBIDDEN`), `void delete(User actor, long postId)` (author or admin), `PostDetailResponse get(long postId, Long viewerId)`; tag rules: dedupe, ≤5 champions / ≤10 augments (`fieldErrors.championIds` / `augmentIds`), unknown id → `INVALID_INPUT`, newly added augment must be active, already-attached inactive augment may stay; `gamePatch` must exist in `patches`.
  - Hook for Task 7: `PostService` calls `ImagePostLinker.link(long postId, long uploaderId, List<UUID> imageIds)` and `ImagePostLinker.deleteForPost(long postId)` — define interface `post/ImagePostLinker` here with a no-op implementation `post/NoopImagePostLinker` (`@ConditionalOnMissingBean`-style replaced in Task 7).
  - `Post.content` column `jsonb`, entity field `String content` with `@JdbcTypeCode(SqlTypes.JSON)`, saved from `ValidatedContent.normalizedJson`. `Post.contentText` (`content_text`) is saved from `ValidatedContent.plainText`.
  - `record PostDetailResponse(long id, String title, @JsonRawValue String content, String gamePatch, AuthorDto author, List<ChampionDto> champions, List<AugmentDto> augments, int likeCount, int commentCount, boolean likedByMe, Instant createdAt, Instant updatedAt, boolean edited)`; `record AuthorDto(long id, String nickname, String avatarUrl)`. `edited` = `updatedAt` after `createdAt` by more than 1 second. `likedByMe` is false until Task 9.
  - Endpoints: `POST /api/posts` → 201 `{ "id": n }`; `GET /api/posts/{id}`; `PUT /api/posts/{id}` → 204; `DELETE /api/posts/{id}` → 204. Writes require nickname (`requireWithNickname`).

- [ ] **Step 1: Write the failing tests**

```java
class PostContentValidatorTest {
  @Test void acceptsAllowedNodesAndExtractsText() { /* doc>paragraph>text "안녕 " bold + bulletList>listItem>paragraph>text "목록" → plainText contains "안녕" and "목록" */ }
  @Test void rejectsDisallowedNode() { /* heading → INVALID_INPUT fieldErrors.content "지원하지 않는 본문 형식이에요" */ }
  @Test void rejectsDisallowedMark() { /* text with mark "link" → INVALID_INPUT */ }
  @Test void rejectsForeignImageSrc() { /* image src "https://evil.example/x.png" → INVALID_INPUT */ }
  @Test void collectsImageIds() { /* two image nodes with /api/images/{uuid} → imageIds size 2 */ }
  @Test void rejectsElevenImages() { /* 11 image nodes → "이미지는 한 글에 10장까지 넣을 수 있어요" */ }
  @Test void rejectsWhitespaceOnlyBody() { /* paragraph text "   " → "본문을 입력해주세요" */ }
  @Test void rejectsTooLongBody() { /* 10,001 chars → "본문은 10,000자 이하로 써주세요" */ }
}
class PostApiTest extends IntegrationTest {
  // seed game data: patches 26.21 & 26.20, champion Amumu, augments A1 active, OLD inactive
  @Test void createAndReadPost() { /* POST title "  아무무 추천 " → 201; GET → $.title "아무무 추천", $.content.type "doc", $.champions[0].id "Amumu", $.gamePatch "26.21", $.author.nickname, $.edited false */ }
  @Test void anonymousCannotCreate() { /* 401 */ }
  @Test void userWithoutNicknameCannotCreate() { /* 403 NICKNAME_REQUIRED */ }
  @Test void blankTitleRejected() { /* "   " → 400 fieldErrors.title "제목을 입력해주세요" */ }
  @Test void unknownPatchRejected() { /* "99.1" → 400 */ }
  @Test void tooManyChampionsRejected() { /* 6 ids → 400 fieldErrors.championIds */ }
  @Test void duplicateTagsCollapse() { /* ["Amumu","Amumu"] → champions length 1 */ }
  @Test void inactiveAugmentCannotBeNewlyAdded() { /* ["OLD"] on create → 400 */ }
  @Test void inactiveAugmentCanStayOnEdit() { /* insert post with OLD via jdbc; PUT keeping OLD → 204 */ }
  @Test void onlyAuthorCanEdit() { /* other user PUT → 403; admin PUT → 403 */ }
  @Test void authorOrAdminCanDelete() { /* other user DELETE → 403; admin DELETE → 204; GET → 404 POST_NOT_FOUND */ }
  @Test void editMarksEdited() { /* PUT then GET → $.edited true (set updated_at back 1 min via jdbc before PUT check, or compare after PUT with created_at shifted) */ }
}
```

- [ ] **Step 2: Run to verify failure** — `./gradlew test --tests '*post*'` → FAIL
- [ ] **Step 3: Implement migration, validator, entity, service, controller, no-op linker**
- [ ] **Step 4: Run all backend tests** — `./gradlew test` → PASS
- [ ] **Step 5: Commit** — `git commit -m "Add post create, read, update, delete with content validation"`

---

### Task 6: 글 목록, 정렬, 태그 필터

**Files:**
- Create: `post/PostListItem.java`, `post/PostQueryRepository.java` (or methods on `PostRepository`)
- Modify: `post/PostController.java`, `post/PostService.java`
- Test: `post/PostListApiTest.java`

**Interfaces:**
- Consumes: Task 5 entities, `PageResponse.of`.
- Produces:
  - `record PostListItem(long id, String title, String gamePatch, AuthorDto author, List<ChampionDto> champions, List<AugmentDto> augments, int likeCount, int commentCount, Instant createdAt)`
  - `GET /api/posts?sort=latest|likes&page=1&champion={id}&augment={id}` → `PageResponse<PostListItem>`, size 20. `latest` = `created_at desc, id desc`; `likes` = `like_count desc, created_at desc, id desc`. `page < 1` → 400; beyond last page → empty `items`. Unknown `sort` → 400. Both filters → AND. Tags for a page are loaded in two batch queries (no per-post queries).

- [ ] **Step 1: Write the failing tests**

```java
@Test void latestFirstByDefault() { /* create 3 posts → $.items[0].title is newest, $.page 1, $.size 20, $.totalItems 3, $.totalPages 1 */ }
@Test void sortsByLikes() { /* set like_count via jdbc 5,9,1 → order 9,5,1 */ }
@Test void paginatesTwentyPerPage() { /* 21 posts → page 1 has 20, page 2 has 1, totalPages 2 */ }
@Test void pageBeyondEndIsEmpty() { /* page=5 → items [] */ }
@Test void pageZeroRejected() { /* page=0 → 400 */ }
@Test void filtersByChampion() { /* posts tagged Amumu, Jinx, none → champion=Amumu → 1 item, its champions[0].id "Amumu" */ }
@Test void filtersByAugment() { /* similar */ }
@Test void filtersByBothWithAnd() { /* only post with both matches */ }
@Test void listIncludesTagsAndCounts() { /* items[0].augments[0].nameKo, likeCount, commentCount present */ }
```

- [ ] **Step 2: Run to verify failure** — FAIL
- [ ] **Step 3: Implement list query and endpoint**
- [ ] **Step 4: Run all backend tests** — PASS
- [ ] **Step 5: Commit** — `git commit -m "Add post list with sorting, paging, and tag filters"`

---

### Task 7: 이미지 업로드, 제공, 글 연결, 정리

**Files:**
- Create: `image/{Image,ImageRepository,ImageStorage,LocalImageStorage,ImageService,ImageController,ImageCleanupJob,ImageTypes,DbImagePostLinker}.java`
- Modify: `application.yml` (`app.images.dir: data/images`), remove `post/NoopImagePostLinker.java`
- Test: `image/ImageApiTest.java`, `image/ImageTypesTest.java`, `image/ImageLinkingTest.java`, `image/ImageCleanupJobTest.java`

**Interfaces:**
- Consumes: Task 5 `ImagePostLinker`, `images` table.
- Produces:
  - `ImageTypes.detect(byte[] head): Optional<String>` → `image/jpeg` (FF D8 FF), `image/png` (89 50 4E 47 0D 0A 1A 0A), `image/gif` ("GIF87a"/"GIF89a"), `image/webp` ("RIFF" + 4 bytes + "WEBP").
  - `interface ImageStorage { void save(String key, InputStream data); Optional<InputStream> open(String key); void delete(String key); }` — `LocalImageStorage` under `app.images.dir`; `delete` of a missing file is a no-op; `open` of a missing file → empty.
  - `POST /api/images` (multipart field `file`, nickname required) → 201 `{ id, url: "/api/images/{id}" }`. Unsupported type → 400 `UNSUPPORTED_IMAGE`; >10MB → 413 `IMAGE_TOO_LARGE`.
  - `GET /api/images/{id}` → bytes with stored `Content-Type` and `Cache-Control: public, max-age=31536000, immutable`; unknown id or missing file → 404 `IMAGE_NOT_FOUND`.
  - `DbImagePostLinker implements ImagePostLinker`: `link(postId, uploaderId, imageIds)` — every id must exist and belong to `uploaderId` (else `INVALID_INPUT` `fieldErrors.content="올린 적 없는 이미지가 들어 있어요"`); sets `post_id` for those ids and clears `post_id` of this post's other images. `deleteForPost(postId)` deletes rows and files (after commit, missing files ignored).
  - `ImageCleanupJob`: `@Scheduled(cron = "0 0 4 * * *")`, conditional on `app.scheduling.enabled`; public method `int cleanup(Instant now)` deletes images with `post_id is null and created_at < now - 24h`, returns count.

- [ ] **Step 1: Write the failing tests**

```java
class ImageTypesTest { /* each signature detected; "hello" bytes → empty; png bytes named .jpg still → image/png */ }
class ImageApiTest extends IntegrationTest {
  @Test void uploadAndServe() { /* tiny real PNG → 201, url; GET url → 200, Content-Type image/png, Cache-Control contains "immutable", body equals */ }
  @Test void rejectsNonImage() { /* text file with .png name → 400 UNSUPPORTED_IMAGE */ }
  @Test void rejectsOversized() { /* 10MB + 1 byte → 413 IMAGE_TOO_LARGE */ }
  @Test void anonymousCannotUpload() { /* 401 */ }
  @Test void missingFileIs404() { /* upload, delete file from disk, GET → 404 IMAGE_NOT_FOUND */ }
}
class ImageLinkingTest extends IntegrationTest {
  @Test void postLinksOwnImages() { /* upload, create post with image node → images.post_id = post id */ }
  @Test void cannotUseSomeoneElsesImage() { /* user B's image in user A's post → 400 "올린 적 없는 이미지가 들어 있어요" */ }
  @Test void editUnlinksRemovedImages() { /* remove image node on PUT → post_id null */ }
  @Test void deletingPostDeletesImagesEvenIfFileMissing() { /* delete file on disk first; DELETE post → 204, images row gone */ }
}
class ImageCleanupJobTest extends IntegrationTest {
  @Test void removesOnlyOldUnlinkedImages() { /* rows: unlinked 25h old, unlinked 1h old, linked 25h old → cleanup returns 1 */ }
}
```

- [ ] **Step 2: Run to verify failure** — FAIL
- [ ] **Step 3: Implement image package; replace the no-op linker; add `backend/data/` to `.gitignore` if not already**
- [ ] **Step 4: Run all backend tests** — PASS
- [ ] **Step 5: Commit** — `git commit -m "Add image upload, serving, post linking, and cleanup"`

---

### Task 8: 댓글

**Files:**
- Create: `db/migration/V4__comments.sql`
- Create: `comment/{Comment,CommentRepository,CommentService,CommentController,CommentRequest,CommentResponse}.java`
- Test: `comment/CommentApiTest.java`

**Interfaces:**
- Consumes: `CurrentUser`, `AuthorDto`, `posts.comment_count`.
- Produces:
  - `record CommentRequest(@NotBlank(message="댓글을 입력해주세요") @Size(max=1000, message="댓글은 1,000자 이하로 써주세요") String content)` — trimmed before save.
  - `record CommentResponse(long id, AuthorDto author, String content, Instant createdAt, Instant updatedAt, boolean edited)`
  - `GET /api/posts/{postId}/comments` → `CommentResponse[]` oldest first (unknown post → 404 `POST_NOT_FOUND`); `POST /api/posts/{postId}/comments` → 201 `CommentResponse`; `PUT /api/comments/{id}` (author only) → `CommentResponse`; `DELETE /api/comments/{id}` (author or admin) → 204.
  - After create/delete: `update posts set comment_count = (select count(*) from comments where post_id = ?)` in the same transaction.

- [ ] **Step 1: Write the failing tests**

```java
@Test void addAndListComments() { /* two comments → list oldest first, post $.commentCount 2 */ }
@Test void keepsLineBreaksAndTrims() { /* "  첫 줄\n둘째 줄  " → content "첫 줄\n둘째 줄" */ }
@Test void blankCommentRejected() { /* "   " → 400 fieldErrors.content "댓글을 입력해주세요" */ }
@Test void tooLongCommentRejected() { /* 1001 chars → 400 */ }
@Test void onlyAuthorEdits() { /* other → 403, admin → 403, author → 200 edited true */ }
@Test void authorOrAdminDeletes() { /* other → 403; admin → 204; commentCount decreases */ }
@Test void commentsOnMissingPost404() { /* GET/POST on 9999 → 404 POST_NOT_FOUND */ }
@Test void deletingPostDeletesComments() { /* DELETE post → comments rows gone */ }
```

- [ ] **Step 2: Run to verify failure** — FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run all backend tests** — PASS
- [ ] **Step 5: Commit** — `git commit -m "Add comments"`

---

### Task 9: 추천

**Files:**
- Create: `db/migration/V5__post_likes.sql`
- Create: `like/{PostLikeRepository,LikeService,LikeController}.java`
- Modify: `post/PostService.java` (`likedByMe`)
- Test: `like/LikeApiTest.java`

**Interfaces:**
- Produces:
  - `PUT /api/posts/{id}/like` → `{ likeCount, likedByMe: true }`; `DELETE /api/posts/{id}/like` → `{ likeCount, likedByMe: false }`. Nickname required. Insert uses `insert ... on conflict do nothing`; then `like_count` recomputed with `select count(*)`.
  - `PostDetailResponse.likedByMe` reflects the viewer.

- [ ] **Step 1: Write the failing tests**

```java
@Test void likeAndUnlike() { /* PUT → likeCount 1 likedByMe true; GET post → likedByMe true; DELETE → likeCount 0 */ }
@Test void repeatedLikeIsIdempotent() { /* PUT twice → both 200, likeCount 1 */ }
@Test void concurrentLikesDoNotDuplicate() { /* two threads PUT same user/post simultaneously (CountDownLatch) → both 200, likeCount 1 */ }
@Test void unlikeWithoutLikeIsFine() { /* DELETE → 200 likeCount 0 */ }
@Test void anonymousCannotLike() { /* 401 */ }
@Test void likeMissingPost404() { /* 404 POST_NOT_FOUND */ }
@Test void anonymousViewerSeesLikedByMeFalse() { /* GET as anonymous → likedByMe false */ }
```

- [ ] **Step 2: Run to verify failure** — FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run all backend tests** — PASS
- [ ] **Step 5: Commit** — `git commit -m "Add post likes"`

---

### Task 10: 프론트엔드 기반 (라우팅, API 클라이언트, 메뉴, 로그인 흐름, 닉네임 화면)

**Files:**
- Modify: `frontend/package.json` (add `react-router`, `@tanstack/react-query`), `vite.config.ts` (proxy `/api`, `/oauth2`, `/login/oauth2` → `http://localhost:8080`), `src/main.tsx`, `src/App.tsx`
- Create: `src/api/{client,types,me}.ts`, `src/lib/{relativeTime,returnTo}.ts`, `src/components/{Header,Toast}.tsx`, `src/pages/{WelcomePage,AuthDonePage,NotFoundPage}.tsx`, `src/routes.tsx`, `src/test/{render.tsx,mockApi.ts}`
- Delete: `src/components/ServerStatus.tsx`, `ServerStatus.test.tsx`, `src/api/status.ts` (replaced by real pages)
- Test: `src/lib/relativeTime.test.ts`, `src/api/client.test.ts`, `src/components/Header.test.tsx`, `src/pages/WelcomePage.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; code: string; fieldErrors?: Record<string,string> }`
  - `apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T>` — sends `credentials: 'same-origin'`, JSON body when `json` given, copies `XSRF-TOKEN` cookie into `X-XSRF-TOKEN` header for non-GET, returns `undefined` for 204/empty body, throws `ApiError` from the error JSON (network failure → `ApiError(status 0, code "NETWORK", message "서버에 연결할 수 없어요")`).
  - `types.ts`: `Me`, `Author`, `Champion`, `Augment`, `PostListItem`, `PostDetail`, `Comment`, `Page<T>` matching backend records (field names identical, `content` typed as Tiptap `JSONContent`).
  - `useMe(): UseQueryResult<Me | null>`, `setNickname(nickname): Promise<Me>`, `logout(): Promise<void>`.
  - `relativeTime(iso: string, now?: Date): string` per Global Constraints.
  - `rememberReturnTo(path: string)`, `consumeReturnTo(): string` (sessionStorage key `aram.returnTo`, default `/`).
  - `Header`: logo → `/`; logged out: "디스코드로 로그인" button (`rememberReturnTo(current path)` then `window.location.assign('/oauth2/authorization/discord')`); logged in: "글쓰기" link and avatar/nickname button opening a menu with "로그아웃".
  - `useToast(): { show(message: string): void }` with `<ToastProvider>`.
  - Routing (`routes.tsx`): `/`, `/posts/:postId`, `/posts/:postId/edit`, `/write`, `/champions/:championId`, `/augments/:augmentId`, `/welcome`, `/auth/done`, `*` → NotFound. Pages from later tasks are placeholders here (`<div>준비 중</div>`) and replaced in Tasks 11–13.
  - App guard: when `me` is loaded, non-null, and `nickname === null`, any route except `/welcome` redirects to `/welcome`.
  - `WelcomePage`: input prefilled with `me.suggestedNickname`, save → `setNickname` → navigate to `consumeReturnTo()`; shows `fieldErrors.nickname` or 409 message under the input.
  - `AuthDonePage`: navigates to `consumeReturnTo()` immediately.
  - Test helpers: `renderWithProviders(ui, { route?: string, path?: string })` (QueryClient with retries off + MemoryRouter + ToastProvider); `mockApi(routes: Record<string, (req: Request) => Response | Promise<Response>>)` stubbing `fetch` by `"METHOD /path"` keys (query string ignored for matching unless the key includes `?`).

- [ ] **Step 1: Install packages and write the failing tests**

Run: `cd frontend && npm install react-router @tanstack/react-query`

```ts
// relativeTime.test.ts  (now = 2026-10-24T12:00:00+09:00)
expect(relativeTime('2026-10-24T11:59:30+09:00', now)).toBe('방금')
expect(relativeTime('2026-10-24T11:15:00+09:00', now)).toBe('45분 전')
expect(relativeTime('2026-10-24T02:00:00+09:00', now)).toBe('10시간 전')
expect(relativeTime('2026-10-21T12:00:00+09:00', now)).toBe('3일 전')
expect(relativeTime('2026-10-10T09:00:00+09:00', now)).toBe('2026.10.10')

// client.test.ts
it('throws ApiError with code and fieldErrors')   // 400 {code:'INVALID_INPUT', message:'..', fieldErrors:{title:'제목을 입력해주세요'}}
it('sends X-XSRF-TOKEN from cookie on POST')       // document.cookie = 'XSRF-TOKEN=abc' → header 'abc'
it('returns undefined for 204')
it('maps network failure to NETWORK ApiError')

// Header.test.tsx
it('shows Discord login when logged out')          // GET /api/me → '' → button '디스코드로 로그인'
it('shows nickname and 글쓰기 when logged in')
it('logs out from the profile menu')               // click nickname → '로그아웃' → POST /api/logout called, login button appears

// WelcomePage.test.tsx
it('prefills suggested nickname and saves')        // suggestedNickname '양호' → input value '양호'; PUT → navigates to returnTo '/posts/3'
it('shows duplicate nickname error')               // 409 → '이미 쓰고 있는 닉네임이에요'

// App.test.tsx
it('redirects to /welcome when nickname is missing') // me {nickname:null} at '/' → Welcome heading visible
```

- [ ] **Step 2: Run to verify failure** — `cd frontend && npm test` → FAIL
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run tests, build, lint** — `npm test && npm run build && npm run lint` → all PASS / no errors
- [ ] **Step 5: Commit** — `git commit -m "Add frontend routing, API client, header, and nickname flow"`

---

### Task 11: 메인 목록과 태그 모아보기 화면

**Files:**
- Create: `src/api/{posts,gamedata}.ts`, `src/components/{PostList,PostListItem,Pagination,SortPills,TagChip}.tsx`, `src/pages/{HomePage,TagPage}.tsx`
- Modify: `src/routes.tsx`
- Test: `src/pages/HomePage.test.tsx`, `src/pages/TagPage.test.tsx`, `src/components/Pagination.test.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `types.ts`, `relativeTime`, `renderWithProviders`, `mockApi`.
- Produces:
  - `usePostList(params: { sort: 'latest'|'likes'; page: number; champion?: string; augment?: string })`
  - `useChampions()`, `useAugments()`, `usePatches()` (`staleTime: Infinity` for the session)
  - `PostList` renders sort pills, items, pagination from URL search params (`sort`, `page`); reused by `HomePage` and `TagPage`.
  - `PostListItem` shows: like count, title (link to `/posts/:id`), champion images and augment icons (each `title` = name), `gamePatch` badge, nickname, `relativeTime(createdAt)`, comment count.
  - `TagChip({ kind: 'champion'|'augment', id, nameKo, imageUrl, inactive? })` links to `/champions/:id` or `/augments/:id`.
  - Empty home: text "아직 글이 없어요. 첫 글을 써보세요" + link to `/write`.
  - `TagPage` header: image/icon, name, "이 태그가 붙은 글 N개" (from `totalItems`), "✕ 전체 글 보기" link to `/`; inactive augment shows "현재 게임에 없음". Unknown tag id → NotFound content.

- [ ] **Step 1: Write the failing tests**

```ts
// HomePage.test.tsx
it('lists posts newest first with tags and patch')   // items render title, '26.21', img alt/title '아무무'
it('switches to 추천순 and updates the URL')          // click '추천순' → fetch called with sort=likes
it('moves between pages')                             // totalPages 2 → click '2' → fetch page=2
it('shows the empty state')                           // items [] → '아직 글이 없어요. 첫 글을 써보세요'
// TagPage.test.tsx
it('shows champion header and filtered posts')        // /champions/Amumu → '아무무', '이 태그가 붙은 글 3개', fetch has champion=Amumu
it('marks inactive augments')                         // /augments/OLD → '현재 게임에 없음'
// Pagination.test.tsx
it('hides when only one page'); it('marks the current page')
```

- [ ] **Step 2: Run to verify failure** — FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run tests, build, lint** — PASS
- [ ] **Step 5: Commit** — `git commit -m "Add post list and tag pages"`

---

### Task 12: 글 상세 화면 (본문 표시, 추천, 댓글, 삭제)

**Files:**
- Modify: `frontend/package.json` (add `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-image`)
- Create: `src/editor/{extensions.ts,PostContentView.tsx}`, `src/api/comments.ts`, `src/components/{LikeButton,CommentSection}.tsx`, `src/pages/PostDetailPage.tsx`
- Modify: `src/api/posts.ts`, `src/routes.tsx`
- Test: `src/editor/extensions.test.ts`, `src/pages/PostDetailPage.test.tsx`, `src/components/CommentSection.test.tsx`

**Interfaces:**
- Produces:
  - `postExtensions(): Extensions` — exactly the allowed nodes and marks (Global Constraints). Built from StarterKit with every other node, mark, and extra extension disabled, plus `Image`. Undo/redo and drop cursor are allowed (they add no schema).
  - `PostContentView({ content: JSONContent })` — Tiptap editor with `editable: false` and `postExtensions()`.
  - `usePost(id)`, `deletePost(id)`, `likePost(id)`, `unlikePost(id)` in `api/posts.ts`; `useComments(postId)`, `addComment`, `editComment`, `deleteComment` in `api/comments.ts`.
  - `LikeButton({ postId, likeCount, likedByMe })` — optimistic toggle, reverts and toasts the error message on failure; anonymous click → toast "로그인이 필요해요" (no request).
  - `CommentSection({ postId })` — list (avatar, nickname, relative time, text with line breaks, "수정됨"), edit/delete for own comments, delete for admin, input + "등록" for logged-in users, "로그인하고 댓글 달기" button for anonymous (same login flow as Header).
  - `PostDetailPage`: back link "‹ 목록으로", title, meta (patch, nickname, time, "수정됨"), content, tag chips, like button, comments; "수정" (author) and "삭제" (author/admin) with `window.confirm('글을 삭제할까요?')`; after delete → navigate `/` and toast "글을 삭제했어요". 404 → NotFound content "없는 글이에요".

- [ ] **Step 1: Install and write the failing tests**

Run: `cd frontend && npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image`

```ts
// extensions.test.ts
it('schema has only allowed nodes and marks', () => {
  const editor = new Editor({ extensions: postExtensions() })
  expect(Object.keys(editor.schema.nodes).sort()).toEqual(['blockquote','bulletList','doc','hardBreak','image','listItem','orderedList','paragraph','text'])
  expect(Object.keys(editor.schema.marks).sort()).toEqual(['bold','italic'])
})
// PostDetailPage.test.tsx
it('renders title, meta, content, and tag chips')    // bold text renders <strong>, chip links to /champions/Amumu
it('shows edit and delete only to the author')
it('shows only delete to an admin')
it('deletes after confirm and goes home')
it('shows 없는 글이에요 for 404')
it('toggles like optimistically and reverts on error') // PUT → 500 → count returns to original, toast shown
it('asks anonymous users to log in when liking')
// CommentSection.test.tsx
it('lists comments with line breaks')
it('adds a comment and clears the input')
it('shows field error for blank comment')            // 400 fieldErrors.content → '댓글을 입력해주세요'
it('shows login button to anonymous users')
```

- [ ] **Step 2: Run to verify failure** — FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run tests, build, lint** — PASS
- [ ] **Step 5: Commit** — `git commit -m "Add post detail page with likes and comments"`

---

### Task 13: 글쓰기·수정 화면 (편집기, 이미지, 태그 선택기, 패치)

**Files:**
- Create: `src/editor/PostEditor.tsx`, `src/api/images.ts`, `src/components/TagPicker.tsx`, `src/pages/WritePage.tsx`
- Modify: `src/api/posts.ts` (`createPost`, `updatePost`), `src/routes.tsx`
- Test: `src/components/TagPicker.test.tsx`, `src/pages/WritePage.test.tsx`

**Interfaces:**
- Consumes: `postExtensions`, `useChampions`, `useAugments`, `usePatches`, `usePost`.
- Produces:
  - `uploadImage(file: File): Promise<{ id: string; url: string }>` (multipart `file`).
  - `PostEditor({ value: JSONContent | null, onChange(json), onError(message) })` — toolbar: 굵게, 기울임, 글머리 목록, 번호 목록, 인용, 이미지(file input). Paste and drop of image files upload then insert `image` with the returned `url`. Before upload: type not jpg/png/webp/gif → `onError('jpg, png, webp, gif 이미지만 올릴 수 있어요')`; size > 10MB → `onError('이미지는 10MB 이하만 올릴 수 있어요')`; already 10 images → `onError('이미지는 한 글에 10장까지 넣을 수 있어요')`.
  - `TagPicker<T extends { id: string; nameKo: string }>({ label, options, selected, onChange, max, renderIcon, placeholder })` — input filters by `nameKo.includes(query)`, hides already-selected, click adds, ✕ removes, at `max` the input is disabled with hint "최대 N개까지 고를 수 있어요".
  - `WritePage` (both `/write` and `/posts/:postId/edit`): fields in order 제목 → 본문 → 챔피언 → 증강 → 패치 → 등록. Augment options exclude inactive ones except those already on the post. Patch select: `patches` with current labelled "26.21 (현재 패치)"; in edit mode, if the post's patch is not in the list it is appended. Submit → `createPost`/`updatePost` → navigate to `/posts/:id`. `ApiError.fieldErrors` shown under matching fields. 401 on submit → keep all input and toast "로그인이 필요해요" (form state untouched). Non-author on edit route → NotFound content. Unsaved changes + navigation away → `window.confirm('작성 중인 내용이 사라져요. 나갈까요?')` (React Router `useBlocker` + `beforeunload`).
  - Anonymous user opening `/write` → `rememberReturnTo('/write')` and show "로그인하고 글쓰기" button instead of the form.

- [ ] **Step 1: Write the failing tests**

```ts
// TagPicker.test.tsx
it('filters by partial Korean name')               // type '아무' → option '아무무' visible, '징크스' hidden
it('adds and removes chips')
it('blocks input at max')                          // max 1 → after one pick input disabled + '최대 1개까지 고를 수 있어요'
// WritePage.test.tsx
it('orders fields title, body, champions, augments, patch')   // DOM order of labels
it('defaults patch to current and labels it')                   // select value '26.21', option text '26.21 (현재 패치)'
it('submits and navigates to the new post')                     // POST body has title, content.type 'doc', championIds ['Amumu'], gamePatch '26.21'
it('shows server field errors under fields')                    // 400 fieldErrors.title → text under title input
it('keeps input when session expired')                          // POST → 401 → title input still has typed value, toast '로그인이 필요해요'
it('hides inactive augments except ones already attached')      // edit mode with OLD attached → chip OLD shown, OLD not in options
it('appends an old patch in edit mode')                         // post gamePatch '26.10' → option '26.10' present
it('rejects oversized image before upload')                     // drop 11MB file → onError message shown, no POST /api/images
it('asks for login when anonymous')                             // me null → '로그인하고 글쓰기'
```

- [ ] **Step 2: Run to verify failure** — FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run tests, build, lint** — PASS
- [ ] **Step 5: Commit** — `git commit -m "Add write and edit page with editor, images, tags, and patch"`

---

### Task 14: 전체 확인과 문서

**Files:**
- Modify: `README.md` (디스코드 앱 등록 방법, `.env` 채우는 법, 개발 로그인 켜는 법)
- Modify: `.claude/launch.json` if needed

- [ ] **Step 1: Run every automated check**

Run: `cd backend && ./gradlew test` and `cd frontend && npm test && npm run build && npm run lint`
Expected: all PASS, no lint errors.

- [ ] **Step 2: Browser walkthrough with dev login**

Create `backend/.env` with `APP_DEV_LOGIN_ENABLED=true` (the user's Discord values stay empty for now). Start the backend in the background and the frontend preview. In the browser: dev-login as two users (`POST /api/dev/login` from the page's devtools via `fetch` with the XSRF header), then verify:
1. 첫 글 쓰기: 제목, 본문(굵게, 목록), 이미지 붙여넣기, 챔피언·증강 태그, 패치 기본값 → 상세 화면으로 이동.
2. 메인 목록에 아이콘·패치·시간이 보이고, 추천순 전환과 페이지 이동이 된다.
3. 태그 칩 → 모아보기 → "✕ 전체 글 보기".
4. 다른 사용자로 댓글, 추천, 추천 취소. 남의 글에 수정·삭제 버튼이 없다.
5. 글쓴이로 수정 → "수정됨" 표시, 삭제 → 메인으로.
6. 로그아웃 → 읽기는 되고, 추천·댓글은 로그인 안내.
Expected: every item behaves as described; capture a screenshot of the main list and the detail page.

- [ ] **Step 3: Update README** with: 디스코드 개발자 포털에서 앱 만들기, OAuth2 리디렉트 `http://localhost:5173/login/oauth2/code/discord` 등록, `backend/.env`에 `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `APP_ADMIN_DISCORD_IDS`(본인 디스코드 사용자 ID) 넣기, 개발 로그인 설명(운영에서 끄기).

- [ ] **Step 4: Commit** — `git commit -m "Document Discord setup and local verification"`
