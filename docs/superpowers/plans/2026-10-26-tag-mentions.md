# 본문 속 챔피언·증강 태그(@) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 글쓰기에서 `@`로 챔피언·증강을 골라 아이콘 + 굵은 이름 박스로 본문에 넣고(태그 칸 자동 추가), 글에서 증강 박스는 마우스·누르기로 증강 카드를 띄운다.

**Architecture:** 본문 인라인 원자 노드 `tagMention`({kind,id,label})을 서버 `PostContentValidator`와 화면 `editor/extensions.ts`가 함께 허용한다. 서버는 저장 때 박스의 챔피언·증강이 실제로 있는지 확인한다. 화면은 `@tiptap/suggestion`(`@` 메뉴)으로 넣고, 같은 React NodeView가 편집기와 글 보기에서 박스와 증강 카드 팝오버를 그린다.

**Tech Stack:** Spring Boot 4.1 / JPA; React 19, Tiptap 3.32, `@tiptap/suggestion`, `@floating-ui/dom`(이미 설치됨, suggestion의 의존), TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-26-tag-mentions-design.md`

## Global Constraints

- 가지 `tag-mentions`(이미 있음). 끝나면 `dev`에 합친다. 푸시는 사용자 요청 때만.
- 노드: `{ "type": "tagMention", "attrs": { "kind": "champion"|"augment", "id": "^[A-Za-z0-9_]{1,40}$", "label": 1~50자 } }`, 인라인·원자·자식/마크 없음. 서버 검사기·`editor/extensions.ts`·`editor/extensions.test.ts`를 함께 바꾼다.
- 한도: 한 글에 박스 30개, `@` 후보 8개, 태그 칸 챔피언 5·증강 10(기존).
- 문구(해요체, 그대로):
  - "본문 태그는 한 글에 30개까지 넣을 수 있어요"
  - "없는 챔피언·증강이 들어 있어요"
  - "태그 칸이 가득 차서 본문에만 넣었어요"
  - "챔피언이나 증강 이름을 쳐 주세요"
  - "불러오는 중…", "증강 정보를 불러오지 못했어요"
  - 메뉴 오른쪽 "챔피언"/"증강", 박스 `aria-label` "{이름} 증강 카드 보기"
- 검색은 `lib/tagSearch.ts`의 `matchesName`(띄어쓰기·대소문자 무시, 초성·섞어 쓰기) 재사용.
- 박스 모양: 높이 26(`h-[26px]`), 왼쪽 2·오른쪽 8, 간격 5(`gap-[5px]`), 테두리 1, 모서리 4(`rounded-mark`), 아이콘 20, 이름 굵게 15 `text-ink`. 챔피언 `bg-ice border-line-soft` 둥근 초상화. 증강 테두리 등급 색(`border-silver`/`border-gold-rarity`/`border-prismatic`)과 옅은 바탕.
- 박스는 눌러도 이동하지 않는다. 챔피언 박스는 동작이 없다.
- 카드 띄우기: 마우스 올림 200ms 뒤 열림, 박스·카드 밖으로 나가면 닫힘. 터치는 누르면 열고 닫음, 바깥 누르면 닫힘. Esc 닫힘. 선택 언어로 `translation ?? original` 한 장.

## Review Focus

- 목록·인용 안에서 `@` 박스를 넣은 본문 → 서버가 받고 글 보기가 같은 모양으로 그려야 한다 → Task 1 검사기 테스트(인용 안 박스), Task 3 렌더 테스트(목록 안 박스).
- 지워진(목록에 없는) 챔피언·증강 번호의 박스가 있는 예전 글 → 글 보기는 이름만으로 그려지고 깨지지 않아야 한다(서버 저장 검사와 별개) → Task 3 테스트.
- 박스를 복사해 다른 곳에 붙여넣기 → 같은 kind·id·label로 박스가 유지돼야 한다(HTML `span[data-tag-mention]` 왕복) → Task 3 테스트.
- 화면 아래쪽 박스의 카드 → 화면 밖으로 넘치지 않고 위로 뒤집혀야 한다 → Task 4는 floating-ui `flip`·`shift` 사용을 테스트(위치 계산 함수가 불렸는지), 실제 모양은 Task 7 브라우저 확인.
- 한글 입력 조합 중 `@ㅅ`→`@신` 같은 변화와 Enter → 조합 확정 Enter가 후보를 잘못 고르지 않아야 한다 → Task 7 브라우저 확인(jsdom 불가).

---

### Task 1: 서버 — `tagMention` 검사와 저장 확인

**Files:**
- Modify: `backend/src/main/java/com/aram/community/post/PostContentValidator.java`, `post/ValidatedContent.java`, `post/PostService.java`
- Test: `backend/src/test/java/com/aram/community/post/PostContentValidatorTest.java`, `backend/src/test/java/com/aram/community/post/PostMentionTest.java`(IntegrationTest)

**Interfaces:**
- Produces: `record Mention(String kind, String id)`(post 패키지), `ValidatedContent.mentions(): List<Mention>`(등장 순서, 중복 없음). `PostContentValidator.MAX_MENTIONS = 30`.

- [ ] **Step 1: 실패하는 테스트**
  - 검사기(테스트 도우미 `mention(kind, id, label)` 추가): `acceptsMentionAndCountsItsLabelAsText`(`doc(paragraph(text("오늘은 "), mention("champion","XinZhao","신짜오")))` → `mentions = [Mention(champion, XinZhao)]`, `plainText`에 "신짜오" 포함), `acceptsMentionOnlyBody`, `acceptsMentionInsideBlockquote`, `rejectsBadKind`("monster"), `rejectsBadId`("a-b", 41자), `rejectsBadLabel`(빈 값, 51자), `rejectsMentionWithContent`, `rejectsMoreThanThirtyMentions`("본문 태그는 한 글에 30개까지 넣을 수 있어요"), `sameMentionTwiceListedOnce`.
  - `PostMentionTest`(챔피언·증강·패치를 `jdbc`로 넣음): `savesExistingChampionAndAugmentMentions`, `rejectsUnknownMention`(400, `fieldErrors.content` "없는 챔피언·증강이 들어 있어요"), `acceptsInactiveAugmentMention`.
- [ ] **Step 2: 실패 확인** — `./gradlew test --tests '*PostContentValidatorTest' --tests '*PostMentionTest'`.
- [ ] **Step 3: 구현** — 검사기: `NODES`에 `tagMention`, `walk`에서 attrs 검사 후 `label`을 `text`에 더하고 mentions에 추가(인라인이라 줄바꿈 없음). 30개 초과는 박스 수(중복 포함) 기준. `PostService.prepare`: `content.mentions()`를 kind별로 모아 `champions.findAllById`·`augments.findAllById` 개수 비교, 다르면 `field("content", "없는 챔피언·증강이 들어 있어요")`.
- [ ] **Step 4: 통과 확인** — 같은 명령, 이어서 `./gradlew test` 전체.
- [ ] **Step 5: 커밋** — `"Allow champion and augment mention boxes in post bodies"`.

### Task 2: 화면 — `@` 후보 계산

**Files:**
- Create: `frontend/src/lib/mentionCandidates.ts`, `frontend/src/lib/mentionCandidates.test.ts`

**Interfaces:**
- Produces:
  - `type MentionKind = 'champion' | 'augment'`
  - `type MentionCandidate = { kind: MentionKind; id: string; name: string; iconUrl: string | null; rarity?: AugmentRarity; tinted?: boolean }`
  - `mentionCandidates(query: string, champions: Champion[], augments: Augment[]): MentionCandidate[]` — 빈 검색어(공백만 포함) → `[]`, 비활성 증강 제외, `matchesName`으로 거름, 이름이 정규화한 검색어로 **시작하는** 것 먼저, 그다음 `localeCompare(…, 'ko')`, 최대 8개.

- [ ] **Step 1: 실패하는 테스트** — `findsByInitials`(`ㅅㅉ` → 신짜오), `ignoresSpaces`, `startsWithFirst`(`거` → "거석상의 용기"가 "만능 거인"보다 앞), `capsAtEight`, `skipsInactiveAugments`, `blankQueryGivesNothing`, `mixesChampionsAndAugments`(같은 검색어에 둘 다).
- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib/mentionCandidates.test.ts`.
- [ ] **Step 3: 구현** — 위 Interfaces.
- [ ] **Step 4: 통과 확인**.
- [ ] **Step 5: 커밋** — `"Compute @ mention candidates from champions and augments"`.

### Task 3: 화면 — `tagMention` 노드와 박스

**Files:**
- Create: `frontend/src/editor/TagMentionNode.ts`, `frontend/src/editor/TagMentionView.tsx`, `frontend/src/components/TagMentionChip.tsx`
- Modify: `frontend/src/editor/extensions.ts`(`postExtensions()`에 노드), `frontend/src/editor/extensions.test.ts`, `frontend/src/editor/PostContentView.test.tsx`
- Test: `frontend/src/components/TagMentionChip.test.tsx`

**Interfaces:**
- Consumes: `useChampions()`, `useAugments()`(`api/gamedata.ts`), `AugmentIcon`.
- Produces:
  - `TagMentionNode`: 이름 `tagMention`, `group: 'inline'`, `inline: true`, `atom: true`, `selectable: false`, attrs `kind`·`id`·`label`(기본 null). `parseHTML: span[data-tag-mention]`(data-kind·data-id·data-label에서 읽음), `renderHTML: ['span', { 'data-tag-mention': '', 'data-kind', 'data-id', 'data-label' }, label]`, NodeView `TagMentionView`.
  - `TagMentionChip({ kind, id, label }: { kind: MentionKind; id: string; label: string })` — 목록에서 아이콘·등급을 찾아 박스를 그린다. 증강이면 Task 4의 `AugmentHoverCard`로 감싼다(Task 3에서는 감싸지 않은 박스만, Task 4가 감싸기 추가).

- [ ] **Step 1: 실패하는 테스트**
  - `extensions.test.ts`: 스키마 노드 목록에 `tagMention`.
  - `TagMentionChip.test.tsx`(mockApi로 `/api/champions`·`/api/augments`): 챔피언 → 둥근 초상화 `img`와 굵은 "신짜오", 증강 골드 → `border-gold-rarity` 클래스와 굵은 이름, 목록에 없는 번호 → 이름만(이미지 없음), 누름 → 주소 그대로(이동 없음).
  - `PostContentView.test.tsx`: 목록(`bulletList`) 안 문단의 `tagMention`이 박스로 그려짐.
  - 붙여넣기 왕복: 편집기(`postExtensions`)에 `<p>a <span data-tag-mention data-kind="augment" data-id="X" data-label="거석상의 용기">거석상의 용기</span></p>` HTML을 넣으면 `getJSON()`에 같은 attrs의 `tagMention`.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/editor src/components/TagMentionChip.test.tsx`.
- [ ] **Step 3: 구현** — 모양은 Global Constraints. 증강 바탕은 등급별 옅은 색(골드 `bg-gold-pale`, 프리즘 `bg-[#f3e8fb]`, 실버 `bg-ice`). `NodeViewWrapper as="span"`로 인라인.
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run lint`.
- [ ] **Step 5: 커밋** — `"Render champion and augment mention boxes in posts"`.

### Task 4: 화면 — 증강 카드 팝오버

**Files:**
- Create: `frontend/src/components/augment/AugmentHoverCard.tsx`, `AugmentHoverCard.test.tsx`
- Modify: `frontend/src/components/TagMentionChip.tsx`(증강이면 감싸기)

**Interfaces:**
- Consumes: `useAugmentDetail(id, language)`, `useLanguage()`, `AugmentCard`.
- Produces: `AugmentHoverCard({ augmentId, label, children }: { augmentId: string; label: string; children: ReactNode })` — 박스를 `role="button"`, `tabIndex=0`, `aria-label="{label} 증강 카드 보기"`, `aria-expanded` 인 `span`으로 감싸고, 열리면 `document.body`에 포털로 카드를 띄운다. 위치는 `@floating-ui/dom`의 `computePosition(reference, floating, { placement: 'bottom-start', middleware: [offset(6), flip(), shift({ padding: 8 })] })`.

- [ ] **Step 1: 실패하는 테스트** (fetch 흉내로 `/api/augments/X?lang=ko` 응답)
  - `opensOnHoverAfterDelay`: `pointerenter`(pointerType mouse) 뒤 200ms 안에는 카드 없음, 지나면 카드(증강 이름·설명) — vi 가짜 타이머.
  - `closesOnLeave`: 박스와 카드 밖으로 `pointerleave` → 닫힘.
  - `togglesOnTap`: `pointerType: 'touch'`로 누르기 → 열림, 다시 누르기 → 닫힘, 바깥 누르기 → 닫힘.
  - `escapeCloses`, `keyboardFocusOpens`.
  - `showsLoadingAndError`: 응답 전 "불러오는 중…", 500이면 "증강 정보를 불러오지 못했어요".
  - `usesSelectedLanguage`: localStorage `lang=en`이면 `?lang=en` 요청, 카드는 `translation ?? original`.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/components/augment/AugmentHoverCard.test.tsx`.
- [ ] **Step 3: 구현** — 위 Interfaces. 카드 상자는 `w-[280px]`, `shadow-pop`, 밤하늘 바탕(증강 탭 카드와 같은 틀).
- [ ] **Step 4: 통과 확인** — `npm test`.
- [ ] **Step 5: 커밋** — `"Show an augment's card when hovering or tapping its mention box"`.

### Task 5: 화면 — `@` 메뉴와 편집기 연결

**Files:**
- Create: `frontend/src/editor/MentionCommand.ts`, `frontend/src/editor/MentionMenu.tsx`, `frontend/src/editor/MentionMenu.test.tsx`
- Modify: `frontend/src/editor/extensions.ts`(`editorExtensions(mentions: MentionSource)`), `frontend/src/editor/PostEditor.tsx`

**Interfaces:**
- Consumes: Task 2 `mentionCandidates`, `MentionCandidate`, Task 3 노드.
- Produces:
  - `type MentionSource = { candidates(query: string): MentionCandidate[]; onPicked(kind: MentionKind, id: string): void; onError(message: string): void }`.
  - `MentionCommand`(`Extension.configure({ source })`): `Suggestion({ char: '@', allowSpaces: true, allowedPrefixes: [' '], pluginKey: 'mentionCommand' })`. 빈 검색어면 메뉴에 "챔피언이나 증강 이름을 쳐 주세요" 한 줄, 검색어가 있는데 후보가 없으면 메뉴 닫힘. 고르면: 본문 `tagMention`이 이미 30개면 `onError("본문 태그는 한 글에 30개까지 넣을 수 있어요")`, 아니면 `deleteRange(range)` + `{ type: 'tagMention', attrs: { kind, id, label: name } }` + `' '` 삽입 후 `onPicked(kind, id)`.
  - `PostEditor` 새 prop `onMention?: (kind: MentionKind, id: string) => void`. 편집기 안에서 `useChampions`·`useAugments`를 읽어 ref에 두고, `MentionSource`는 ref를 읽는다(편집기는 한 번만 만들어짐).
  - `MentionMenu`: `/` 메뉴(`SlashMenu`)와 같은 손잡이(`onKeyDown`), `role="listbox"` `aria-label="넣을 챔피언·증강"`, 한 줄 = 아이콘 + 이름 + 오른쪽 종류, 너비 240.

- [ ] **Step 1: 실패하는 테스트** (`SlashMenu.test.tsx` 방식: `dom.editor`로 글자 넣기, mockApi로 목록)
  - `@ㅅㅉ` → 목록에 "신짜오"와 "챔피언", Enter → 본문에 `tagMention`(kind champion, id XinZhao, label 신짜오) 뒤 띄어쓰기, `@ㅅㅉ` 글자 없음, `onMention('champion','XinZhao')` 호출.
  - `@`만 → "챔피언이나 증강 이름을 쳐 주세요".
  - `@없는이름` → 메뉴 없음.
  - Esc → 닫힘, `@…` 글자 남음.
  - 30개 있는 본문에서 고르기 → 알림 문구, 박스 추가 안 됨.
  - `/` 메뉴는 그대로 동작(회귀).
- [ ] **Step 2: 실패 확인** — `npx vitest run src/editor/MentionMenu.test.tsx`.
- [ ] **Step 3: 구현** — 위 Interfaces.
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run lint`.
- [ ] **Step 5: 커밋** — `"Insert champion and augment mentions with an @ menu"`.

### Task 6: 화면 — 태그 칸 자동 추가

**Files:**
- Modify: `frontend/src/pages/WritePage.tsx`
- Test: `frontend/src/pages/WritePageUploads.test.tsx`(가짜 편집기에 "흉내: 신짜오 멘션" 버튼 추가) 또는 새 `WritePageMentions.test.tsx`

**Interfaces:**
- Consumes: Task 5 `onMention`.

- [ ] **Step 1: 실패하는 테스트** — 멘션 → 챔피언 태그 칸에 신짜오 칩, 이미 있으면 그대로(중복 없음), 챔피언 5개 찬 상태 → 알림 "태그 칸이 가득 차서 본문에만 넣었어요"·추가 안 됨, 증강도 같은 규칙(10개).
- [ ] **Step 2: 실패 확인**.
- [ ] **Step 3: 구현** — `onMention`에서 kind별로 `championIds`/`augmentIds` 상태에 더함(`change(...)`로 dirty 표시), 한도면 `toast.show`.
- [ ] **Step 4: 통과 확인** — `npm test`.
- [ ] **Step 5: 커밋** — `"Add mentioned champions and augments to the post's tags"`.

### Task 7: 문서·브라우저 확인·검토·dev 합치기

- [ ] **Step 1: CLAUDE.md** — 기술 주의사항에 `tagMention` 노드(서버 검사기·`extensions.ts` 함께), `@` 메뉴·태그 자동 추가·증강 카드 팝오버, 남은 일 완료 항목.
- [ ] **Step 2: 전체 테스트** — 백엔드 `./gradlew test`, 화면 `npm test && npm run build && npm run lint`.
- [ ] **Step 3: 브라우저** — 개발 로그인 후 글쓰기: `@ㅅㅉ` 한글 입력으로 신짜오 넣기(조합 중 Enter 확인), 증강 넣기, 태그 칸 자동 추가, 목록 안에 넣기, 등록 → 글 보기 박스 모양, 증강 마우스 올림 카드·화면 아래쪽 박스에서 카드 위로 뒤집힘, 휴대폰 크기 누르기.
- [ ] **Step 4: 새 눈 검토** — 가지 전체 검토 후 중요한 것 고치기.
- [ ] **Step 5: `dev`에 합치기**.
