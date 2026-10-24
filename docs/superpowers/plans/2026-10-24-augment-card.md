# 증강 카드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 증강 탭에서 증강을 누르면 게임 카드를 닮은 카드 두 장(영어 원문·선택 언어)과 한 줄짜리 글 목록이 펼쳐진다. 카드 설명은 수치가 채워진 긴 설명이고, 머리말의 언어 설정이 오른쪽 카드를 정한다.

**Architecture:** 백엔드는 동기화 때 언어별 문자열 표(영어·한국어)를 받아 설명의 자리표시자를 수치 표로 계산해 완성된 글로 `augment_texts`에 저장한다(V8). 읽기 API `GET /api/augments/{id}?lang=`를 더한다. 프론트엔드는 언어 설정(context + localStorage), 설명 표식 파서(순수 함수), 카드 부품, 그리고 기존 `TagPostsPanel`에 카드 자리와 한 줄 목록 모드를 더한다.

**Tech Stack:** 기존과 같음 — Spring Boot 4.1, Java 21, JPA, Flyway, PostgreSQL 18, Testcontainers, Jackson 3 / React 19, TypeScript, React Router, TanStack Query 5, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-24-augment-card-design.md` (목업 `2026-10-24-augment-card-mockup.html`)

## Global Constraints

- 프로젝트 규칙은 `CLAUDE.md`를 따른다: 해요체 문구, 오류 형식 `{code, message, fieldErrors}`, DB 변경은 Flyway만(`V8__`), Jackson 3(`tools.jackson.*`, `asString()`), 커밋 이메일 noreply, Docker Desktop을 에이전트가 켜지 않기.
- 언어 코드: `en`, `ko`. 원천 폴더: `en` → `en_us`, `ko` → `ko_kr`. 문자열 표 주소: `https://raw.communitydragon.org/latest/game/{폴더}/data/menu/en_us/lol.stringtable.json`. 원문 언어는 항상 `en`.
- 카드 크기 300×492px. 바탕 `augmentcard_bg.png`, 테두리 `augmentcard_frame_{silver|gold|prismatic}.png` (`https://raw.communitydragon.org/latest/game/assets/ux/cherry/augments/augmentselection/`). 그림은 492×492로 키워 `left:-96px`에 둔다.
- 등급 표 문구: 한국어 "일반" / "골드" / "프리즘", 영어 "Silver" / "Gold" / "Prismatic".
- 색 표식 표(이름 → 색): `magicDamage`,`scaleAP` → `#49b6ff`; `physicalDamage`,`scaleAD` → `#ff8c34`; `trueDamage` → `#f5f5f5`; `health`,`scaleHealth`,`healing` → `#2ecc71`; `shield` → `#9ad8ff`; `speed` → `#e8d58a`; `omnivamp`,`lifeSteal`,`lifesteal` → `#ff5c5c`; `status`,`keyword`,`keywordMajor`,`active`,`passive` → `#f1e2a8`; `attackSpeed`,`gold` → `#f0c674`; `rules`,`rule` → `#8d99ae` 기울임. 서버는 이 표식과 `<br>`만 남기고, 화면은 이 표식만 색으로 바꾼다.
- 스킬 이름 자리표시자: `{{SpellName}}`, `{{SpellNameOnly}}` → 한국어 `[스킬]`, 영어 `[Ability]`.
- 집계 자리표시자: `@f<숫자>@`, `@f<숫자>.<숫자>@`. 그 줄(`<br>` 단위) 전체와 `<statTracking>…</statTracking>`을 지운다.
- 숫자 표기: 정수는 그대로, 소수는 소수 한 자리(끝 0 제거). 레벨 범위는 `a~b`. 스탯 계수는 한국어 `(+{스탯}의 {n}%)`, 영어 `(+{n}% {스탯})`.
- 스탯 번호 → 이름(확정된 것만): 0 → 주문력 / AP, 2 → 공격력 / AD, 12 → 최대 체력 / max Health. `mStatFormula` 1 → 앞에 "추가 " / "bonus ", 2 → "전체 " / "total ". 모르는 번호가 들어간 식은 통째로 "만들 수 없음".
- 화면 문구: "원문", "번역", "복사", "복사했어요", "복사하지 못했어요", "불러오는 중이에요", "잠시 후 다시 시도해주세요", "아직 설명이 없어요", "이 증강 글 n개", "언어"(드롭다운 aria-label). 언어 이름: "한국어", "English". localStorage 키 `lang`, 기본 `ko`.
- 새 오류 코드: `AUGMENT_NOT_FOUND(404, "없는 증강이에요")`.
- 챔피언 탭의 펼침 영역은 바뀌지 않는다.

## Review Focus

1. **자리표시자 안의 곱셈 꼬리와 음수**: `@MSMod*100@` → `50`, `@X*-100@` → 부호가 뒤집힌 값, `@X*1000@`. → Task 2 테스트.
2. **문자열 참조가 또 참조를 품을 때와 없는 키**: `{{Kiwi_SpellVolley_Summary}}` 안에 `{{SpellName}}`이 있으면 둘 다 바뀐다. 문자열 표에 없는 `{{Kiwi_PressureCooker_Tooltip@f4@}}`는 그대로 남는다. → Task 3 테스트.
3. **집계 줄이 설명의 첫 줄이거나 연달아 두 줄일 때**: `<br>` 경계로 자른 줄을 지운 뒤 빈 줄이 두 개 연속 남지 않고, 앞뒤 빈 줄이 없다. → Task 3 테스트.
4. **영어 문자열 표만 실패**: 한국어는 받았는데 영어가 500이면 동기화 전체가 FAILED이고 기존 데이터와 버전이 그대로다. → Task 4 테스트.
5. **클립보드가 없는 환경(http, 권한 거부)**: `navigator.clipboard.writeText`가 없거나 거부하면 "복사하지 못했어요" 토스트가 뜨고 화면이 깨지지 않는다. → Task 7 테스트.

---

## File Structure

### Backend (`backend/src/main/java/com/aram/community/`)

| 파일 | 책임 |
|---|---|
| `resources/db/migration/V8__augment_texts.sql` | `augment_texts` 표, `augments.large_icon_path`, 전체 재동기화 유도 |
| `gamedata/AugmentText.java`, `AugmentTextId.java`, `AugmentTextRepository.java` | 언어별 이름·설명 행 |
| `gamedata/Augment.java` (수정) | `largeIconPath` |
| `gamedata/text/AugmentLocale.java` | 언어 코드·원천 폴더·스탯 이름·스킬 자리표시자 |
| `gamedata/text/SpellValues.java` | 스펠 항목들에서 `DataValues`·`mSpellCalculations` 모으기 |
| `gamedata/text/SpellValueResolver.java` | `@이름@` 식 하나를 글로 |
| `gamedata/text/AugmentDescriptionBuilder.java` | 설명 만들기 5단계 |
| `gamedata/GameDataClient.java` (수정) | 언어별 문자열 두 번 받기, `AugmentData`에 큰 아이콘·언어별 글 |
| `gamedata/GameDataSyncService.java` (수정) | `augment_texts` 저장 |
| `gamedata/GameDataService.java`, `GameDataController.java`, `AugmentDetailDto.java`, `AugmentTextDto.java` (추가·수정) | 증강 상세 API |
| `common/ErrorCode.java` (수정) | `AUGMENT_NOT_FOUND` |

### Frontend (`frontend/src/`)

| 파일 | 책임 |
|---|---|
| `lib/language.tsx` | 언어 설정 context, localStorage |
| `components/LanguageSelect.tsx`, `components/Header.tsx` (수정) | 머리말 언어 드롭다운 |
| `main.tsx`, `test/render.tsx` (수정) | `LanguageProvider` 감싸기 |
| `api/types.ts`, `api/gamedata.ts` (수정) | `AugmentDetail`, `useAugmentDetail` |
| `lib/augmentDescription.ts` | 표식 파서와 글자만 뽑기 |
| `components/augment/AugmentCard.tsx` | 카드 한 장(테두리·아이콘·이름·등급·설명·복사) |
| `components/augment/AugmentCards.tsx` | 상세 불러오기, 한 장/두 장 배치, 상태 |
| `components/PostListItem.tsx` (수정) | `compact` 한 줄 모드 |
| `components/tags/TagPostsPanel.tsx` (수정) | `children`, `postsHeading`, `compact` |
| `pages/AugmentsPage.tsx` (수정) | 카드와 한 줄 목록 연결 |

### 테스트 자료

- `backend/src/test/resources/gamedata/kiwi.bin.json` (수정): `ARAM_LegDay`와 `SurgeField`에 `AugmentTooltipTra`, `AugmentLargeIconPath`, `RootSpell`을 더하고, 그 `RootSpell` 항목(`mSpell.DataValues`, `mSpellCalculations`)을 넣는다. 아래 Task 3·4 테스트가 기대하는 값과 맞춘다.
- `backend/src/test/resources/gamedata/stringtable.json` (수정, 한국어)와 새 `stringtable-en.json`: 이름·툴팁·참조 키.
- `backend/src/test/resources/gamedata/ominous-pact.json`, `courage.json`: 실제 `kiwi.bin.json`에서 그 증강과 `RootSpell`·`AdditionalSpells` 항목만 오려낸 조각(Task 3).

---

### Task 1: 마이그레이션과 언어별 글 표

**Files:**
- Create: `backend/src/main/resources/db/migration/V8__augment_texts.sql`
- Create: `backend/src/main/java/com/aram/community/gamedata/AugmentText.java`, `AugmentTextId.java`, `AugmentTextRepository.java`
- Modify: `backend/src/main/java/com/aram/community/gamedata/Augment.java`
- Test: `backend/src/test/java/com/aram/community/gamedata/AugmentTextRepositoryTest.java`

**Interfaces:**
- Produces: `AugmentTextId(String augmentId, String locale)` (`@Embeddable`, `equals/hashCode`), `AugmentText(AugmentTextId id, String name, String description, Instant updatedAt)` with `refresh(String name, String description, Instant now)`, getters. `AugmentTextRepository extends JpaRepository<AugmentText, AugmentTextId>` with `List<AugmentText> findByIdAugmentId(String augmentId)`. `Augment` 생성자에 `largeIconPath` 추가: `Augment(String id, String nameKo, String iconPath, String largeIconPath, AugmentRarity rarity, Instant now)`, `refresh(String nameKo, String iconPath, String largeIconPath, AugmentRarity rarity, Instant now)`, `getLargeIconPath()`.

- [ ] **Step 1: Write the failing test**

```java
class AugmentTextRepositoryTest extends IntegrationTest {
	@Autowired AugmentRepository augments;
	@Autowired AugmentTextRepository texts;

	@Test
	void savesOneRowPerLocaleAndFindsByAugment() {
		augments.save(new Augment("OminousPact", "불길한 서약", "s.png", "l.png", AugmentRarity.PRISMATIC, Instant.now()));
		texts.save(new AugmentText(new AugmentTextId("OminousPact", "en"), "Ominous Pact", "Gain …", Instant.now()));
		texts.save(new AugmentText(new AugmentTextId("OminousPact", "ko"), "불길한 서약", "잃은 체력에 …", Instant.now()));

		assertThat(texts.findByIdAugmentId("OminousPact")).extracting(t -> t.getId().locale()).containsExactlyInAnyOrder("en", "ko");
		assertThat(augments.findById("OminousPact").orElseThrow().getLargeIconPath()).isEqualTo("l.png");
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./gradlew test --tests '*AugmentTextRepositoryTest*'`
Expected: 컴파일 실패 (`AugmentText` 없음).

- [ ] **Step 3: Write `V8__augment_texts.sql`**

```sql
create table augment_texts (
    augment_id   varchar(80)  not null references augments (id),
    locale       varchar(10)  not null,
    name         varchar(120) not null,
    description  text         not null,
    updated_at   timestamptz  not null,
    primary key (augment_id, locale)
);

-- 기본값이 있어야 기존 테스트의 insert 문과 예전 행이 그대로 통과해요. 실제 값은 다음 동기화가 채워요.
alter table augments add column large_icon_path varchar(200) not null default '';
update augments set large_icon_path = icon_path;

-- 다음 동기화가 전체를 다시 받아 설명과 큰 아이콘을 채우게 해요 (V7과 같은 방식).
update game_data_state set current_ddragon_version = null;
```

- [ ] **Step 4: Implement the entity, id, repository, and `Augment` changes**

`AugmentText`는 `@Entity @Table(name = "augment_texts")`, `@EmbeddedId AugmentTextId id`. 기존 `Augment` 생성자·`refresh`를 쓰는 곳(`GameDataSyncService`, 테스트)은 컴파일이 깨지므로 이 단계에서 `largeIconPath`에 `iconPath`를 넘겨 임시로 맞춘다(Task 4에서 진짜 값으로 바꾼다).

- [ ] **Step 5: Run the whole backend test suite**

Run: `cd backend && ./gradlew test`
Expected: 모두 통과 (Hibernate `ddl-auto: validate`가 V8과 엔티티가 맞는지 확인한다).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/db/migration/V8__augment_texts.sql backend/src/main/java/com/aram/community/gamedata backend/src/test/java/com/aram/community/gamedata
git commit -m "Add augment_texts table and large icon path"
```

---

### Task 2: 수치 계산기

**Files:**
- Create: `backend/src/main/java/com/aram/community/gamedata/text/AugmentLocale.java`, `SpellValues.java`, `SpellValueResolver.java`
- Test: `backend/src/test/java/com/aram/community/gamedata/text/SpellValueResolverTest.java`

**Interfaces:**
- Produces:
  - `enum AugmentLocale { EN("en", "en_us"), KO("ko", "ko_kr") }` with `String code()`, `String folder()`, `static Optional<AugmentLocale> fromCode(String)`, `String spellPlaceholder()` (`[Ability]` / `[스킬]`), `Optional<String> statName(int stat)` (위 표), `String rarityLabel(AugmentRarity)`는 쓰지 않는다(화면이 한다).
  - `final class SpellValues` with `static SpellValues from(List<JsonNode> spellObjects)` (각 항목의 `mSpell.DataValues`와 `mSpell.mSpellCalculations`를 모은다. 같은 이름은 먼저 온 항목이 이긴다), `Optional<List<Double>> dataValue(String name)`, `Optional<JsonNode> calculation(String name)`. 이름 비교는 대소문자 무시.
  - `final class SpellValueResolver(AugmentLocale locale)` with `Optional<String> resolve(String expression, SpellValues values)`. `expression`은 `@`를 뺀 안쪽(`APPerLevel`, `MSMod*100`, `X*-100`). 만들 수 없으면 `Optional.empty()`.
  - `static String formatNumber(double v)`: 정수면 `"150"`, 아니면 소수 한 자리 `"4.5"`(끝 0 제거, `Locale.ROOT`).

- [ ] **Step 1: Write the failing tests**

테스트는 Spring 없이 `JsonMapper.builder().build().readTree(...)`로 작은 JSON을 만든다. 각 테스트는 `values`를 아래 조각으로 만든다(`spell(String json)` 도우미: `{"mSpell": …}` 하나를 리스트에 담아 `SpellValues.from`).

```java
class SpellValueResolverTest {
	SpellValueResolver ko = new SpellValueResolver(AugmentLocale.KO);
	SpellValueResolver en = new SpellValueResolver(AugmentLocale.EN);

	@Test void constantDataValue()        // DataValues MSMod=[0.5×7] → resolve("MSMod*100") == "50"
	@Test void varyingDataValueIsRange()  // Bolt=[1,1,2,2,3,3,3] → resolve("Bolt") == "1~3"
	@Test void negativeAndThousandTails() // X=[0.25×7] → resolve("X*-100") == "-25", resolve("X*1000") == "250"
	@Test void levelInterpolation()       // calc APPerLevel ByCharLevelInterpolation 75→150 → "75~150"
	@Test void breakpointsAddPerLevel()   // mLevel1Value 70, mInitialBonusPerLevel 10 → "70~240"; mLevel1Value 1, breakpoints {7:+1,11:+1} → "1~13"
	@Test void statByNamedDataValueKo()   // Courage 조각: ByCharLevel 150→450 + StatByNamedDataValue(mStat 12, HealthScalar 0.04) → ko "150~450 (+최대 체력의 4%)", en "150~450 (+4% max Health)"
	@Test void statByCoefficientWithFormula() // StatByCoefficient(mStat 0, mCoefficient 0.3, mStatFormula 1) → ko "(+추가 주문력의 30%)", en "(+30% bonus AP)"
	@Test void numberAndSumAndProduct()   // Number 2 + Sum[Number 1, NamedDataValue A=3] → "2 (+1 + 3)"; Product[Number 2, Number 3] → "2 × 3"
	@Test void modifiedCalculationMultiplies() // GameCalculationModified mMultiplier Number 2, mModifiedGameCalculation "Base" where Base = 75~150 → "150~300"
	@Test void unknownStatOrPartIsEmpty() // mStat 34 → empty; BuffCounterByCoefficientCalculationPart → empty; 모르는 이름 → empty
	@Test void formatsNumbers()           // formatNumber(150) == "150", formatNumber(4.5) == "4.5", formatNumber(0.05*100) == "5", formatNumber(2.345) == "2.3"
}
```

`breakpointsAddPerLevel`의 18레벨 값 규칙: 1레벨 값에서 시작해 2~18레벨마다 "레벨당 증가분"을 더한다. 레벨당 증가분은 처음에 `mInitialBonusPerLevel`(없으면 0)이고, 각 `mBreakpoints` 항목의 `mLevel`에 이르면 그 이후 레벨부터 `mAdditionalBonusAtThisLevel`만큼 **누적해서 커진다**. 예: `mLevel1Value` 70, `mInitialBonusPerLevel` 10 → 70 + 10×17 = 240 → `"70~240"`. `mLevel1Value` 1, breakpoints {7:+1, 11:+1}, 초기 증가분 0 → 7~10레벨은 레벨당 1(4레벨, +4), 11~18레벨은 레벨당 2(8레벨, +16) → 1+4+16 = 21 → `"1~21"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ./gradlew test --tests '*SpellValueResolverTest*'`
Expected: 컴파일 실패.

- [ ] **Step 3: Implement `AugmentLocale`, `SpellValues`, `SpellValueResolver`**

`resolve` 순서: 꼬리(`*100`, `*-100`, `*1000`)를 떼고 → 이름이 `dataValue`면 값(모두 같으면 하나, 다르면 첫~끝)에 꼬리를 곱해 글로 → 아니면 `calculation`의 `mFormulaParts`를 순서대로 글로 만들고(첫 부분은 그대로, 나머지는 `(+…)`), `GameCalculationModified`면 원래 식의 양 끝에 `mMultiplier`를 곱한다 → 부분 하나라도 못 만들면 `empty`. 범위 값에 꼬리를 곱할 때는 양 끝에 곱한다. 레벨 범위 두 끝이 같으면 하나만 쓴다.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./gradlew test --tests '*SpellValueResolverTest*'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/aram/community/gamedata/text backend/src/test/java/com/aram/community/gamedata/text
git commit -m "Add augment spell value resolver"
```

---

### Task 3: 설명 만들기

**Files:**
- Create: `backend/src/main/java/com/aram/community/gamedata/text/AugmentDescriptionBuilder.java`
- Create: `backend/src/test/resources/gamedata/ominous-pact.json`, `courage.json`
- Test: `backend/src/test/java/com/aram/community/gamedata/text/AugmentDescriptionBuilderTest.java`

**Interfaces:**
- Consumes: `SpellValues`, `SpellValueResolver`, `AugmentLocale` (Task 2).
- Produces: `final class AugmentDescriptionBuilder(AugmentLocale locale, Function<String, Optional<String>> strings)` with `Result build(String tooltip, SpellValues values)`; `record Result(String description, List<String> unresolved)`. `strings`는 키(대소문자 무시)로 문자열을 찾는다.

- [ ] **Step 1: Make the two fixtures**

실제 `kiwi.bin.json`에서 `Maps/ModeSpecificData/Augments/OminousPact`와 그 `RootSpell`, `Maps/ModeSpecificData/Augments/ARAM_CourageoftheColossus`와 그 `RootSpell` 항목을 키 그대로 오려 각각 한 파일(최상위 객체)에 담는다. 툴팁 문자열은 테스트 안에 상수로 둔다(영어·한국어 각각, 지금 CommunityDragon 값 그대로):

- OminousPact EN: `Gain <magicDamage>@APPerLevel@ Ability Power</magicDamage>, <speed>@MSMod*100@% Movement Speed</speed>, and <omnivamp>@MaxOmnivamp*100@% Omnivamp</omnivamp> based on <scaleHealth>missing Health</scaleHealth>. Spell casts cost @SpellHealthCost*100@% of your current Health.<br><br><rules>Max benefit at @HealthThresholdTT*100@% Health.</rules><br>`
- Courage EN: `Gain <shield>@TotalShield@ Shield</shield> after <status>Immobilizing</status> or <status>Grounding</status> an enemy champion.<br><br>Shields Generated: @f2@`
- 한국어 두 문자열은 실제 표에서 복사한다(`Kiwi_OminousPact_Tooltip`, `Kiwi_ARAM_CourageoftehColossus_Tooltip`).

- [ ] **Step 2: Write the failing tests**

```java
class AugmentDescriptionBuilderTest {
	// stripTags(s) = s.replaceAll("<[^>]+>", "") 도우미로 표식을 뺀 글을 비교한다.
	@Test void ominousPactKo()  // stripTags(description) == "잃은 체력에 비례하여 주문력을 75~150, 이동 속도를 50%, 모든 피해 흡혈을 20%을 얻습니다. 스킬 사용 시 현재 체력의 5%를 소모합니다.체력이 30%일 때 최대 효과를 얻습니다." ; description 에 "<magicDamage>", "<rules>" 가 남아 있음 ; unresolved 비어 있음
	@Test void courageDropsTrackingLineKo()  // description 에 "150~450 (+최대 체력의 4%)" 와 "<shield>" 포함, "생성한 보호막" 없음, "<br>" 로 끝나지 않음
	@Test void courageEn()  // "Gain <shield>150~450 (+4% max Health) Shield</shield> after <status>Immobilizing</status> or <status>Grounding</status> an enemy champion." 정확히 일치
	@Test void inlinesStringReferencesRecursively() // strings: "Kiwi_X_Summary" → "Your {{SpellName}} hits twice." ; tooltip "{{Kiwi_X_Summary}}<br><br>Hits: @f1@" → "Your [Ability] hits twice."
	@Test void keepsUnknownReferenceAndPlaceholder() // "{{Kiwi_Nope}} deals @Ult_DamageAmp@" → 그대로, unresolved == ["Ult_DamageAmp"]
	@Test void removesStatTrackingAndCollapsesBlankLines() // "Damage: @f1.0@<br>Kills: @f2.0@<br><br><statTracking>x</statTracking><br>Real text<br>" → "Real text"
	@Test void stripsNonColorTagsKeepsColorTags() // "<mainText><font color='#fff'>Hi</font> <scaleAP>AP</scaleAP> %i:scaleHealShield%<li>a</li></mainText>" → "Hi <scaleAP>AP</scaleAP> a"
	@Test void trimsSpacesAroundOuterTags() // "{{ Item_Keyword_OnHit }}" 안의 공백을 무시하고 찾는다
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && ./gradlew test --tests '*AugmentDescriptionBuilderTest*'`
Expected: 컴파일 실패.

- [ ] **Step 4: Implement `AugmentDescriptionBuilder.build`**

단계 순서는 설계 4.3 그대로: 참조 치환(최대 5번 반복) → 집계 줄·`statTracking` 제거 → `@…@` 치환(`SpellValueResolver`, 실패는 그대로 두고 `unresolved`에 기록) → 표식 정리(허용 표식: Global Constraints의 색 표식과 `br`; 나머지 여는/닫는 표식과 `%i:…%`는 제거) → `<br>`을 기준으로 앞뒤 빈 줄 제거, 빈 줄 2개 이상은 1개(`<br><br>`)로.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ./gradlew test --tests '*AugmentDescriptionBuilderTest*'`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/aram/community/gamedata/text backend/src/test
git commit -m "Build augment descriptions with resolved values"
```

---

### Task 4: 동기화에서 언어별 글 받기·저장

**Files:**
- Modify: `backend/src/main/java/com/aram/community/gamedata/GameDataClient.java`, `GameDataSyncService.java`
- Modify: `backend/src/test/resources/gamedata/kiwi.bin.json`, `stringtable.json`; Create: `stringtable-en.json`
- Test: `backend/src/test/java/com/aram/community/gamedata/GameDataSyncServiceTest.java`

**Interfaces:**
- Consumes: Task 1 엔티티·저장소, Task 3 `AugmentDescriptionBuilder`, Task 2 `SpellValues`, `AugmentLocale`.
- Produces: `GameDataClient.AugmentData(String id, String nameKo, String iconPath, String largeIconPath, AugmentRarity rarity, Map<AugmentLocale, LocalizedText> texts, int unresolvedCount)`, `record LocalizedText(String name, String description)`. `GameDataClient.fetchAugments()`의 호출 순서: `kiwi.bin.json` → 언어마다(`EN`, `KO` 순) 문자열 표 1차(이름+툴팁 키) → 2차(툴팁 안 `{{참조}}` 키, 참조가 하나라도 있을 때만). 한국어 이름이 비면 지금처럼 그 증강은 뺀다. 어떤 언어의 툴팁이 비면 그 언어의 `texts` 항목만 없다. `GameDataSyncService.saveAugments`는 `texts`마다 `augment_texts`를 넣거나 갱신한다. 동기화 로그: `"Game data synced to {} ({} champions, {} augments, {} unresolved placeholders)"`.

- [ ] **Step 1: Update fixtures**

`kiwi.bin.json`: `ARAM_LegDay`에 `AugmentTooltipTra: "Kiwi_ARAM_LegDay_Tooltip"`, `AugmentLargeIconPath: "assets/ux/cherry/augments/icons/legday_large.tex"`, `RootSpell: "Maps/ModeSpecificData/Augments/ARAM_LegDay/Augment_ARAM_LegDay"`를 더하고, 그 `RootSpell` 항목에 `DataValues MSBonus=[0.2×7]`을 넣는다. `SurgeField`에는 툴팁 키 `Kiwi_SurgeField_Tooltip`만 더한다(RootSpell 없음 → 값은 못 채움).
`stringtable.json`(ko)에 `kiwi_aram_legday_tooltip: "{{Kiwi_ARAM_LegDay_Summary}}<br><br>달린 거리: @f1@"`, `kiwi_aram_legday_summary: "<speed>이동 속도가 @MSBonus*100@%</speed> 오릅니다."`, `kiwi_surgefield_tooltip: "@Damage@의 피해"`를 더한다. `stringtable-en.json`은 기존 이름 키의 영어 이름 22개와 같은 세 키의 영어(`"Gain <speed>@MSBonus*100@% Move Speed</speed>."` 등)를 담는다.

- [ ] **Step 2: Write the failing tests** (기존 `expectFullSync`를 아래처럼 바꾸고 테스트를 더한다)

```java
private static final String STRINGS_EN = "https://raw.communitydragon.org/latest/game/en_us/data/menu/en_us/lol.stringtable.json";
private static final String STRINGS_KO = STRINGS; // 기존 상수

private void expectFullSync(String kiwiFixture) throws IOException {
	// versions, champions, kiwi 는 그대로
	server.expect(requestTo(STRINGS_EN)).andRespond(withSuccess(fixture("stringtable-en.json"), MediaType.APPLICATION_JSON));
	server.expect(requestTo(STRINGS_EN)).andRespond(withSuccess(fixture("stringtable-en.json"), MediaType.APPLICATION_JSON)); // 참조 2차
	server.expect(requestTo(STRINGS_KO)).andRespond(withSuccess(fixture("stringtable.json"), MediaType.APPLICATION_JSON));
	server.expect(requestTo(STRINGS_KO)).andRespond(withSuccess(fixture("stringtable.json"), MediaType.APPLICATION_JSON));
}

@Test void storesTextsForBothLocales() {
	// sync 후 texts.findByIdAugmentId("ARAM_LegDay") 두 행; ko description == "<speed>이동 속도가 20%</speed> 오릅니다."; en name == "Leg Day"
	// augments.findById("ARAM_LegDay").getLargeIconPath() == "assets/ux/cherry/augments/icons/legday_large.png"
}
@Test void keepsPlaceholderWhenValueMissing() {
	// SurgeField ko description == "@Damage@의 피해"
}
@Test void refreshOverwritesExistingText() {
	// 미리 augment_texts('ARAM_LegDay','ko','옛 이름','옛 설명') 삽입 → sync → 갱신됨
}
@Test void englishStringsFailureFailsWholeSync() {
	// current_ddragon_version '16.20.1' 세팅, EN 1차 요청을 withServerError() → FAILED, 버전 그대로, last_error 있음
}
```

`kiwi-small.bin.json`을 쓰는 `tooFewAugmentsFailsAndKeepsOldData`는 증강 수 검사가 문자열 요청 뒤에 있으므로 `expectFullSync` 그대로 둔다. `largeIconPath`가 없는 증강(대부분의 fixture)은 `iconPath`와 같은 값으로 저장된다.

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && ./gradlew test --tests '*GameDataSyncServiceTest*'`
Expected: 새 테스트 실패, 기존 테스트도 요청 순서가 달라 실패.

- [ ] **Step 4: Implement client and sync changes**

`GameDataClient.fetchAugments()`: 증강 목록을 모은 뒤 언어마다 `fetchStrings(locale, keys)`(기존 메서드에 `AugmentLocale` 매개변수 추가, 주소는 `locale.folder()`로)를 호출하고, 툴팁들에서 `\{\{\s*([^}]+?)\s*\}\}`로 참조 키를 모아 비어 있지 않으면 한 번 더 호출한다. 두 결과를 합쳐 `Function<String, Optional<String>>`으로 `AugmentDescriptionBuilder`에 넘긴다. `SpellValues.from`에는 `RootSpell`·`AdditionalSpells`가 가리키는 항목 중 `kiwi` 안에 있는 것만 넘긴다. `largeIconPath`는 `AugmentLargeIconPath`를 소문자·`.png`로 바꾼 값, 비어 있으면 `iconPath`.
`GameDataSyncService.saveAugments`: 기존 `augments.findAll()` 맵과 함께 `texts.findAll()`을 `AugmentTextId` 맵으로 가져와 넣거나 `refresh`한다. 못 채운 자리표시자 수는 `AugmentData`에 `int unresolvedCount`로 실어 합산해 로그에 쓴다.

- [ ] **Step 5: Run the whole backend suite**

Run: `cd backend && ./gradlew test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src
git commit -m "Sync augment names and descriptions for English and Korean"
```

---

### Task 5: 증강 상세 API

**Files:**
- Create: `backend/src/main/java/com/aram/community/gamedata/AugmentDetailDto.java`, `AugmentTextDto.java`
- Modify: `GameDataService.java`, `GameDataController.java`, `common/ErrorCode.java`
- Test: `backend/src/test/java/com/aram/community/gamedata/GameDataControllerTest.java`

**Interfaces:**
- Produces: `record AugmentTextDto(String locale, String name, String description)`, `record AugmentDetailDto(String id, AugmentRarity rarity, String iconUrl, AugmentTextDto original, AugmentTextDto translation)`; `GameDataService.augmentDetail(String id, String lang)` (없으면 `ApiException(ErrorCode.AUGMENT_NOT_FOUND)`); `GET /api/augments/{id}` with `@RequestParam(required = false) String lang`. `iconUrl`은 `augmentIconUrl(largeIconPath)`.

- [ ] **Step 1: Write the failing tests**

```java
private void seedTexts() {
	jdbc.update("insert into augments (id, name_ko, icon_path, large_icon_path, active, updated_at, rarity) values ('OminousPact', '불길한 서약', 's.png', 'assets/ux/cherry/augments/icons/wisdomofages_large.png', true, now(), 'PRISMATIC')");
	jdbc.update("insert into augment_texts (augment_id, locale, name, description, updated_at) values ('OminousPact', 'en', 'Ominous Pact', 'Gain <magicDamage>75~150 AP</magicDamage>', now()), ('OminousPact', 'ko', '불길한 서약', '<magicDamage>주문력 75~150</magicDamage>', now())");
}
@Test void detailWithTranslation()   // GET /api/augments/OminousPact?lang=ko → 200, $.rarity PRISMATIC, $.iconUrl ".../wisdomofages_large.png", $.original.locale en, $.original.name "Ominous Pact", $.translation.locale ko, $.translation.description "<magicDamage>주문력 75~150</magicDamage>"
@Test void detailSameLanguageHasNullTranslation() // ?lang=en → $.translation null; lang 없음 → null; ?lang=xx → null
@Test void detailMissingLocaleRowIsNull() // ko 행만 지운 뒤 ?lang=ko → $.translation null, $.original 있음
@Test void detailUnknownAugmentIs404() // /api/augments/Nope → 404, $.code "AUGMENT_NOT_FOUND", $.message "없는 증강이에요"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ./gradlew test --tests '*GameDataControllerTest*'`
Expected: 404 또는 컴파일 실패.

- [ ] **Step 3: Implement**

`augmentDetail`: `augments.findById` → 없으면 예외; `texts.findByIdAugmentId(id)`를 locale 맵으로; `original` = `en` 행(없으면 null); `translation` = `AugmentLocale.fromCode(lang)`이 있고 `EN`이 아니고 행이 있으면 그 행, 아니면 null. `ErrorCode`에 `AUGMENT_NOT_FOUND(404, "없는 증강이에요")`를 `CHAMPION_NOT_FOUND` 아래에 더한다.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && ./gradlew test --tests '*GameDataControllerTest*'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src
git commit -m "Add augment detail API with original and translated text"
```

---

### Task 6: 머리말 언어 설정

**Files:**
- Create: `frontend/src/lib/language.tsx`, `frontend/src/components/LanguageSelect.tsx`
- Modify: `frontend/src/components/Header.tsx`, `frontend/src/main.tsx`, `frontend/src/test/render.tsx`
- Test: `frontend/src/lib/language.test.tsx`, `frontend/src/components/Header.test.tsx`

**Interfaces:**
- Produces: `type Language = 'ko' | 'en'`; `const LANGUAGES: { code: Language; name: string }[] = [{ code: 'ko', name: '한국어' }, { code: 'en', name: 'English' }]`; `const ORIGINAL_LANGUAGE: Language = 'en'`; `LanguageProvider({ children })`; `useLanguage(): { language: Language; setLanguage: (l: Language) => void }`; `languageName(code: Language): string`. localStorage 키 `lang`; 읽기·쓰기는 try/catch로 감싸고 잘못된 값은 `ko`. `LanguageSelect` = `<select aria-label="언어">` 앞에 🌐(aria-hidden).

- [ ] **Step 1: Write the failing tests**

```tsx
// lib/language.test.tsx
it('defaults to ko and remembers the choice', () => {
  // LanguageProvider 안에서 useLanguage()를 쓰는 작은 부품으로 setLanguage('en') → localStorage.getItem('lang') === 'en', 다시 그리면 'en'
})
it('ignores a broken stored value', () => { localStorage.setItem('lang', 'zz'); /* language === 'ko' */ })

// components/Header.test.tsx 에 추가
it('offers a language select that changes the setting', async () => {
  mockApi({ 'GET /api/me': () => json(null) })
  renderWithProviders(<Header />)
  const select = await screen.findByRole('combobox', { name: '언어' })
  expect(select).toHaveValue('ko')
  await userEvent.selectOptions(select, 'en')
  expect(localStorage.getItem('lang')).toBe('en')
})
```

`afterEach`에 `localStorage.clear()`를 더한다.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/language.test.tsx src/components/Header.test.tsx`
Expected: FAIL (모듈 없음 / combobox 없음).

- [ ] **Step 3: Implement**

`main.tsx`와 `test/render.tsx`에서 `ToastProvider` 바깥에 `LanguageProvider`를 감싼다. `Header`에서 `<span className="flex-1" />` 바로 뒤, 로그인/글쓰기 앞에 `<LanguageSelect />`. 스타일은 `rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200`.

- [ ] **Step 4: Run tests, lint, build**

Run: `cd frontend && npm test && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "Add header language setting"
```

---

### Task 7: 설명 파서와 카드 한 장

**Files:**
- Create: `frontend/src/lib/augmentDescription.ts`, `frontend/src/components/augment/AugmentCard.tsx`
- Modify: `frontend/src/api/types.ts`
- Test: `frontend/src/lib/augmentDescription.test.ts`, `frontend/src/components/augment/AugmentCard.test.tsx`

**Interfaces:**
- Produces:
  - `types.ts`: `type AugmentText = { locale: Language; name: string; description: string }`, `type AugmentDetail = { id: string; rarity: AugmentRarity; iconUrl: string; original: AugmentText | null; translation: AugmentText | null }`.
  - `augmentDescription.ts`: `type Segment = { kind: 'text'; text: string; color: string | null; italic: boolean } | { kind: 'break' }`; `parseDescription(description: string): Segment[]`; `toPlainText(description: string): string` (표식 제거, `<br>` → `\n`, 앞뒤 공백 제거); `DESCRIPTION_COLORS: Record<string, string>` (Global Constraints 표).
  - `AugmentCard({ text, rarity, iconUrl }: { text: AugmentText; rarity: AugmentRarity; iconUrl: string })`: `<article aria-label={text.name}>`; 복사 버튼 `aria-label="복사"`는 `group-hover`·`group-focus-within`과 `@media (hover: none)`에서 보이게(`opacity-0 -translate-y-1.5 transition group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:… [@media(hover:none)]:opacity-100`); 누르면 `navigator.clipboard.writeText(toPlainText(text.description))` → 토스트 "복사했어요" / 실패·미지원 "복사하지 못했어요". 등급 표 문구는 `text.locale`에 따라(ko: 일반/골드/프리즘, 그 외: Silver/Gold/Prismatic).

- [ ] **Step 1: Write the failing tests**

```ts
// augmentDescription.test.ts
it('maps known tags to colors and unknown tags to plain text', () => {
  expect(parseDescription('Gain <magicDamage>75~150 AP</magicDamage> and <foo>x</foo>')).toEqual([
    { kind: 'text', text: 'Gain ', color: null, italic: false },
    { kind: 'text', text: '75~150 AP', color: '#49b6ff', italic: false },
    { kind: 'text', text: ' and ', color: null, italic: false },
    { kind: 'text', text: 'x', color: null, italic: false },
  ])
})
it('turns <br> into breaks and rules into italic', () => {
  expect(parseDescription('a<br><br><rules>b</rules>')).toEqual([
    { kind: 'text', text: 'a', color: null, italic: false }, { kind: 'break' }, { kind: 'break' },
    { kind: 'text', text: 'b', color: '#8d99ae', italic: true },
  ])
})
it('makes plain text for copying', () => {
  expect(toPlainText('Gain <shield>150 Shield</shield>.<br><br><rules>Max.</rules>')).toBe('Gain 150 Shield.\n\nMax.')
})

// AugmentCard.test.tsx
const text = { locale: 'ko', name: '불길한 서약', description: '<magicDamage>주문력</magicDamage> 75~150<br>규칙' } as const
it('renders name, rarity label, colored text and frame by rarity', () => {
  renderWithProviders(<AugmentCard text={text} rarity="PRISMATIC" iconUrl="i.png" />)
  expect(screen.getByRole('article', { name: '불길한 서약' })).toBeInTheDocument()
  expect(screen.getByText('프리즘')).toBeInTheDocument()
  expect(screen.getByText('주문력')).toHaveStyle({ color: '#49b6ff' })
  expect(document.querySelector('img[src$="augmentcard_frame_prismatic.png"]')).toBeInTheDocument()
})
it('uses English rarity labels for en text', () => { /* locale 'en', rarity 'SILVER' → 'Silver' */ })
it('copies plain text and toasts', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  renderWithProviders(<AugmentCard text={text} rarity="GOLD" iconUrl="i.png" />)
  await userEvent.click(screen.getByRole('button', { name: '복사' }))
  expect(writeText).toHaveBeenCalledWith('주문력 75~150\n규칙')
  expect(await screen.findByText('복사했어요')).toBeInTheDocument()
})
it('toasts when the clipboard is unavailable', async () => {
  vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
  // 클릭 → '복사하지 못했어요'
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/lib/augmentDescription.test.ts src/components/augment/AugmentCard.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

파서는 `<(/?)([A-Za-z]+)[^>]*>`로 토큰을 나누고 열린 표식 스택의 맨 위로 색을 정한다(중첩은 안쪽이 이긴다). 카드 구조와 클래스는 목업 `.card`, `.oct`, `.pill`, `.copy`를 Tailwind로 옮긴다(팔각형은 `[clip-path:polygon(29%_0,71%_0,100%_29%,100%_71%,71%_100%,29%_100%,0_71%,0_29%)]`, 볼트 6개는 `aria-hidden` span). 그림 주소는 `augmentDescription.ts`가 아니라 `AugmentCard.tsx` 상단 상수 `CARD_ASSETS`에 둔다.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/augmentDescription.test.ts src/components/augment/AugmentCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "Add augment card and description parser"
```

---

### Task 8: 카드 묶음(상세 불러오기, 한 장/두 장)

**Files:**
- Create: `frontend/src/components/augment/AugmentCards.tsx`
- Modify: `frontend/src/api/gamedata.ts`
- Test: `frontend/src/components/augment/AugmentCards.test.tsx`

**Interfaces:**
- Consumes: `useLanguage`, `ORIGINAL_LANGUAGE`, `languageName` (Task 6), `AugmentCard` (Task 7).
- Produces: `useAugmentDetail(id: string, lang: Language)` → `useQuery({ queryKey: ['augments', id, lang], queryFn: apiFetch<AugmentDetail>(`/api/augments/${encodeURIComponent(id)}?lang=${lang}`), staleTime: Infinity })`; `AugmentCards({ augmentId }: { augmentId: string })`.

- [ ] **Step 1: Write the failing tests**

```tsx
const detail = (translation: AugmentText | null) => ({ id: 'OminousPact', rarity: 'PRISMATIC', iconUrl: 'i.png',
  original: { locale: 'en', name: 'Ominous Pact', description: 'Gain AP' }, translation })

it('shows original and translation cards with labels', async () => {
  mockApi({ 'GET /api/augments/OminousPact': () => json(detail({ locale: 'ko', name: '불길한 서약', description: '주문력' })) })
  renderWithProviders(<AugmentCards augmentId="OminousPact" />)
  expect(await screen.findByRole('article', { name: 'Ominous Pact' })).toBeInTheDocument()
  expect(screen.getByRole('article', { name: '불길한 서약' })).toBeInTheDocument()
  expect(screen.getByText('원문')).toBeInTheDocument()
  expect(screen.getByText('번역')).toBeInTheDocument()
  expect(screen.getByText('한국어')).toBeInTheDocument()
})
it('asks the API for the current language and shows one card when it equals the original', async () => {
  localStorage.setItem('lang', 'en')
  const api = mockApi({ 'GET /api/augments/OminousPact': () => json(detail(null)) })
  renderWithProviders(<AugmentCards augmentId="OminousPact" />)
  await screen.findByRole('article', { name: 'Ominous Pact' })
  expect(api.find('GET', '/api/augments/OminousPact')[0].query.get('lang')).toBe('en')
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.queryByText('번역')).not.toBeInTheDocument()
})
it('shows an empty frame when a translation row is missing', async () => {
  // lang ko, translation null → '아직 설명이 없어요' 가 번역 자리에, article 은 1개
})
it('shows loading and error states', async () => { /* '불러오는 중이에요' → 500 응답이면 '잠시 후 다시 시도해주세요' */ })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/augment/AugmentCards.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

배치는 `flex flex-wrap justify-center gap-9` (300px 카드 두 장이 안 들어가는 폭에서는 자연히 위아래로 쌓인다 — `useMediaQuery` 불필요). 각 카드 위 표지는 `h-7 text-xs text-slate-400`에 `<span class="rounded-md bg-slate-800 px-2 py-0.5 font-semibold text-slate-300">원문</span> English` / `번역 {languageName(language)}`. 번역 카드를 숨기는 조건: `language === ORIGINAL_LANGUAGE`. 번역 행이 없으면(`translation === null`이고 언어가 원문과 다름) 같은 크기의 빈 틀(`border border-dashed border-slate-700`)에 "아직 설명이 없어요". `original`이 null이어도 같은 빈 틀.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/augment/AugmentCards.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "Add augment cards with language-aware translation card"
```

---

### Task 9: 펼침 영역에 카드와 한 줄 목록 넣기

**Files:**
- Modify: `frontend/src/components/PostListItem.tsx`, `frontend/src/components/tags/TagPostsPanel.tsx`, `frontend/src/pages/AugmentsPage.tsx`
- Test: `frontend/src/components/PostListItem.test.tsx`, `frontend/src/components/tags/TagPostsPanel.test.tsx`, `frontend/src/pages/AugmentsPage.test.tsx`

**Interfaces:**
- Consumes: `AugmentCards` (Task 8).
- Produces: `PostListItem({ post, compact = false })` — `compact`면 한 줄: `▲ n` · 제목 링크 · 패치 표 · 글쓴이 · 상대 시간 · `💬 n`, 태그 아이콘 없음. `TagPostsPanel` 새 props `children?: ReactNode`(제목 줄 아래), `postsHeading?: string`(있으면 글 목록 위에 그 제목과 정렬 버튼을 두고 제목 줄에서는 정렬 버튼을 뺀다), `compact?: boolean`(목록 항목에 전달).

- [ ] **Step 1: Write the failing tests**

```tsx
// PostListItem.test.tsx 에 추가
it('compact mode is one line without tag icons', () => {
  renderWithProviders(<ul><PostListItem post={listItem({ title: '한 줄 글' })} compact /></ul>)
  expect(screen.getByRole('link', { name: '한 줄 글' })).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.queryByText('추천')).not.toBeInTheDocument()
})

// TagPostsPanel.test.tsx 에 추가
it('renders children under the title row and sort pills in the posts heading', async () => {
  setup(7, 'augment', {}, { children: <p>카드 자리</p>, postsHeading: '이 증강 글 7개', compact: true })
  const region = await screen.findByRole('region', { name: '하체 운동의 날 게시글' })
  expect(within(region).getByText('카드 자리')).toBeInTheDocument()
  const heading = within(region).getByRole('heading', { name: '이 증강 글 7개' })
  expect(within(heading.parentElement!).getByRole('button', { name: '추천순' })).toBeInTheDocument()
})
it('champion panel is unchanged', async () => { /* kind champion, children 없음 → 정렬 버튼이 제목 줄에, 기존 테스트 그대로 통과 */ })

// AugmentsPage.test.tsx 에 추가
it('opening an augment shows its cards above the posts', async () => {
  // 기존 setup 에 'GET /api/augments/ARAM_LegDay' → json(detail) 추가, 칸 클릭
  expect(await screen.findByRole('article', { name: 'Leg Day' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /이 증강 글/ })).toBeInTheDocument()
})
```

`setup` 도우미에 네 번째 인자(추가 props)를 더한다.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/PostListItem.test.tsx src/components/tags/TagPostsPanel.test.tsx src/pages/AugmentsPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`AugmentsPage.renderPanel`: `<TagPostsPanel … compact postsHeading={`이 증강 글 ${countOf(a)}개`}><AugmentCards augmentId={id} /></TagPostsPanel>`. `TagPostsPanel`의 글 목록 제목은 `<h3 className="text-sm font-bold">`와 정렬 버튼을 `flex items-center justify-between` 줄에, 목록은 `rounded-xl border border-slate-800` 안에. `postsHeading`이 없으면 지금 모양 그대로.

- [ ] **Step 4: Run all frontend checks**

Run: `cd frontend && npm test && npm run build && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "Show augment cards and compact posts in the augment panel"
```

---

### Task 10: 실제 서버로 확인하고 문서 갱신

**Files:**
- Modify: `CLAUDE.md` (남은 일·완료 목록), 필요하면 `gamedata/text/AugmentLocale.java` (스탯 이름 추가, Task 3 Step 6)

- [ ] **Step 1: Start backend and watch the first sync**

Docker가 떠 있는지 `docker info`로 확인(안 떠 있으면 사용자에게 켜 달라고 한다). 8080에 남은 `BackendApplication` 프로세스를 정리하고 `cd backend && ./gradlew bootRun`을 백그라운드로. 로그에서 `Game data synced to … (173 champions, 199 augments, N unresolved placeholders)`를 확인한다. N이 20을 넘으면 Task 3 Step 6대로 스탯 이름을 더하고 다시 동기화한다(`update game_data_state set current_ddragon_version = null` 후 재시작).

- [ ] **Step 2: Check the API**

Run: `curl -s "http://localhost:8080/api/augments/OminousPact?lang=ko"`
Expected: `translation.description`이 설계 4.4의 검증 문장과 같고(`주문력을 75~150`, `이동 속도를 50%`), `original`이 영어. `ARAM_CourageoftheColossus`의 `translation.description`에 `150~450 (+최대 체력의 4%)`가 있고 "생성한 보호막"이 없다.

- [ ] **Step 3: Check the screen in the preview browser**

`.claude/launch.json`의 `frontend`로 미리보기를 띄워 `/augments?open=OminousPact`를 연다. 확인: 카드 두 장(테두리가 등급 그림, 색 단어), 마우스를 올리면 복사 버튼, 복사 후 토스트, 머리말 언어를 English로 바꾸면 카드 한 장, 글 목록이 한 줄짜리, 창 폭 700px에서 카드가 위아래로 쌓임. 챔피언 탭 펼침 영역은 그대로. 스크린샷을 남긴다.

Step 1의 "못 채운 자리표시자" 수가 20을 넘으면: 동기화 로그에 남은 자리표시자 이름과 그 식의 `mStat` 번호를 보고, 툴팁에서 그 식을 감싼 색 표식(`<scaleArmor>` → 방어력/Armor, `<scaleMR>` → 마법 저항력/MR, `<scaleHealth>` → 체력/Health, `<attackSpeed>` → 공격 속도/Attack Speed, `<speed>` → 이동 속도/Move Speed)으로 이름이 분명한 번호만 `AugmentLocale.statName`에 더하고 `SpellValueResolverTest`에 그 번호의 테스트를 하나씩 추가한 뒤 다시 동기화한다. 분명하지 않은 번호는 그대로 둔다.

- [ ] **Step 4: Update `CLAUDE.md`**

"남은 일 → 완료"에 `2026-10-24: 증강 카드(…)` 한 줄(설계·계획 경로 포함), "기술 주의사항"에 "증강 설명은 동기화 때 언어별로 계산해 `augment_texts`에 저장한다. 언어를 더하려면 `AugmentLocale`에 항목을 추가한다. 못 채운 자리표시자는 동기화 로그에 수가 남는다." 한 줄, 검토에서 미룬 문제가 있으면 목록으로.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md backend/src
git commit -m "Record augment card feature in CLAUDE.md"
```
