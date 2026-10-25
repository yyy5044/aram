package com.aram.community.gamedata.item;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.gamedata.text.AugmentLocale;
import com.aram.community.gamedata.text.SpellValues;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class ItemDescriptionBuilderTest {

	static Map<String, String> table(String name) throws IOException {
		String text = new ClassPathResource("gamedata/" + name).getContentAsString(StandardCharsets.UTF_8);
		Map<String, String> entries = new HashMap<>();
		ItemCatalogTest.MAPPER.readTree(text).path("entries").properties()
			.forEach(e -> entries.put(e.getKey(), e.getValue().asString()));
		return entries;
	}

	static Function<String, Optional<String>> lookup(Map<String, String> table) {
		return key -> Optional.ofNullable(table.get(key.toLowerCase(Locale.ROOT)));
	}

	static ItemDescriptionBuilder.Result build(AugmentLocale locale, String tableName, int id) throws IOException {
		Map<String, String> table = table(tableName);
		SpellValues values = ItemValues.from(ItemCatalogTest.items().get(id));
		return new ItemDescriptionBuilder(locale, lookup(table))
			.build(table.get("generatedtip_item_" + id + "_description"), values);
	}

	@Test
	void heartsteelUsesAramPercent() throws IOException {
		ItemDescriptionBuilder.Result r = build(AugmentLocale.KO, "stringtable.json", 3084);

		assertThat(r.description()).contains("5%").contains("900").doesNotContain("10%");
		assertThat(r.description()).doesNotContain("<flavorText").doesNotContain("<section").doesNotContain("{{");
		// 능력치 줄과 기본 지속 효과가 <br>로 이어져요. 빈 section 때문에 앞에 빈 줄이 생기지 않아요.
		assertThat(r.description()).startsWith("체력 <attention>900</attention><br>");
		assertThat(r.description()).contains("<attention>100%</attention>");
		// {{ Item_Cooldown }}이 채워져요: 대상별 (30초).
		assertThat(r.description()).contains("(30초)");
		assertThat(r.unresolved()).isZero();
	}

	@Test
	void heartsteelEnglish() throws IOException {
		ItemDescriptionBuilder.Result r = build(AugmentLocale.EN, "stringtable-en.json", 3084);

		assertThat(r.description()).startsWith("<attention>900</attention> Health<br>");
		assertThat(r.description()).contains("<scaleHealth>5%</scaleHealth>").contains("(30s) per target");
		assertThat(r.unresolved()).isZero();
	}

	@Test
	void manamuneInlinesReference() throws IOException {
		ItemDescriptionBuilder.Result r = build(AugmentLocale.KO, "stringtable.json", 3004);

		assertThat(r.description()).doesNotContain("{{").doesNotContain("}}");
		// 마나(m 없는 flatMPPoolMod)와 증강 칼바람 값 4.5가 채워져요.
		assertThat(r.description()).contains("<attention>500</attention>").contains("<scaleMana>4.5");
	}

	@Test
	void woogletFillsEffectAmount() throws IOException {
		ItemDescriptionBuilder.Result r = build(AugmentLocale.KO, "stringtable.json", 228002);

		// @Effect2Amount@는 옛 방식 수치 배열(mEffectAmount)의 두 번째 값 2.5예요.
		assertThat(r.description()).doesNotContain("@Effect2Amount@").contains("2.5초");
		// 게임 중 누적치(@f1@)만 남아요.
		assertThat(r.unresolved()).isPositive();
		// {{ Item_OnActivation }} {{ Item_Cooldown }}이 채워지고, 쿨타임은 Kiwi 값 60초예요.
		assertThat(r.description()).doesNotContain("{{").contains("<active>").contains("(60초)");
	}

	@Test
	void unknownReferenceIsRemoved() throws IOException {
		Map<String, String> table = table("stringtable.json");
		SpellValues values = ItemValues.from(ItemCatalogTest.items().get(3084));

		ItemDescriptionBuilder.Result r = new ItemDescriptionBuilder(AugmentLocale.KO, key -> Optional.empty())
			.build(table.get("generatedtip_item_3084_description"), values);

		assertThat(r.description()).doesNotContain("{{").doesNotContain("Item_Cooldown");
		assertThat(r.unresolved()).isEqualTo(1);
	}

	@Test
	void dropsFlavorTextWithContent() {
		ItemDescriptionBuilder.Result r = new ItemDescriptionBuilder(AugmentLocale.KO, key -> Optional.empty()).build(
				"<section>a</section><section> </section><section><flavorText>옛이야기</flavorText></section><section>b</section>",
				SpellValues.of(Map.of(), Map.of()));

		assertThat(r.description()).isEqualTo("a<br>b");
	}

	@Test
	void listItemsBreakLines() {
		ItemDescriptionBuilder.Result r = new ItemDescriptionBuilder(AugmentLocale.KO, key -> Optional.empty()).build(
				"<section><li><passive>첫째:</passive> 회복합니다.</li><li><passive>불굴의 의지:</passive> 강해져요.</li></section>",
				SpellValues.of(Map.of(), Map.of()));

		// 목록 항목이 한 줄로 붙지 않고 줄마다 나뉘어요. 맨 앞에 빈 줄은 생기지 않아요.
		assertThat(r.description())
			.isEqualTo("<passive>첫째:</passive> 회복합니다.<br><passive>불굴의 의지:</passive> 강해져요.");
	}

	@Test
	void nullTemplateIsEmpty() {
		ItemDescriptionBuilder.Result r = new ItemDescriptionBuilder(AugmentLocale.KO, key -> Optional.empty())
			.build(null, SpellValues.of(Map.of(), Map.of()));

		assertThat(r.description()).isEmpty();
		assertThat(r.unresolved()).isZero();
	}

}
