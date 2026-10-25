# 디자인 다듬기(칼바람 나락의 밤) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 화면을 연한 하늘색 + 밤하늘 머리말 + 금색 장식의 "칼바람 나락의 밤" 디자인으로 바꾸고, 설계 7장의 작은 기능 변화를 넣는다.

**Architecture:** 색·모서리·글꼴은 Tailwind 4 `@theme` 토큰으로 한 곳(`index.css`)에 두고, 반복되는 모양은 `components/ui/`의 작은 부품(버튼 클래스, 태그, 패치 묶음, 두 칸 선택, 검색칸, 금색 모서리 틀, 머리 띠, 빈 화면)으로 만든다. 화면 파일은 그 부품과 토큰 이름만 쓴다. 서버는 프로필 통계에 받은 추천 수 하나만 더한다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, React Router, TanStack Query, Vitest + Testing Library; Spring Boot 4 / JPA.

**Spec:** `docs/superpowers/specs/2026-10-25-design-polish-design.md` (목업: 같은 폴더 `2026-10-25-design-polish-mockup-main.html`, `-screens.html`)

## Global Constraints

- 색 값·글자 크기·버튼 높이·모서리 반경은 설계 3장 표의 값만 쓴다(4px 배수, 글자 28/20/17/15/13, 버튼 56/48/44/40/36, 모서리 0/4/8/원).
- 담는 것은 각지게(0), 누르는 것은 둥글게(8), 작은 표시는 4. 비스듬히 깎은 모서리 없음.
- 화면 문구는 지금 문구 그대로. 새 요소만 새 문구(해요체).
- 다크 모드 없음. `slate-*`, `amber-*`, `emerald-*`, `indigo-*`, `rose-*` 같은 옛 색 클래스는 남기지 않는다(증강 카드 내부 `components/augment/AugmentCard.tsx`는 예외: 손대지 않음).
- 휴대폰 기준은 `sm`(640px). 640px 미만에서 가로 스크롤 없음.
- 커밋·푸시는 사용자 확인 전까지 하지 않는다(이번 작업 한정). 각 작업 끝의 "Commit" 단계는 "변경 목록 확인"으로 대신한다.

## Review Focus

- 긴 닉네임(12자)·긴 제목(100자)·태그 15개(챔피언 5 + 증강 10)인 글이 목록 한 줄과 휴대폰 폭에서 넘치지 않아야 한다 → Task 4에 긴 값 렌더 테스트, Task 12 화면 확인에 긴 값 글 포함.
- 패치 목록을 못 불러왔을 때(`/api/patches` 실패) 패치 묶음은 "최신" 없이 번호만 보여야 하고 화면이 깨지지 않아야 한다 → Task 2 `VersionChip` 테스트.
- 프로필 사진 주소가 없거나 닉네임이 빈 사용자(닉네임 정하기 전) → 첫 글자 대신 빈 원 → Task 2 `Avatar` 테스트.
- 로그인 전 글쓰기 버튼을 눌렀을 때 → 지금처럼 로그인 안내 화면 → Task 3 머리말 테스트.
- 비공개 프로필의 받은 추천 수가 새지 않아야 한다 → Task 9 서버 테스트.

---

### Task 1: 토큰·글꼴·화면 틀

**Files:**
- Modify: `frontend/src/index.css`, `frontend/index.html`, `frontend/src/components/AppLayout.tsx`, `frontend/src/pages/ErrorPage.tsx`

**Interfaces:**
- Produces: Tailwind 색 `night night-2 ice surface line line-soft gold gold-deep gold-pale teal teal-hi teal-ink ink ink-2 ink-3 discord danger prismatic gold-rarity silver`(값은 설계 3.1), 반경 `rounded-mark`(4px)·`rounded-touch`(8px), 글꼴 `font-display`(Hahmlet)·`font-sans`(Noto Sans KR), 그림자 `shadow-pop`(메뉴·알림용 `0 12px 28px #0c1f2e29`).
- `AppLayout`의 `<main>`은 폭을 정하지 않는다(화면마다 `max-w-[1120px]` 또는 `max-w-[768px]` + 좌우 24/16px). 공통 상수로 `components/ui/layout.ts`에 `PAGE_WIDE = 'mx-auto w-full max-w-[1120px] px-4 sm:px-6'`, `PAGE_NARROW = 'mx-auto w-full max-w-[768px] px-4 sm:px-6'`.

- [ ] Step 1: `index.html`에 Google Fonts 링크(Hahmlet 700, Noto Sans KR 400;500;700, `display=swap`)와 `preconnect`.
- [ ] Step 2: `index.css`에 `@theme` 토큰, `body { background: var(--color-ice); color: var(--color-ink); font-family: var(--font-sans) }`, 본문 표시(`.post-content`) 색을 새 토큰으로(인용 왼쪽 선 gold, 글 ink-2, 이미지 모서리 0).
- [ ] Step 3: `AppLayout`/`ErrorPage`의 옛 색 클래스 교체, `<main>`을 `pt-8 pb-12`만.
- [ ] Step 4: `npm run build` 통과, `npm test` 통과(색만 바뀌어 기존 테스트 그대로).

### Task 2: 공통 부품

**Files:**
- Create: `frontend/src/components/ui/button.ts`, `ui/VersionChip.tsx`, `ui/TagChip.tsx`(옛 `components/TagChip.tsx` 대체), `ui/Segmented.tsx`(옛 `SortPills` 대체), `ui/SearchInput.tsx`, `ui/CornerFrame.tsx`, `ui/HeroBand.tsx`, `ui/EmptyState.tsx`, `ui/icons.tsx`(디스코드·연필·돋보기·자물쇠 SVG)
- Modify: `frontend/src/components/Avatar.tsx`, `frontend/src/components/SortPills.tsx`(Segmented를 쓰도록 얇게) 
- Test: `ui/VersionChip.test.tsx`, `ui/TagChip.test.tsx`, `ui/Segmented.test.tsx`, `components/Avatar.test.tsx`

**Interfaces:**
- `buttonClass(variant: 'primary' | 'discord' | 'gold' | 'ghost' | 'quiet', size: 56 | 48 | 44 | 40 | 36): string` — `<button>`·`<Link>` 모두에 쓰는 클래스. primary=청록 그라데이션 흰 글자, discord=`#5865f2`, gold=금색 그라데이션 남색 글자, ghost=surface 바탕 + line 테두리, quiet=글자만(13px ink-3, 마우스 올리면 밑줄). 모두 `rounded-touch`, 높이=size, 포커스 링 teal.
- `VersionChip({ patch }: { patch: string })` — `usePatches()`의 `current`와 같으면 "최신"을 붙인다. 글자는 `{patch} 버전`. 지금 패치: `bg-[#e1f3f5] border-[#a9dadf] text-teal-ink`, "최신"은 gold 바탕 11px. 아니면 line 테두리 + ink-3.
- `TagChip({ kind, id, nameKo, imageUrl, rarity?, tinted?, size: 'sm' | 'md' | 'lg', link?: boolean, onRemove?: () => void, extra?: ReactNode })` — 아이콘+이름 한 덩어리. sm 28(아이콘 20, 13px), md 36(아이콘 28, 15px), lg 48(아이콘 36, 15px). `link`면 모아보기 `<Link>`(`/champions/:id`, `/augments/:id`), `onRemove`면 끝에 `aria-label="{이름} 빼기"` ✕ 버튼(28px, 마우스 올리면 danger). `extra`는 이름 뒤 금색 숫자 등.
- `Segmented<T extends string>({ options: { value: T; label: string }[], value: T, onChange(v: T), label: string })` — 40px 두 칸 붙은 선택, 각 버튼 `aria-pressed`. 감싸는 `role="group"` + `aria-label={label}`.
- `SearchInput({ value, onChange, placeholder, label })` — 44px, 돋보기 아이콘, `type="search"`, `aria-label={label}`.
- `CornerFrame({ children, className?, size?: 12 | 16, as?: 'div' | 'li' | 'section' | 'article' })` — 왼쪽 위·오른쪽 아래 금색 ㄱ자(2px). `data-corner-frame` 속성을 단다.
- `HeroBand({ media: ReactNode, eyebrow?: ReactNode, title: string, sub?: ReactNode, action?: ReactNode })` — 밤하늘 띠(night→night-2), 아래 금색 2px, 제목 28 `font-display` 흰색 `<h1>`.
- `EmptyState({ icon?: 'diamond' | 'lock', title: string, children?: ReactNode, action?: ReactNode })` — 금색 마름모(또는 자물쇠 원), 20px 제목, 15px 설명, 버튼 하나.
- `Avatar({ src, size, name? })` — 사진이 없으면 남색 원에 `name`의 첫 글자(gold-pale, 크기의 40%). `name`이 없거나 빈 글이면 글자 없는 남색 원. 항상 금색 1px 테두리(바탕과 2px 띄움, `ring` 사용).

- [ ] Step 1: 실패하는 테스트
  - `VersionChip`: `GET /api/patches` → `{current:'26.21', patches:[...]}`일 때 `26.21` 묶음에 `최신`이 보이고, `26.20`에는 없다. `/api/patches`가 500이면 `26.21 버전`만 보이고 `최신`이 없다.
  - `TagChip`: sm 챔피언은 이름 "아무무"가 보이고 링크가 아니다. lg + `link`는 `href="/augments/ARAM_LegDay"`. `onRemove`는 "아무무 빼기" 버튼을 누르면 한 번 불린다.
  - `Segmented`: 지금 값만 `aria-pressed="true"`, 다른 칸을 누르면 `onChange('likes')`.
  - `Avatar`: `src=null, name='민수'`면 "민" 글자, `name=''`면 글자 없음, `src` 있으면 `<img>`.
- [ ] Step 2: `npx vitest run src/components/ui src/components/Avatar.test.tsx` 실패 확인.
- [ ] Step 3: 위 인터페이스대로 구현. `SortPills`는 `Segmented`를 감싸기만 한다(옵션 최신순/추천순, label "정렬").
- [ ] Step 4: 같은 명령으로 통과 확인 + `npm test` 전체.

### Task 3: 머리말·내 메뉴·떠 있는 글쓰기·알림

**Files:**
- Modify: `components/Header.tsx`, `components/LanguageSelect.tsx`, `components/Toast.tsx`, `components/AppLayout.tsx`
- Create: `components/WriteFab.tsx`
- Test: `components/Header.test.tsx`, `components/WriteFab.test.tsx`

**Interfaces:**
- 머리말(설계 4장·5.11): PC 64px 한 줄(로고 마름모 + "증강 칼바람" font-display 22 gold-pale · NavLink 3개, 선택은 gold-pale + 아래 금색 3px · 빈칸 · 언어 · 글쓰기 `buttonClass('primary',44)` 연필 아이콘 · 로그인 `buttonClass('discord',44)` 디스코드 아이콘 "디스코드로 로그인" 또는 내 사진 36 버튼). 휴대폰: 56px 줄(로고 · 언어 · 로그인 "로그인"/내 사진) + 48px 탭 줄(3등분), 글쓰기 링크는 `hidden sm:inline-flex`.
- 글쓰기 링크는 로그인 전에도 보인다(`/write`).
- 내 메뉴: `role="menu"`, 220px, 맨 위 닉네임 + "디스코드로 로그인함"(13), 항목 `내 프로필`·`프로필 수정`(`/settings/profile`)·`로그아웃`(danger), 항목 높이 44. 메뉴 버튼 `aria-label="내 메뉴"`.
- `WriteFab()`: `sm:hidden fixed right-4 bottom-[max(20px,env(safe-area-inset-bottom))]` 56px 청록 `<Link to="/write" aria-label="글쓰기">`. `AppLayout`이 경로가 `/`, `/augments`, `/champions`, `/augments/:id`, `/champions/:id`, `/users/:id`일 때만 그린다(`matchPath` 목록).
- 알림: 화면 아래 가운데(`bottom-6`), night 바탕 + gold 테두리 + gold-pale 15px, 모서리 0.

- [ ] Step 1: 실패하는 테스트: 로그인 전 머리말에 `글쓰기` 링크(`href="/write"`)와 `디스코드로 로그인` 버튼; 로그인 후 `내 메뉴`를 누르면 `프로필 수정` 메뉴 항목(`href="/settings/profile"`); `WriteFab`이 `/`에서 보이고 `/posts/5`에서는 없다(`AppLayout`을 라우트로 렌더).
- [ ] Step 2: 실패 확인 → Step 3 구현 → Step 4 `npx vitest run src/components` 통과.

### Task 4: 글 목록 한 줄·목록 틀·페이지 번호·메인

**Files:**
- Modify: `components/PostListItem.tsx`, `components/PostList.tsx`, `components/Pagination.tsx`, `components/PastLastPage.tsx`, `pages/HomePage.tsx`
- Test: `components/PostListItem.test.tsx`, `pages/HomePage.test.tsx`, `components/Pagination.test.tsx`

**Interfaces:**
- 일반 한 줄(설계 5.1): `CornerFrame`(추천 ≥1일 때만, 아니면 같은 모양의 평범한 `<li>`) 안에 3칸 그리드 `grid-cols-[64px_minmax(0,1fr)_48px]`(휴대폰 `48px …36px`). 왼쪽: 작성자 `<Link to=/users/:id>` 안에 `Avatar size 40(휴대폰 32) name` + 이름 13 말줄임. 가운데: 제목 `<Link>` 20 굵게 night `break-words`(휴대폰 17) → 태그 줄 `TagChip size="sm"`(챔피언 먼저) → `VersionChip` · `relativeTime` · `댓글 n`(13 ink-3). 오른쪽: 금색 삼각형 + 숫자(`aria-label="추천 n"`), 0이면 `text-[#a3b3c0]`.
- 한 줄(compact) 모양(설계 4장 "한 줄 글 목록"): 56px, `Avatar 28` · 제목 15 굵게 말줄임 · 작성자 13(`hidden sm:inline`) · `VersionChip` · 시간 13(`hidden sm:inline`) · 추천 수.
- `PostList`: 목록 `<ul className="flex flex-col gap-2">`, 정렬은 `SortPills`(=Segmented), 오류·빈 화면은 `EmptyState`.
- `Pagination`: 40px 정사각 `rounded-touch`, 현재 페이지 night 바탕 gold-pale 글자, "다음 ›"은 `aria-label="다음 페이지"` 그대로.
- `HomePage`: `PostList`의 `header`로 `<h1 className="font-display text-[28px]">전체 글</h1>` + `글 {totalItems}개`(13). 빈 목록은 `EmptyState title="아직 글이 없어요. 첫 글을 써보세요"` + 글쓰기 버튼.

- [ ] Step 1: 실패하는 테스트(`PostListItem.test.tsx`): 작성자 이름 링크가 사진과 같은 링크 안에 있다(`getByRole('link', {name: /양호/})` 하나); 태그 이름 "아무무"·"하체 운동의 날"이 글자로 보인다; `26.21 버전`; `추천 24`; 추천 0인 글에는 `[data-corner-frame]`이 없고 24인 글에는 있다; 100자 제목 + 12자 닉네임 + 태그 15개 글도 렌더된다(넘침은 Task 12에서 눈으로).
- [ ] Step 2: `HomePage.test.tsx`의 옛 기대값 고치기: `getByAltText('아무무')` → `getByText('아무무')`, `'26.21'` → `'26.21 버전'`, `getByLabelText('댓글 8개')` → `getByText('댓글 8')`. 화면 제목 `전체 글`과 `글 1개`.
- [ ] Step 3: 실패 확인 → 구현 → `npx vitest run src/components src/pages/HomePage.test.tsx` 통과.

### Task 5: 글 상세·추천·스크랩·댓글

**Files:**
- Modify: `pages/PostDetailPage.tsx`, `components/LikeButton.tsx`, `components/ScrapButton.tsx`, `components/CommentSection.tsx`, `pages/NotFoundPage.tsx`
- Test: `pages/PostDetailPage.test.tsx`, `components/CommentSection.test.tsx`

**Interfaces:**
- 설계 5.2: `PAGE_NARROW`, "‹ 목록으로" 13, `CornerFrame size 16` 안쪽 32(휴대폰 20). 제목 28 font-display. 메타: `Avatar 32 name` · 이름 15 굵게 · 시간 · `수정됨` · `VersionChip` · 오른쪽 `수정`(Link)·`삭제`(button) `buttonClass('quiet', …)`. 태그 `TagChip size="lg" link`. 추천 `buttonClass('gold',48)` 최소 폭 144, 글자 "▲ 추천 n"(지금 버튼 이름 `/추천 24/` 유지). 스크랩 `buttonClass('ghost',48)` 청록 글자, 문구 그대로.
- 댓글: "댓글 n"(20, 숫자 gold-deep), 입력칸 + 등록(`primary`, 입력칸 높이), 항목 `Avatar 36 name`, 이름 15, 시간 13, 내용 15. 수정/삭제는 quiet.
- `NotFoundPage({ message })`: `EmptyState title={message}` + `Link` "메인으로 가기"(`buttonClass('primary',44)`).

- [ ] Step 1: 기존 테스트에서 `26.21` → `26.21 버전`으로 고치고, 태그 링크 이름(`/아무무$/` 등)이 여전히 맞는지 확인. 실패 확인.
- [ ] Step 2: 구현 → `npx vitest run src/pages/PostDetailPage.test.tsx src/components/CommentSection.test.tsx src/components/ScrapButton.test.tsx` 통과.

### Task 6: 증강·챔피언 탭(검색, 묶음, 칸, 펼침 영역)

**Files:**
- Modify: `components/tags/TagToolbar.tsx`, `components/tags/TagGrid.tsx`, `components/tags/TagPostsPanel.tsx`, `components/tags/TopAugments.tsx`, `components/tags/TagPageStatus.tsx`, `pages/AugmentsPage.tsx`, `pages/ChampionsPage.tsx`, `components/augment/AugmentCards.tsx`(바깥 감싸개만)
- Test: `components/tags/TagGrid.test.tsx`, `components/tags/TagPostsPanel.test.tsx`, `pages/AugmentsPage.test.tsx`, `pages/ChampionsPage.test.tsx`

**Interfaces:**
- `TagToolbar`: 화면 제목 줄은 페이지가 그린다(`증강` + `증강 n개 · 글 n개` / `챔피언` + `챔피언 n명`). 툴바 = `SearchInput label="이름 검색"`(남은 폭) + `Segmented label="목록 정렬"`(가나다순/글 많은 순). 휴대폰은 검색칸 한 줄 전체.
- `GridItem`에서 `count`를 뺀다. 칸: `rounded-touch` 버튼, 아이콘 56(휴대폰 48, 증강 `frame="image"`, 챔피언 원 + 금색 ring), 이름 13 두 줄 말줄임. 펼친 칸 `border-2 border-gold` + 아래 금색 화살표. 격자 `grid-cols-[repeat(auto-fill,minmax(104px,1fr))]`(휴대폰 3칸).
- 등급 묶음(AugmentsPage): 56px 머리 버튼(왼쪽 4px 등급색 세로줄, 이름 17 굵게, `증강 n개 · 글 n개` 13, 접힘 표시), 묶음 상자 surface + line-soft, 모서리 0. 문구 그대로.
- `TagPostsPanel` 새 props: `media?: ReactNode`(머리 아이콘 48), `moreTo?: string`(「모아보기 ›」 링크). 머리: media · 제목 20 font-display `<h2>` · subtitle 13 · moreTo 링크 · 닫기 40(`aria-label="닫기"`). 틀은 `CornerFrame size 16` 안쪽 24. 「더 보기 (n개 남음)」 버튼 이름 그대로, `buttonClass('ghost',44)` 폭 전체. 한 줄 목록은 `PostListItem compact`.
- `AugmentCards` 바깥: 펼침 영역에서 `bg-[radial-gradient(...night-2, night)] border border-night px-3 py-6`로 감싼다(`AugmentsPage`의 children 감싸개, 카드 부품은 손대지 않음).
- `TopAugments`: 제목 "자주 함께 쓰는 증강"(15 ink-2) + `TagChip size="sm"` 각 링크(`/augments?open=`) + `extra`로 금색 숫자.

- [ ] Step 1: 테스트 고치기/추가: TagGrid 칸에 `글 n개`가 없다(옛 `getByText('글 2개')` → `queryByText(/글 \d/)`가 null); AugmentsPage/ChampionsPage의 칸 글 수 기대 삭제, 묶음 머리 `증강 2개 · 글 1개`는 유지; 펼침 영역에 `모아보기` 링크(`href="/augments/ARAM_LegDay"`).
- [ ] Step 2: 실패 확인 → 구현 → `npx vitest run src/components/tags src/pages/AugmentsPage.test.tsx src/pages/ChampionsPage.test.tsx` 통과.

### Task 7: 모아보기 페이지

**Files:** Modify `pages/TagPage.tsx`; Test `pages/TagPage.test.tsx`

**Interfaces:** `PAGE_WIDE`. "‹ 증강 목록"(`/augments`) 또는 "‹ 챔피언 목록"(`/champions`) 13. `HeroBand media={아이콘 72}` eyebrow=`프리즘 증강`/`골드 증강`/`실버 증강`/`챔피언`(13 gold), title=이름, sub=`이 태그가 붙은 글 n개`(문구 그대로) + 게임에서 빠진 증강이면 `현재 게임에 없음`. 옛 "✕ 전체 글 보기"는 뒤로 가기 링크로 대체. 아래 `PostList`.

- [ ] Step 1: 테스트: `heading level 1` 이름, `‹ 증강 목록` 링크 `href="/augments"`. 실패 확인 → 구현 → 통과.

### Task 8: 글쓰기·글 수정

**Files:** Modify `pages/WritePage.tsx`, `components/TagPicker.tsx`, `editor/PostEditor.tsx`; Test `pages/WritePage.test.tsx`, `components/TagPicker.test.tsx`

**Interfaces:**
- 설계 5.6. `PAGE_NARROW`, 제목 28 font-display, 폼 틀 surface + line-soft 안쪽 32(휴대폰 16), 칸 사이 24, 칸 이름 15 굵게, 도움말 13.
- 제목 입력칸 48, 17 굵게. 편집기: 서식 줄 36px 버튼(`굵게`·`기울임` | `• 목록`·`1. 목록`·`❝ 인용` | `이미지`, 켜진 것 night 바탕), 글 영역 최소 220 17px.
- 챔피언·증강 칸 이름 줄 오른쪽 `{n} / {max}`(13 ink-3, tabular-nums).
- `TagPicker`: 위에 검색 입력 44(돋보기, 지금 `aria-label="{label} 검색"`·combobox 그대로), 아래 고른 것 `TagChip size="md" onRemove`. 목록 상자는 surface + shadow-pop, 항목 44.
- 패치: 네이티브 `<select>` 48(옵션 글자 `26.21 버전`, 지금 패치 `26.21 버전 (최신)`) 옆에 고른 값 `VersionChip`. 도움말 그대로.
- 아래 고정 띠: `sticky bottom-0` 흰 바탕 + 위 선, 안쪽 `PAGE_NARROW`, 오른쪽 끝 등록(`primary` 44, 최소 폭 120, 수정이면 "수정 완료") · 그 왼쪽 취소(`ghost` 44, `navigate(-1)`, 작성 중이면 지금 나가기 확인이 그대로 뜬다). 휴대폰은 등록이 남은 폭 전부.

- [ ] Step 1: 테스트: 옵션 이름 `'26.21 버전 (최신)'`(옛 `'26.21 (현재 패치)'` 교체); 챔피언 하나 고르면 `1 / 5`; `취소` 버튼이 있다. 실패 확인 → 구현 → `npx vitest run src/pages/WritePage.test.tsx src/components/TagPicker.test.tsx` 통과.

### Task 9: 받은 추천 수(서버)

**Files:** Modify `backend/src/main/java/com/aram/community/profile/ProfileResponse.java`, `ProfileService.java`, `post/PostRepository.java`; Test `backend/src/test/java/com/aram/community/profile/ProfileApiTest.java`; Modify `frontend/src/api/types.ts`, `frontend/src/test/fixtures.ts`

**Interfaces:**
- `ProfileResponse.Stats(long postCount, long commentCount, long scrapCount, long receivedLikeCount)` → JSON `stats.receivedLikeCount`.
- `PostRepository.sumLikeCountByAuthorId(long authorId): long` — `select coalesce(sum(p.likeCount), 0) from Post p where p.author.id = :authorId`.
- 프런트 `Profile['stats']`에 `receivedLikeCount: number`.

- [ ] Step 1: 테스트: 글 두 개에 추천 2·3 → `$.stats.receivedLikeCount == 5`; 다른 사람의 글 추천은 세지 않음; 비공개 프로필을 남이 보면 `$.stats`가 없다(지금 규칙 그대로).
- [ ] Step 2: `./gradlew test --tests 'com.aram.community.profile.ProfileApiTest'` 실패 → 구현 → 통과.

### Task 10: 프로필

**Files:** Modify `pages/ProfilePage.tsx`, `components/profile/ProfileHeader.tsx`, `ProfileStats.tsx`, `ActivityHeatmap.tsx`, `ProfileTabs.tsx`, `MyCommentItem.tsx`; Test `pages/ProfilePage.test.tsx`, `components/profile/ActivityHeatmap.test.tsx`

**Interfaces:**
- 설계 5.7. `ProfileHeader` → `HeroBand media={Avatar 96 name}` eyebrow=내 프로필이면 `내 프로필 · 공개`/`내 프로필 · 비공개`, title=닉네임, sub=`{dottedDate} 가입`, action=내 프로필이면 `Link` "프로필 수정"(ghost 40, 금색 선, 밤하늘 위 글자 gold-pale).
- `ProfileStats`: 작성한 글 · 작성한 댓글 · 받은 추천(28 font-display + 13 설명, 칸 사이 세로선). 가입일 칸 삭제.
- 잔디 색: `#e2ebf1 #9fdde3 #4fc1cc #12939f #0a5f6a`(0~4). `data-level`·`title` 그대로.
- 탭 48, 선택 night 굵게 + 금색 밑줄 3px, 개수 13 ink-3. 목록은 일반 글 카드, 댓글 탭은 surface 카드 줄(내용 15, 「제목」 링크 teal-ink).
- 비공개(남이 볼 때): `EmptyState icon="lock" title="프로필이 비공개로 설정되었어요"`, 내 비공개 안내 문구는 그대로 info 상자.

- [ ] Step 1: 테스트 고치기: `가입 2026.10.24` → `2026.10.24 가입`; `내 프로필이에요` → `내 프로필 · 공개`(공개 표시 `공개` 단독 텍스트 기대는 이 문구로 대체); 통계에 `받은 추천`과 숫자. 실패 확인 → 구현 → `npx vitest run src/pages/ProfilePage.test.tsx src/components/profile` 통과.

### Task 11: 프로필 수정·닉네임 정하기·상태 화면

**Files:** Modify `pages/ProfileEditPage.tsx`, `pages/WelcomePage.tsx`, `pages/WritePage.tsx`(로그인 안내 부분), `components/PastLastPage.tsx`; Test 기존 `ProfileEditPage.test.tsx`, `WelcomePage.test.tsx`

**Interfaces:** 설계 5.8·5.9·5.10. 폼은 Task 8과 같은 틀·입력칸 48·도움말 13. 사진 `Avatar 96 name` + `사진 바꾸기`(ghost 40 청록 선) + `디스코드 사진으로 되돌리기`(quiet) — 이름·`data-testid` 그대로. 공개 설정: 줄 전체 상자 안 스위치 48×28(`role="switch"`, `aria-label` 그대로), 켜지면 teal. 저장(primary 44 최소 120)·취소(ghost 44) 오른쪽 아래. 닉네임 정하기 폭 384 가운데. 글쓰기 로그인 안내·`PastLastPage`는 `EmptyState`(문구 그대로, 버튼 primary 44).

- [ ] Step 1: 기존 테스트가 그대로 통과하는지 먼저 돌려 보고(문구 유지), 구현 후 `npx vitest run src/pages` 통과.

### Task 12: 전체 확인

- [ ] Step 1: `cd frontend && npm test && npm run build && npm run lint`, `cd backend && ./gradlew test` 모두 통과.
- [ ] Step 2: `grep -rn "slate-\|amber-\|emerald-\|indigo-\|rose-\|sky-\|fuchsia-\|green-" frontend/src --include=*.tsx | grep -v augment/AugmentCard.tsx | grep -v test` 결과 없음.
- [ ] Step 3: 백엔드·프런트 개발 서버를 띄우고, 화면 모음 캡처 스크립트(스크래치패드 `capture/capture.mjs`)로 21개 화면을 PC 1280·휴대폰 390으로 다시 찍는다. 긴 제목·긴 닉네임·태그 15개 글을 예시 자료에 하나 더 넣는다.
- [ ] Step 4: 찍은 화면을 목업과 비교해 어긋난 곳(넘침, 가로 스크롤, 대비)을 고친다. 휴대폰 폭 `document.documentElement.scrollWidth <= 390` 확인.
- [ ] Step 5: 새 화면 모음을 Artifact로 올리고, CLAUDE.md "남은 일"과 메모리를 고친다. 커밋하지 않고 사용자에게 결정 사항과 함께 보고.
