# 증강·챔피언 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 위쪽 메뉴에 증강·챔피언 탭을 추가한다. 증강은 프리즘·골드·실버 묶음으로, 챔피언은 하나의 격자로 보여준다. 칸을 누르면 그 줄 바로 아래로 태그 글 목록이 펼쳐진다.

**Architecture:** 백엔드는 증강에 등급(`rarity`) 컬럼을 더하고 수집 때 채운다(V7). 읽기 전용 API 두 개를 추가한다: 태그별 글 수, 챔피언의 자주 함께 쓰는 증강. 기존 글 목록 API에는 `size`를 더한다. 프론트엔드는 공통 부품(`components/tags/*`)과 순수 함수(`lib/tagSearch.ts`) 위에 두 목록 화면을 만든다. 펼친 칸은 주소 `?open=`에 남긴다.

**Tech Stack:** 기존과 같음 — Spring Boot 4.1, Java 21, JPA, Flyway, PostgreSQL 18, Testcontainers / React 19, TypeScript, React Router, TanStack Query 5, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-24-tag-browse-design.md` (기반: v1, 프로필 설계)

## Global Constraints

- 프로젝트 규칙은 `CLAUDE.md`를 따른다: 해요체 문구, 오류 형식 `{code, message, fieldErrors}`, DB 변경은 Flyway만, 커밋 이메일 noreply, Docker Desktop을 에이전트가 켜지 않기.
- 등급 값: `PRISMATIC`, `GOLD`, `SILVER`. 수집 규칙: `rarity` 없음 또는 0 → SILVER, 1 → GOLD, 2 → PRISMATIC, 그 밖 → SILVER와 경고 로그. `Enabled: false`는 받지 않는다.
- 묶음 순서와 이름: 프리즘 → 골드 → 실버.
- 목록에는 `active` 증강만 나온다. 챔피언은 전부 나온다.
- 펼침 영역 글은 5개씩(`size=5`). 자주 함께 쓰는 증강은 최대 5개이고 `active`만 포함한다. 순서는 글 수 내림차순, 같으면 이름 가나다순.
- 새 오류 코드: `CHAMPION_NOT_FOUND(404, "챔피언을 찾을 수 없어요")`. `size` 오류 문구: `"한 번에 1~20개까지 볼 수 있어요"`.
- 화면 문구:
  - 메뉴와 버튼: "전체 글", "증강", "챔피언", "가나다순", "글 많은 순", "최신순", "추천순"
  - 묶음: "프리즘", "골드", "실버", "증강 n개 · 글 n개", 검색 중 "증강 m/n개 · 글 n개"
  - 칸과 펼침 영역: "글 n개", "프리즘 증강 · 게시글 n개", 챔피언 "게시글 n개", "자주 함께 쓰는 증강", "더 보기 (n개 남음)"
  - 상태 안내: "검색 결과가 없어요", "아직 이 태그가 붙은 글이 없어요", "불러오는 중이에요", "잠시 후 다시 시도해주세요"
  - 검색칸 placeholder: "증강 이름 검색", "챔피언 이름 검색"
- 검색: 공백을 모두 지우고 소문자로 바꾼 이름에 같은 처리를 한 검색어가 들어 있으면 맞는 것으로 본다.
- 펼침 상태는 `?open=<id>`로 남기고, 바꿀 때는 `replace: true`를 쓴다.
- 좁은 화면(480px 미만)에서는 메뉴 탭이 둘째 줄로 내려간다.

## Review Focus

1. **검색으로 사라졌다 다시 나타나는 펼친 칸**: `?open=X`인 상태에서 X가 빠지는 검색어를 넣으면 펼침 영역이 없어진다. 검색어를 지우면 다시 X 아래에 펼쳐진다. → Task 6 테스트.
2. **`?open=`이 목록에 없는 id**: 게임에서 빠진 증강이나 아무 문자열이 들어오면 오류 없이 아무것도 펼치지 않는다. 다른 칸을 누르면 정상 동작한다. → Task 6 테스트.
3. **정렬을 바꾼 뒤의 더 보기**: 더 보기로 10개를 본 다음 추천순으로 바꾸면, 처음 5개부터 새 순서로 다시 나온다. 예전 페이지가 섞이면 안 된다. → Task 5 테스트.
4. **같은 이름 동점 정렬과 한국어 정렬**: 글 많은 순에서 글 수가 같으면 가나다순이다. 숫자로 시작하는 이름("2연속 공격")도 `localeCompare('ko')` 순서를 따른다. → Task 3 테스트.
5. **마이그레이션 직후 등급이 비어 보이는 문제**: 기존 증강은 모두 SILVER 기본값이다. 서버를 켜면 시작 동기화가 전체를 다시 받아 등급을 채워야 한다. → Task 7 브라우저 확인. 테스트 DB는 매번 비워져서 자동 테스트로는 확인할 수 없다.

---

## File Structure

### Backend (`backend/src/main/java/com/aram/community/`)

| 파일 | 책임 |
|---|---|
| `resources/db/migration/V7__augment_rarity.sql` | `rarity` 컬럼, 전체 재동기화 유도 |
| `gamedata/AugmentRarity.java` | 등급 열거형과 `fromKiwi(JsonNode)` |
| `gamedata/Augment.java`, `AugmentDto.java`, `GameDataClient.java`, `GameDataSyncService.java`, `GameDataService.java` (수정) | 등급 저장·전달, `Enabled:false` 제외 |
| `post/TagStatsController.java`, `TagStatsService.java`, `TagCountsResponse.java`, `TopAugmentItem.java` | 태그별 글 수, 자주 함께 쓰는 증강 |
| `post/PostRepository.java`, `PostListService.java`, `PostController.java` (수정) | 집계 쿼리, `size` |
| `common/ErrorCode.java` (수정) | `CHAMPION_NOT_FOUND` |

### Frontend (`frontend/src/`)

| 파일 | 책임 |
|---|---|
| `api/types.ts`, `api/gamedata.ts`, `api/posts.ts` (수정) | `rarity`, `TagCounts`, `TopAugment`, `useTagCounts`, `useTopAugments`, `useTagPosts` |
| `lib/tagSearch.ts` | 검색 맞춤과 정렬 |
| `components/Header.tsx` (수정) | 탭 세 개 |
| `components/tags/TagToolbar.tsx` | 검색칸과 정렬 버튼 |
| `components/tags/TagGrid.tsx` | 칸 격자와 펼침 영역 끼워 넣기 |
| `components/tags/TagPostsPanel.tsx` | 펼침 영역 |
| `components/tags/TopAugments.tsx` | 자주 함께 쓰는 증강 칩 |
| `pages/AugmentsPage.tsx`, `pages/ChampionsPage.tsx` | 두 목록 화면 |
| `routes.tsx` (수정) | `/augments`, `/champions` |
| `test/fixtures.ts` (수정) | 증강 픽스처에 `rarity` |

---

### Task 1: 증강 등급 수집

**Files:**
- Create: `backend/src/main/resources/db/migration/V7__augment_rarity.sql`, `gamedata/AugmentRarity.java`
- Modify: `gamedata/Augment.java`, `AugmentDto.java`, `GameDataClient.java`, `GameDataSyncService.java`, `GameDataService.java`
- Modify (fixture): `backend/src/test/resources/gamedata/kiwi.bin.json`
- Test: `gamedata/GameDataSyncServiceTest.java`, `gamedata/GameDataControllerTest.java`

**Interfaces:**
- Produces:
  - `V7`: `alter table augments add column rarity varchar(10) not null default 'SILVER'; update game_data_state set current_ddragon_version = null;`
  - `enum AugmentRarity { PRISMATIC, GOLD, SILVER; static AugmentRarity fromKiwi(JsonNode augmentData) }`. Unknown values log a warning (the augment id and the value) and return SILVER.
  - `GameDataClient.AugmentData(String id, String nameKo, String iconPath, AugmentRarity rarity)`. `fetchAugments()` skips entries whose `Enabled` is boolean `false`.
  - `Augment(String id, String nameKo, String iconPath, AugmentRarity rarity, Instant now)`, `refresh(String nameKo, String iconPath, AugmentRarity rarity, Instant now)`, `AugmentRarity getRarity()`, mapped with `@Enumerated(EnumType.STRING) @Column(nullable = false, length = 10)`.
  - `AugmentDto(String id, String nameKo, String iconUrl, boolean active, AugmentRarity rarity)`. Jackson writes the enum name.

- [ ] **Step 1: Change the fixture and write the failing tests**

Fixture `kiwi.bin.json`:
- Add `"rarity": 2` to `SurgeField` and `ARAM_GiantSlayer`, and `"rarity": 1` to `Sonata` and `EndlessDecimation`.
- Add `"rarity": 7` to one more entry, e.g. `ARAM_Firefox`.
- Leave `ARAM_LegDay` without `rarity`.
- Add one new `AugmentData` entry `Disabled_Test` with `"Enabled": false`. Give it a name key that already exists in `stringtable.json` and a small icon path, so only `Enabled` excludes it. The 22-augment count assertion stays as it is.

```java
// GameDataSyncServiceTest
@Test void storesRarityFromKiwi() {
  // expectFullSync("kiwi.bin.json"); sync() →
  assertThat(augments.findById("SurgeField").orElseThrow().getRarity()).isEqualTo(AugmentRarity.PRISMATIC);
  assertThat(augments.findById("Sonata").orElseThrow().getRarity()).isEqualTo(AugmentRarity.GOLD);
  assertThat(augments.findById("ARAM_LegDay").orElseThrow().getRarity()).isEqualTo(AugmentRarity.SILVER);
  assertThat(augments.findById("ARAM_Firefox").orElseThrow().getRarity()).isEqualTo(AugmentRarity.SILVER); // unknown 7
}
@Test void skipsDisabledAugments() { /* after full sync: augments.findById("Disabled_Test") is empty; count stays 22 */ }
@Test void disabledLaterDeactivatesExisting() {
  // insert augment row 'Disabled_Test' active=true via jdbc (rarity 'GOLD'), state version null → full sync → row active=false
}
@Test void refreshUpdatesRarity() {
  // insert 'Sonata' with rarity 'SILVER' via jdbc → full sync → GOLD
}

// GameDataControllerTest
@Test void augmentsIncludeRarity() { /* insert augment rarity 'PRISMATIC' → GET /api/augments → $[0].rarity "PRISMATIC" */ }
```

- [ ] **Step 2: Run to verify failure** — `cd backend && ./gradlew test --tests '*GameData*'`. Expected: FAIL (compile: `AugmentRarity` does not exist).
- [ ] **Step 3: Implement the migration, enum, entity, client, sync and DTO.** Every existing `new Augment(...)` / `refresh(...)` call passes the rarity. Test code that builds augments with SQL needs no change, because the column has a default.
- [ ] **Step 4: Run all backend tests** — `./gradlew test`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Collect augment rarity"`

---

### Task 2: 태그별 글 수, 자주 함께 쓰는 증강, 목록 크기

**Files:**
- Create: `post/TagStatsController.java`, `post/TagStatsService.java`, `post/TagCountsResponse.java`, `post/TopAugmentItem.java`
- Modify: `post/PostRepository.java`, `post/PostListService.java`, `post/PostController.java`, `common/ErrorCode.java`
- Test: `post/TagStatsApiTest.java` (new), `post/PostListApiTest.java`

**Interfaces:**
- Consumes: Task 1 `AugmentDto` (with `rarity`), `GameDataService.toDto(Augment)`, `ChampionRepository.existsById`.
- Produces:
  - `GET /api/tag-counts` → `TagCountsResponse(Map<String, Long> champions, Map<String, Long> augments)`. Only tags with at least one post appear. Inactive augments are counted too.
  - `GET /api/champions/{championId}/top-augments` → `List<TopAugmentItem>`, where `TopAugmentItem(AugmentDto augment, long postCount)`. At most 5. Active augments only. Ordered by count desc, then `nameKo` asc. A missing champion → 404 `CHAMPION_NOT_FOUND`.
  - `PostRepository`:
    - `@Query("select c.id as id, count(p) as postCount from Post p join p.champions c group by c.id") List<TagCount> countByChampion()`
    - `countByAugment()`, the same query over augments.
    - `interface TagCount { String getId(); long getPostCount(); }`
    - `@Query("select a as augment, count(p) as postCount from Post p join p.champions c join p.augments a where c.id = :championId and a.active = true group by a order by count(p) desc, a.nameKo asc") List<AugmentCount> topAugmentsWith(String championId, Pageable limit)` with `interface AugmentCount { Augment getAugment(); long getPostCount(); }`
  - `PostListService.list(String sort, int page, int size, String championId, String augmentId)`. `size` must be 1–20, otherwise `ApiException(INVALID_INPUT, Map.of("size", "한 번에 1~20개까지 볼 수 있어요"))`.
  - `PostController.list` gains `@RequestParam(defaultValue = "20") int size`. Other callers of `list` pass `PAGE_SIZE`.
  - `ErrorCode.CHAMPION_NOT_FOUND(404, "챔피언을 찾을 수 없어요")`.

- [ ] **Step 1: Write the failing tests** (seed like `PostListApiTest`: champions Amumu/Jinx, augments A1 무한 궁극기, A2 연쇄 번개, A3 거인 학살자 (all active), A4 옛 증강 (`active=false`))

```java
// TagStatsApiTest
@Test void countsPostsPerTag() {
  // p1: Amumu+A1, p2: Amumu+A1+A2, p3: Jinx →
  // GET /api/tag-counts → $.champions.Amumu 2, $.champions.Jinx 1, $.augments.A1 2, $.augments.A2 1, $.augments.A3 doesNotExist()
}
@Test void countsDropWhenPostDeleted() { /* delete p2 via jdbc → $.augments.A2 doesNotExist(), $.champions.Amumu 1 */ }
@Test void inactiveAugmentsAreCounted() { /* p: Jinx+A4 → $.augments.A4 1 */ }
@Test void topAugmentsOrderedByCountThenName() {
  // Amumu posts: (A2), (A2), (A1), (A3) → [A2 연쇄 번개 2, A3 거인 학살자 1, A1 무한 궁극기 1]
  // jsonPath $[0].augment.id "A2", $[0].postCount 2, $[1].augment.id "A3", $[2].augment.id "A1", $[0].augment.rarity present
}
@Test void topAugmentsAtMostFive() { /* 6 distinct active augments on Amumu posts → length 5 */ }
@Test void topAugmentsSkipInactive() { /* Amumu+A4 only → [] */ }
@Test void topAugmentsOnlyFromThatChampion() { /* Jinx+A1 post does not count for Amumu → [] */ }
@Test void topAugmentsUnknownChampion404() { /* GET /api/champions/Nope/top-augments → 404, $.code "CHAMPION_NOT_FOUND" */ }

// PostListApiTest
@Test void sizeLimitsPage() { /* 7 posts, ?size=5 → items length 5, totalPages 2; ?size=5&page=2 → 2 items */ }
@Test void sizeOutOfRangeIs400() { /* size=0 and size=21 → 400, $.fieldErrors.size "한 번에 1~20개까지 볼 수 있어요" */ }
```

- [ ] **Step 2: Run to verify failure** — `./gradlew test --tests '*TagStatsApiTest' --tests '*PostListApiTest'`. Expected: FAIL (404s, and the size param is ignored).
- [ ] **Step 3: Implement the repository queries, service, controller, size param and error code.** `TagStatsService` is `@Transactional(readOnly = true)`. `PageRequest.of(0, 5)` limits the top-augments query.
- [ ] **Step 4: Run all backend tests** — `./gradlew test`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add tag counts, top augments and list size"`

---

### Task 3: 화면 데이터와 검색 함수

**Files:**
- Create: `frontend/src/lib/tagSearch.ts`, `frontend/src/lib/tagSearch.test.ts`
- Modify: `api/types.ts`, `api/gamedata.ts`, `api/posts.ts`, `test/fixtures.ts`

**Interfaces:**
- Consumes: Task 2 API shapes.
- Produces:
  - `types.ts`:
    - `type AugmentRarity = 'PRISMATIC' | 'GOLD' | 'SILVER'`
    - `Augment` gains `rarity: AugmentRarity`
    - `type TagCounts = { champions: Record<string, number>; augments: Record<string, number> }`
    - `type TopAugment = { augment: Augment; postCount: number }`
  - `gamedata.ts`:
    - `useTagCounts()`: key `['posts', 'tag-counts']`, `GET /api/tag-counts`.
    - `useTopAugments(championId: string)`: key `['posts', 'top-augments', championId]`.
    - Both use the default staleTime, so they refetch when a page opens.
  - `posts.ts`: `useTagPosts(params: { champion?: string; augment?: string; sort: PostSort })`.
    - `useInfiniteQuery` with key `['posts', 'tag', params]` and `GET /api/posts?sort=&page=&size=5&champion|augment=`.
    - `initialPageParam: 1`; `getNextPageParam: (last) => last.page < last.totalPages ? last.page + 1 : undefined`.
    - Export `TAG_POSTS_SIZE = 5`.
  - `tagSearch.ts`:
    - `normalizeName(s: string): string` removes all whitespace and lowercases.
    - `matchesName(name: string, query: string): boolean` returns true for a blank query.
    - `type TagSort = 'name' | 'count'`
    - `sortTags<T>(items: T[], sort: TagSort, nameOf: (t: T) => string, countOf: (t: T) => number): T[]` returns a new array. `'name'` uses `localeCompare(b, 'ko')`. `'count'` sorts by count desc, then name.
  - `fixtures.ts`: `legDay.rarity = 'SILVER'`, `oldAugment.rarity = 'GOLD'`. Add `prismAugment: Augment = { id: 'ARAM_GiantSlayer', nameKo: '거인 학살자', iconUrl: 'https://example.test/gs.png', active: true, rarity: 'PRISMATIC' }`.

- [ ] **Step 1: Write the failing tests** (`tagSearch.test.ts`)

```ts
it('ignores spaces and case', () => {
  expect(matchesName('하체 운동의 날', '하체운동')).toBe(true)
  expect(matchesName('Bonk!', 'bon k')).toBe(true)
  expect(matchesName('연쇄 번개', '학살')).toBe(false)
})
it('blank query matches everything', () => expect(matchesName('아무무', '  ')).toBe(true))
it('sorts by name in Korean order', () => {
  expect(sortTags(['하체 운동의 날', '2연속 공격', '거인 학살자'], 'name', (s) => s, () => 0))
    .toEqual(['2연속 공격', '거인 학살자', '하체 운동의 날'])
})
it('sorts by count then name', () => {
  const counts: Record<string, number> = { 가: 1, 나: 3, 다: 1 }
  expect(sortTags(['다', '가', '나'], 'count', (s) => s, (s) => counts[s])).toEqual(['나', '가', '다'])
})
it('does not mutate input', () => { /* original array order unchanged */ })
```

- [ ] **Step 2: Run to verify failure** — `cd frontend && npm test -- tagSearch`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `tagSearch.ts`, the types, the hooks and the fixtures**
- [ ] **Step 4: Run all frontend tests and the type check** — `npm test && npm run build`. Expected: PASS. Existing tests compile with the new `rarity` field.
- [ ] **Step 5: Commit** — `git commit -m "Add tag browse data hooks and search helpers"`

---

### Task 4: 위쪽 메뉴 탭

**Files:**
- Modify: `frontend/src/components/Header.tsx`
- Test: `frontend/src/components/Header.test.tsx` (create, or add to it if it exists)

**Interfaces:**
- Produces:
  - A `<nav aria-label="주요 메뉴">` with three `NavLink`s: "전체 글" → `/` (`end`), "증강" → `/augments`, "챔피언" → `/champions`.
  - The active link gets `aria-current="page"` (NavLink default) and bold styling.
  - Below 480px (Tailwind `max-[479px]:`), the nav wraps to its own full-width row under the logo row.

- [ ] **Step 1: Write the failing tests** (render with routes, `GET /api/me` → null)

```tsx
it.each([
  ['/', '전체 글'], ['/augments', '증강'], ['/augments/ARAM_LegDay', '증강'],
  ['/champions', '챔피언'], ['/champions/Amumu', '챔피언'],
])('marks the tab for %s', async (path, tab) => {
  // renderRoutes([{ path: '*', element: <Header /> }], path)
  expect(await screen.findByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page')
  // the other two tabs have no aria-current
})
it('posts page marks no tab', async () => { /* '/posts/1' → none has aria-current */ })
```

- [ ] **Step 2: Run to verify failure** — `npm test -- Header`. Expected: FAIL (no link named 증강).
- [ ] **Step 3: Implement the nav**
- [ ] **Step 4: Run all frontend tests** — `npm test`. Expected: PASS. If another test now finds two "전체 글" links (for example TagPage's "✕ 전체 글 보기" link with an exact-name query), fix that test's query and ledger it.
- [ ] **Step 5: Commit** — `git commit -m "Add browse tabs to header"`

---

### Task 5: 격자와 펼침 영역 부품

**Files:**
- Create: `components/tags/TagToolbar.tsx`, `TagGrid.tsx`, `TagPostsPanel.tsx`, `TopAugments.tsx`
- Test: `components/tags/TagGrid.test.tsx`, `components/tags/TagPostsPanel.test.tsx`

**Interfaces:**
- Consumes: Task 3 hooks and `tagSearch`. Existing `PostListItem`, `ApiError`.
- Produces:
  - `TagToolbar({ query, onQueryChange, sort, onSortChange, placeholder })`:
    - Search input with `aria-label` "이름 검색".
    - Two buttons "가나다순" / "글 많은 순" with `aria-pressed`.
  - `type GridItem = { id: string; name: string; image: string | null; count: number; round?: boolean }`
  - `TagGrid({ items, openId, onToggle, renderPanel }: { items: GridItem[]; openId: string | null; onToggle: (id: string) => void; renderPanel: (id: string) => ReactNode })`:
    - Each item is a `button` with accessible name = item name, `aria-expanded={openId === id}`, and the text "글 n개".
    - When `openId` is in `items`, `renderPanel(openId)` renders inside a `div` with `col-span-full`. It goes right after the last item whose `offsetTop` equals the open item's `offsetTop`.
    - The position is measured in `useLayoutEffect` and recomputed on window `resize`.
    - Before measuring, and in jsdom, the panel goes after the last item.
  - `TagPostsPanel({ kind, id, title, subtitle, onClose }: { kind: 'augment' | 'champion'; id: string; title: string; subtitle: string; onClose: () => void })`:
    - `role="region"` with `aria-label` `${title} 게시글`.
    - Shows the title and subtitle, and a close button with `aria-label` "닫기" and text ✕.
    - Uses `useTagPosts` and keeps local sort state (default `latest`).
    - Shows `SortPills` only when the first page has posts.
    - Renders posts with `PostListItem`.
    - The button reads `더 보기 (${totalItems - loaded}개 남음)` and calls `fetchNextPage`. It is hidden when there is no next page.
    - Empty state "아직 이 태그가 붙은 글이 없어요". Errors render inside the region.
    - Adds `<TopAugments championId={id} />` above the posts when `kind === 'champion'`.
  - `TopAugments({ championId })`:
    - When the list is non-empty, shows "자주 함께 쓰는 증강" and chips: `Link` to `/augments?open=${id}` containing icon, name and count.
    - Renders nothing when the list is empty or loading.

- [ ] **Step 1: Write the failing tests**

```tsx
// TagGrid.test.tsx (plain render, items a/b/c)
it('marks the open item and renders its panel after the row', () => {
  // openId 'b', renderPanel → <p>패널 b</p>; button 'b' aria-expanded true, others false; panel text present
  // jsdom: panel is the last child of the grid (after 'c')
})
it('calls onToggle with the id', async () => { /* click 'a' → onToggle('a') */ })
it('renders no panel when openId is not in items', () => { /* openId 'zzz' → renderPanel not called */ })
it('places the panel after the last item on the same row', () => {
  // stub offsetTop via Object.defineProperty on HTMLElement.prototype getter reading data-testtop attribute,
  // or spy: items a,b on top 0 and c on top 100, open 'a' → panel sits between b and c
})

// TagPostsPanel.test.tsx (mockApi 'GET /api/posts' reads query page/sort/size; 'GET /api/champions/Amumu/top-augments')
it('shows five posts and loads more', async () => {
  // 7 posts total: page1 → 5 items, totalItems 7, totalPages 2; button '더 보기 (2개 남음)'
  // click → request has page=2&size=5 and augment=X; 7 items; button gone
})
it('restarts from the first page when sort changes', async () => {
  // load page 2, click '추천순' → last request sort=likes&page=1; visible items are exactly page1-likes items (5)
})
it('shows empty text without sort pills', async () => { /* totalItems 0 → '아직 이 태그가 붙은 글이 없어요', no '최신순' button */ })
it('shows server error inside the region', async () => { /* 500 {message:'잠시 후 다시 시도해주세요'} → text within region */ })
it('closes with the X button', async () => { /* click '닫기' → onClose called */ })
it('champion panel shows top augments linking to augment tab', async () => {
  // top-augments → [{augment: legDay, postCount: 3}] → link '하체 운동의 날 3' href '/augments?open=ARAM_LegDay'
})
it('champion panel hides top augments when empty', async () => { /* [] → no '자주 함께 쓰는 증강' */ })
```

- [ ] **Step 2: Run to verify failure** — `npm test -- components/tags`. Expected: FAIL (modules not found).
- [ ] **Step 3: Implement the four components**
- [ ] **Step 4: Run all frontend tests** — `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add tag grid and dropdown post panel"`

---

### Task 6: 증강·챔피언 화면과 라우트

**Files:**
- Create: `pages/AugmentsPage.tsx`, `pages/ChampionsPage.tsx`
- Modify: `routes.tsx`
- Test: `pages/AugmentsPage.test.tsx`, `pages/ChampionsPage.test.tsx`

**Interfaces:**
- Consumes: Tasks 3 and 5.
- Produces:
  - Routes `{ path: '/augments', element: <AugmentsPage /> }` and `{ path: '/champions', element: <ChampionsPage /> }`, placed before the existing `/:id` routes.
  - Both pages:
    - `openId = searchParams.get('open')`.
    - Toggling sets or removes `open` with `setSearchParams(next, { replace: true })`.
    - Query and sort live in local state.
    - Show "불러오는 중이에요" while the list or the counts are pending.
    - If either fails, show the `ApiError` message or "잠시 후 다시 시도해주세요".
  - `AugmentsPage`:
    - Uses `const RARITY_GROUPS = [['PRISMATIC', '프리즘'], ['GOLD', '골드'], ['SILVER', '실버']] as const`.
    - Each group is a `button` (`aria-expanded`) whose name contains the group label. Its text is `증강 n개 · 글 n개`, or `증강 m/n개 · 글 n개` while searching. The post total covers all active augments in the group, not just the matches.
    - A group is open when it is in the local open set, when the query is non-blank and the group has matches, or when the group contains `openId`.
    - Groups with no matches are hidden while searching. When every group is hidden, show "검색 결과가 없어요".
    - Inside each open group: `TagGrid` of matching active augments, sorted.
    - Panel subtitle: `${groupLabel} 증강 · 게시글 ${count}개`.
  - `ChampionsPage`:
    - One `TagGrid` (`round: true`) of matching champions.
    - Panel subtitle: `게시글 ${count}개`.
    - Empty search shows "검색 결과가 없어요".

- [ ] **Step 1: Write the failing tests**

```tsx
// AugmentsPage.test.tsx — augments [prismAugment, legDay, oldAugment(inactive GOLD), goldA {id:'Sonata',nameKo:'소나타',rarity:'GOLD',active:true}]
// tag-counts { augments: { ARAM_LegDay: 3, OLD: 2 } }; routes include '/augments' and '/posts/:id' LocationProbe
it('starts with groups collapsed in prism-gold-silver order', async () => {
  // group buttons in order 프리즘, 골드, 실버; all aria-expanded false; no item buttons visible
  // 골드 group text '증강 1개 · 글 0개' (inactive OLD excluded)
})
it('expands and collapses a group', async () => { /* click 실버 → '하체 운동의 날' button visible with '글 3개'; click again → hidden */ })
it('search opens matching groups only', async () => {
  // type '하체운동' → 실버 open, 프리즘/골드 hidden; text '증강 1/1개 · 글 3개'
  // type 'zzz' → '검색 결과가 없어요'
})
it('opening an item writes ?open= and shows its panel', async () => {
  // router: open 실버, click '하체 운동의 날' → router.state.location.search '?open=ARAM_LegDay'; region '하체 운동의 날 게시글'
  // subtitle '실버 증강 · 게시글 3개'; click again → search '' and region gone
})
it('switching items keeps one panel', async () => { /* open legDay then 소나타 → only '소나타 게시글' region */ })
it('?open= opens its group and panel on load', async () => { /* '/augments?open=ARAM_LegDay' → 실버 expanded, region visible */ })
it('ignores unknown or inactive ?open= ids', async () => { /* '?open=OLD' and '?open=nope' → no region, groups collapsed */ })
it('panel disappears while search hides it and returns after', async () => {
  // '/augments?open=ARAM_LegDay', type '소나타' → no region; clear → region back
})
it('sorts by count', async () => { /* open 골드 with two gold augments, click '글 많은 순' → order by count desc */ })
it('shows loading then error', async () => { /* tag-counts 500 → '잠시 후 다시 시도해주세요' */ })

// ChampionsPage.test.tsx — champions [amumu, jinx], counts { champions: { Jinx: 5 } }
it('lists champions with counts and sorts', async () => {
  // name order 아무무, 징크스; '글 많은 순' → 징크스, 아무무; '글 0개' for 아무무
})
it('opens champion panel with ?open=', async () => { /* click 아무무 → '?open=Amumu', region '아무무 게시글', subtitle '게시글 0개' */ })
it('search with no result', async () => { /* 'zzz' → '검색 결과가 없어요' */ })
```

- [ ] **Step 2: Run to verify failure** — `npm test -- AugmentsPage ChampionsPage`. Expected: FAIL (modules not found).
- [ ] **Step 3: Implement both pages and the routes**
- [ ] **Step 4: Run every frontend check** — `npm test && npm run build && npm run lint`. Expected: PASS, lint clean.
- [ ] **Step 5: Commit** — `git commit -m "Add augment and champion browse pages"`

---

### Task 7: 전체 확인과 문서

- [ ] **Step 1: Run every automated check** — backend `./gradlew test`; frontend `npm test && npm run build && npm run lint`. Expected: all PASS.
- [ ] **Step 2: Restart the backend and check the resync.** Stop any old `com.aram.community.BackendApplication` on 8080 first, then run `bootRun`. Check:
  - The log shows "Game data synced to ...".
  - `GET /api/augments` has all three rarities.
  - The counts are close to the real data: roughly 71/104/74 minus the disabled ones and the ones without a name.
- [ ] **Step 3: Browser walkthrough (dev login, a few posts tagged with augments and champions)**
  1. Click the 증강 tab. It shows 프리즘·골드·실버 groups, folded. Open one and check the real icons.
  2. Click an augment. Posts open just below its row and the address has `?open=`. Open a post, press Back, and the same panel is open.
  3. Click 더 보기 (needs 6+ posts on one tag) and switch to 추천순.
  4. In the 챔피언 tab, open a champion that has posts. Check the 자주 함께 쓰는 증강 chips. A chip leads to the 증강 tab with that augment open.
  5. Search "하체운동" and switch to 글 많은 순.
  6. Narrow the window below 480px. The menu tabs wrap to a second row with no horizontal scroll, and the panel still sits under the clicked row.
- [ ] **Step 4: Update `CLAUDE.md`:**
  - 구조: add `scrap`, `profile` and the new `components/tags` if missing.
  - 남은 일: record this feature as done and add deferred minors from the final review.
  - Then commit with `git commit -m "Record tag browse feature in CLAUDE.md"`.
