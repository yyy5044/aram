# 아이템 탭·아이템 태그 설계

- 작성일: 2026-10-26
- 상태: 사용자 검토 대기
- 기반: `2026-10-24-tag-browse-design.md`(증강·챔피언 탭), `2026-10-26-tag-mentions-design.md`(본문 태그), `2026-10-24-augment-card-design.md`(설명 계산)

## 1. 목적

챔피언·증강에는 탭과 태그가 있지만 아이템은 없다. 글에서 "어떤 아이템을 가라"고 말하려면 아이템을 태그할 수 있어야 하고, 아이템별 글도 모아 볼 수 있어야 한다. 그리고 칼바람은 협곡과 상점 목록·아이템 수치가 조금씩 다르므로 **증강 칼바람 기준**으로 보여준다.

**성공 기준**
- 위쪽 메뉴의 **아이템** 탭에서 증강 칼바람 상점의 아이템을 게임 상점과 같은 단계별 묶음으로 보고, 하나를 누르면 설명·재료·글 목록이 그 아래로 펼쳐진다.
- 아이템 설명의 수치가 **증강 칼바람 수치**다(예: 강철심장 "피해의 5%만큼 최대 체력", 협곡은 10%).
- 글쓰기에서 아이템 태그 칸과 본문 `@` 메뉴로 아이템을 태그하고, 본문 아이템에 마우스를 올리면 작은 설명 상자가 뜬다.

## 2. 범위

**포함**: 아이템 데이터 동기화(상점 목록·수치·설명 계산·한국어/영어), 아이템 탭(`/items`), 아이템 태그 페이지(`/items/:itemId`), 글쓰기 아이템 태그 칸, `@` 메뉴 아이템 후보, 본문 아이템 박스와 설명 상자, 글 목록·글 화면의 아이템 태그, 글 수 집계.

**제외**: 협곡·다른 모드 아이템, 협곡과의 비교 표시, 능력치별 거르기, 패치별 아이템 변경 이력, 챔피언 탭의 "자주 함께 쓰는 아이템".

## 3. 데이터

### 3.1 출처 (CommunityDragon `latest`, 증강과 같은 동기화에서 받는다)

| 자료 | 주소 | 쓰는 곳 |
|---|---|---|
| 칼바람 맵 | `game/data/maps/shipping/map12/map12.bin.json` | `Maps/Shipping/Map12/Modes/KIWI`의 `itemLists`가 가리키는 `GameModeItemList`들의 `mItems` 합집합 = 증강 칼바람 상점 목록 |
| 아이템 | `game/items.cdtb.bin.json` | `ItemData`: `itemID`, `price`(조합 가격), `recipeItemLinks`(재료), `epicness`(최상위 값), `mCategories`, 능력치 필드(`mFlatHPPoolMod` 등), `mDataValues`, `mItemCalculations`, `DataValuesModeOverride`, `mItemDataAvailability.mInStore` |
| 문자열 표 | `game/{ko_kr,en_us}/data/menu/en_us/lol.stringtable.json` | `item_{id}_name`, 설명 틀 `generatedtip_item_{id}_description`, 그 안의 `{{ … }}` 참조 |
| 아이콘 | Data Dragon `cdn/{버전}/img/item/{id}.png` | 칼바람 전용(`126697`, `994403` 등)까지 모두 있음을 확인(2026-10-26) |

- 상점 목록 중 **살 수 있는 것만** 받는다: `mInStore`가 참이고(없으면 상점에 없는 것) 총가격이 0보다 크며 특정 챔피언 전용이 아닌 것. 16.21 기준 192개.
- 같은 이름의 아이템이 여럿이어도(협곡판 `6697` 오만, 칼바람판 `126697` 오만) 상점 목록에 있는 번호만 받으므로 화면에는 칼바람판 하나만 있다.
- 총가격 = 자기 가격 + 재료 총가격(재귀). `into`(상위 아이템)는 받은 아이템들의 재료 관계를 뒤집어 만들고, 상점 목록에 있는 것만 남긴다.
- 재료가 같은 아이템을 두 번 쓰면 두 번 보인다(`recipeItemLinks` 순서 그대로).

### 3.2 단계 묶음

게임 상점 묶음(`ItemShopGameModeData.AllItemGroupDefinitionsOverride`)을 따르되, 신발은 따로 뺀다.

| 묶음 | 규칙 | 16.21 예 |
|---|---|---|
| 증강 칼바람 전용 | `epicness` 8, 그리고 7 중 소모품이 아닌 것 | 공허의 불길, 궁극의 히드라, 우글렛의 마녀 모자, 황금 뒤집개, 추가 능력치 |
| 전설 | 5 | 강철심장, 무한의 대검 … |
| 서사 | 4 (신발 제외) | 거인의 허리띠, 쇠사슬 조끼 … |
| 신발 | 분류에 `Boots`가 있는 것 | 장화, 광전사의 군화 … |
| 기본 | 2 또는 없음 | 롱소드, 루비 수정 … |
| 시작·소모품 | 0·1·3, 그리고 분류에 `Consumable`이 있는 것 | 수호자 4종, 물약, 여신의 눈물, 카파 주스, 영약 3종 |

판정 순서는 epicness 8 → 신발 → 시작·소모품 → 나머지 표 순서. epicness는 `ItemData` 최상위 값만 쓴다(`mItemDataClient.epicness`는 상점 묶음과 다르다). 화면 순서도 위 표 순서. 단계 값은 DB에 문자열(`AUGMENT_MODE`, `LEGENDARY`, `EPIC`, `BOOTS`, `BASIC`, `STARTER`)로 저장한다. 처음 구현 때 192개가 모두 한 묶음에 들어가는지 테스트로 확인하고, 규칙에 안 맞는 아이템이 있으면 표를 고친다.

### 3.3 설명 계산

- 틀 `generatedtip_item_{id}_description`의 `<section>`들을 이어 붙이고 빈 `<section>`과 `<flavorText>`는 버린다.
- `@이름@`, `@이름*100@` 자리는 다음 순서로 찾는다.
  1. 능력치 필드(`FlatHPPoolMod` → `mFlatHPPoolMod` 등. 대소문자 무시)
  2. `mDataValues`. **증강 칼바람 값 우선**: `DataValuesModeOverride.Kiwi`에 같은 이름이 있으면 그 값, 없고 `DataValuesModeOverride.ARAM`에 있으면 그 값, 둘 다 없으면 기본 값.
  3. `mItemCalculations`(증강 계산기 `SpellValueResolver`의 계산 종류를 그대로 쓴다. 단, 이름 찾기는 아이템 수치 표로)
- `%i:scaleHealth%` 같은 아이콘 표식은 지운다. `{{ Item_Cooldown }}` 같은 참조는 문자열 표에서 한 번 더 찾아 넣고, 못 찾으면 지운다.
- 못 채운 자리(게임 중 누적치 `@f1@`, 모르는 계산 종류)는 이름 그대로 DB에 남겨 화면에서 `?`로 보인다(증강과 같은 `lib/augmentDescription.ts` 규칙). 동기화 로그에 아이템별로 남은 수를 찍는다.
- 증강 설명 계산(`gamedata/text/`)을 넓혀서 쓴다: 수치·계산식을 담는 `SpellValues`를 "수치 표" 하나로 일반화해 증강(스펠 항목)과 아이템(`ItemData`)이 각자 채우게 한다. 색 표식 허용 목록(`AugmentDescriptionBuilder.COLOR_TAGS` ↔ 화면 `lib/augmentDescription.ts`)에 아이템 설명에서 쓰는 표식(`attention`, `passive`, `active`, `scaleHealth`, `healing`, `physicalDamage`, `magicDamage`, `keywordMajor` 등)이 빠져 있으면 양쪽에 같이 더한다.

**ARAM 값만 있는 4개 (강철심장 등)**: 증강 칼바람이 일반 칼바람 설정을 이어받는다고 보고 ARAM 값을 쓴다. 사용자가 게임에서 강철심장 설명이 5%인지 확인하기로 했다(10%면 2번 규칙에서 ARAM 단계를 뺀다).

### 3.4 저장 (Flyway `V12__items.sql`)

```sql
create table items (
    id          int primary key,            -- 게임 아이템 번호
    name_ko     varchar(80)  not null,
    tier        varchar(20)  not null,      -- AUGMENT_MODE·LEGENDARY·EPIC·BOOTS·BASIC·STARTER
    price_total int          not null,
    icon_file   varchar(40)  not null,      -- "3084.png"
    from_ids    int[]        not null,      -- 재료(순서·중복 그대로)
    active      boolean      not null,      -- 지금 증강 칼바람 상점에 있음
    updated_at  timestamptz  not null
);

create table item_texts (
    item_id     int          not null references items (id),
    locale      varchar(5)   not null,      -- AugmentLocale과 같은 값
    name        varchar(80)  not null,
    description text         not null,
    primary key (item_id, locale)
);

create table post_items (
    post_id  bigint not null references posts (id) on delete cascade,
    item_id  int    not null references items (id),
    primary key (post_id, item_id)
);
create index post_items_item_idx on post_items (item_id);
```

- 상위 아이템(`into`)은 저장하지 않고 API에서 `from_ids`를 뒤집어 만든다.
- 이번 동기화 목록에 없는 아이템은 지우지 않고 `active = false`(옛 글 태그가 깨지지 않게, 증강과 같은 규칙).
- 마이그레이션은 `game_data_state`를 건드리지 않는다. 첫 시작 때 `items`가 비어 있으면(`items.count() == 0`) `GameDataSyncService`가 패치·자료 버전이 그대로여도 전체 재동기화를 한다. 버전을 비우면 그동안(아이템 단계가 계속 실패하면 계속) 챔피언 그림·아이템 아이콘 주소가 비기 때문에 V7 방법은 쓰지 않는다.

### 3.5 실패

- 아이템 단계(맵·아이템·문자열 표)에서 실패하면 이전 아이템을 그대로 두고 경고를 남긴다. 챔피언·증강 저장은 그대로 끝낸다. 그리고 다음 확인을 30분 뒤로 당긴다(`SyncTimer`의 실패 규칙). 증강 단계의 실패 규칙은 바꾸지 않는다.
- 한 아이템의 설명 계산이 예외를 내면 그 아이템만 설명 없이(이름·가격·아이콘만) 저장하고 넘어간다.

## 4. API

| 요청 | 응답 |
|---|---|
| `GET /api/items` | `[{ id, nameKo, tier, priceTotal, iconUrl, fromIds, intoIds, active }]` 전부(옛 아이템 포함, 화면이 `active`로 거른다). `id`·`fromIds`·`intoIds`는 문자열(`"3084"`): 챔피언·증강처럼 화면 부품과 주소·본문 박스가 모두 문자열 번호를 쓴다 |
| `GET /api/items/{id}?lang=` | `{ id, tier, priceTotal, iconUrl, fromIds, intoIds, original: {locale,name,description}, translation }` — 증강 상세와 같은 모양. 없는 번호는 404 `ITEM_NOT_FOUND`("없는 아이템이에요") |
| `GET /api/tag-counts` | 기존 응답에 `items: { "3084": 4, … }` 추가 |
| `GET /api/posts?item=3084` | 기존 `champion`·`augment`와 같은 거르기 |
| `POST/PUT /api/posts` | 요청에 `itemIds: string[]` 추가(최대 10개). 글 응답(목록·상세)에 `items: [{ id, nameKo, iconUrl }]` 추가 |

- 글 저장 검사: `itemIds`가 10개를 넘으면 400 "아이템은 10개까지 고를 수 있어요". 없거나 숫자가 아닌 번호면 "없는 아이템이 들어 있어요". 상점에서 빠진(비활성) 아이템은 **이미 그 글에 붙어 있던 것만** 둘 수 있고, 새로 붙이면 "현재 게임에 없는 아이템은 새로 붙일 수 없어요"(증강 태그 칸과 같은 규칙). 본문 박스는 있는 아이템이기만 하면 통과한다(증강 박스와 같은 규칙).
- 본문 박스: `tagMention.kind`에 `item`을 더한다(서버 `PostContentValidator`·화면 `editor/extensions.ts`·`extensions.test.ts`를 같이 바꾼다). `id`는 기존 형식 `^[A-Za-z0-9_]{1,40}$`에 숫자가 맞는다. `PostService`가 박스의 아이템도 있는지 확인한다.

## 5. 화면

### 5.1 위쪽 메뉴와 주소

- 탭 순서: 전체 글 · 증강 · 챔피언 · **아이템**. 주소가 `/items`로 시작하면 아이템 탭이 진하다.
- `/items`(펼친 상태 `/items?open=3084`), `/items/:itemId`(태그 페이지, `TagPage kind="item"`).
- 좁은 화면에서 탭 4개가 한 줄에 들어가는지 확인한다(안 되면 글자 간격을 줄인다).

### 5.2 아이템 탭 (`pages/ItemsPage.tsx`)

- 증강 탭과 같은 부품을 쓴다(`TagToolbar` 검색·정렬, 접히는 묶음, `TagGrid`, `TagPostsPanel`, `useOpenTag`).
- 지금 상점에 있는(`active`) 아이템만. 묶음은 3.2 순서, 처음엔 모두 접힘, 묶음 제목 줄은 "아이템 n개 · 글 n개". 검색 중이면 맞는 묶음만 펼쳐 보인다. `?open=`의 아이템이 든 묶음은 항상 펼친다.
- 칸: 아이콘(정사각, 모서리 4), 이름, 글 수(0개는 흐리게).
- 펼친 영역(넓은 화면은 좌우, 좁은 화면은 위아래)
  - 설명 상자 `components/item/ItemTooltip.tsx`: 증강 설명 상자와 같은 밤하늘 상자. 머리에 아이콘·이름·"3000 골드 · 전설", 금색 줄, 설명(색 표식), 금색 줄, **재료**와 **상위 아이템** 아이콘 줄(없으면 그 줄 생략). 재료·상위 아이콘을 누르면 그 아이템을 펼친다(`?open=` 교체). 상점에 없는 상위 아이템은 보이지 않는다.
  - 글 목록: `TagPostsPanel`(최신순·추천순, 5개씩 더 보기).
- 아이템 자료가 아직 없으면 "아직 아이템 정보를 받아오지 못했어요". 설명이 없으면 상자에 "아직 설명이 없어요".

### 5.3 글쓰기와 본문

- 글쓰기에 **아이템** 태그 칸(`TagPicker`, 최대 10개, 상점에 있는 아이템만 후보). 고친 글에 이미 있던 옛 아이템은 그대로 보이고 지울 수 있다.
- `lib/mentionCandidates.ts`의 후보에 아이템을 더한다(챔피언·증강·아이템을 섞어 8개, 이름이 검색어로 시작하는 것 먼저). 메뉴 줄에 종류를 알 수 있게 아이콘 모양(챔피언 원, 증강·아이템 사각)을 그대로 쓴다.
- 고르면 아이템 태그 칸에 더한다. 칸이 가득 차면 기존 문구 "태그 칸이 가득 차서 본문에만 넣었어요".
- 본문 박스 `TagMentionChip`: 아이템은 아이콘 + 색 글자(`text-gold-deep`) + 점선 밑줄. 마우스 올림·누르기·키보드 초점으로 `ItemTooltip`(글 목록 없이 상자만)을 띄운다. 띄우는 동작은 `AugmentHoverCard`를 종류와 상관없는 `HoverTooltip`으로 바꿔 함께 쓴다.
- 글 목록 한 줄(`PostListItem`)과 글 화면 태그 줄에 아이템 태그 칩. 누르면 `/items/:itemId`.

### 5.4 언어

설명 상자는 머리말 언어 설정을 따른다(`GET /api/items/{id}?lang=`). 번역이 없으면 원문(영어).

## 6. 오류·경계

- 상점에서 빠진 아이템: 탭·`@` 후보에서 빠지고, 이미 쓴 글의 태그·박스·설명 상자는 그대로.
- 같은 아이템을 태그 칸에 두 번 넣지 않는다(화면이 막고, 서버는 중복을 하나로).
- 아이템 번호는 숫자지만 주소·본문 박스에서는 문자열로 다닌다. 숫자가 아닌 `/items/abc`는 "없는 아이템이에요"(`lib/routeId.ts`와 같은 방식).
- 업데이트 중(503 `MAINTENANCE`)이면 아이템 탭도 다른 탭처럼 그 문장을 띄운다.

## 7. 테스트

**서버**
- 상점 목록 뽑기: 작은 `map12` 조각에서 KIWI 목록 합집합, 살 수 없는 것 제외.
- 단계 나누기: 3.2 표의 각 경우, 신발 분리.
- 수치 고르기: Kiwi 값 > ARAM 값 > 기본 값.
- 설명 채우기: 강철심장(계산식·`*100`·ARAM 값 5%), 마나무네(`{{ }}` 참조), 우글렛의 마녀 모자(못 채운 자리는 이름 그대로) — 실제 자료에서 잘라 낸 조각으로.
- 동기화: 아이템 단계 실패 시 이전 아이템 유지·증강은 저장, 빠진 아이템 `active=false`.
- 글: `itemIds` 저장·수정·11개 거절·없는 번호 거절·옛 아이템 통과, `?item=` 거르기, `tag-counts.items`, 본문 `item` 박스 검사.

**화면**
- 아이템 탭: 묶음 순서·접기/펼치기, 검색(초성), 정렬, `?open=` 펼침, 재료 아이콘 누르면 그 아이템으로, 자료 없음 문구.
- `ItemTooltip`: 머리(이름·가격·단계), 색 표식, 재료·상위 줄 생략 규칙.
- 글쓰기 아이템 칸, `@` 후보에 아이템, 태그 칸 자동 추가, 본문 아이템 박스와 설명 상자.
- `extensions.test.ts`에 `kind: 'item'`.

**실제 자료 확인**: 로컬 서버로 실제 동기화를 돌려 아이템 수(약 192개), 묶음별 개수, 못 채운 자리 수를 세어 보고한다. **브라우저**: 아이템 탭(PC·휴대폰 너비), 글쓰기 `@`로 아이템 넣기, 글 화면 설명 상자.

## 8. 배포

- `dev`에 합치고, 사용자가 "업데이트해줘"라고 하면 기다리던 바닥글 변경과 함께 `main`으로 올린다.
- 첫 시작 때 전체 재동기화로 아이템을 받는다. 그동안(1~2분) 아이템 탭은 "아직 아이템 정보를 받아오지 못했어요"일 수 있다.
- CLAUDE.md의 게임 데이터·본문 태그 설명에 아이템을 더한다.
