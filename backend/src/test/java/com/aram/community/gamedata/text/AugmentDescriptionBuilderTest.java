package com.aram.community.gamedata.text;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class AugmentDescriptionBuilderTest {

	static final JsonMapper MAPPER = JsonMapper.builder().build();

	static final Function<String, Optional<String>> NO_STRINGS = key -> Optional.empty();

	static String fixture(String name) throws IOException {
		return new ClassPathResource("gamedata/" + name).getContentAsString(StandardCharsets.UTF_8);
	}

	/** 조각 파일(증강 + 스펠 항목)에서 그 증강의 스펠 항목들로 SpellValues를 만들어요. */
	static SpellValues valuesOf(String fixtureName, String augmentKey) throws IOException {
		JsonNode root = MAPPER.readTree(fixture(fixtureName));
		JsonNode augment = root.path(augmentKey);
		List<JsonNode> spells = new java.util.ArrayList<>();
		spells.add(root.path(augment.path("RootSpell").asString()));
		augment.path("AdditionalSpells").forEach(p -> spells.add(root.path(p.asString())));
		return SpellValues.from(spells);
	}

	static String stripTags(String s) {
		return s.replaceAll("<[^>]+>", "");
	}

	static Function<String, Optional<String>> strings(Map<String, String> table) {
		return key -> Optional.ofNullable(table.get(key.toLowerCase(java.util.Locale.ROOT)));
	}

	@Test
	void ominousPactKo() throws IOException {
		SpellValues values = valuesOf("ominous-pact.json", "Maps/ModeSpecificData/Augments/OminousPact");
		AugmentDescriptionBuilder.Result r = new AugmentDescriptionBuilder(AugmentLocale.KO, NO_STRINGS)
			.build(fixture("ominous-pact-ko.txt"), values);

		assertThat(stripTags(r.description())).isEqualTo(
				"잃은 체력에 비례하여 주문력을 75~150, 이동 속도를 50%, 모든 피해 흡혈을 20%을 얻습니다. 스킬 사용 시 현재 체력의 5%를 소모합니다.체력이 30%일 때 최대 효과를 얻습니다.");
		assertThat(r.description()).contains("<magicDamage>").contains("<rules>");
		assertThat(r.unresolved()).isEmpty();
	}

	@Test
	void courageDropsTrackingLineKo() throws IOException {
		SpellValues values = valuesOf("courage.json", "Maps/ModeSpecificData/Augments/ARAM_CourageoftheColossus");
		AugmentDescriptionBuilder.Result r = new AugmentDescriptionBuilder(AugmentLocale.KO, NO_STRINGS)
			.build(fixture("courage-ko.txt"), values);

		assertThat(r.description()).contains("150~450 (+최대 체력의 4%)").contains("<shield>");
		assertThat(r.description()).doesNotContain("생성한 보호막").doesNotEndWith("<br>");
		assertThat(r.unresolved()).isEmpty();
	}

	@Test
	void courageEn() throws IOException {
		SpellValues values = valuesOf("courage.json", "Maps/ModeSpecificData/Augments/ARAM_CourageoftheColossus");
		AugmentDescriptionBuilder.Result r = new AugmentDescriptionBuilder(AugmentLocale.EN, NO_STRINGS)
			.build(fixture("courage-en.txt"), values);

		assertThat(r.description()).isEqualTo(
				"Gain <shield>150~450 (+4% max Health) Shield</shield> after <status>Immobilizing</status> or <status>Grounding</status> an enemy champion.");
	}

	@Test
	void inlinesStringReferencesRecursively() {
		AugmentDescriptionBuilder b = new AugmentDescriptionBuilder(AugmentLocale.EN,
				strings(Map.of("kiwi_x_summary", "Your {{SpellName}} hits twice.")));
		AugmentDescriptionBuilder.Result r = b.build("{{Kiwi_X_Summary}}<br><br>Hits: @f1@", SpellValues.from(List.of()));

		assertThat(r.description()).isEqualTo("Your [Ability] hits twice.");
	}

	@Test
	void keepsUnknownReferenceAndPlaceholder() {
		AugmentDescriptionBuilder b = new AugmentDescriptionBuilder(AugmentLocale.EN, NO_STRINGS);
		AugmentDescriptionBuilder.Result r = b.build("{{Kiwi_Nope}} deals @Ult_DamageAmp@", SpellValues.from(List.of()));

		assertThat(r.description()).isEqualTo("{{Kiwi_Nope}} deals @Ult_DamageAmp@");
		assertThat(r.unresolved()).containsExactly("Ult_DamageAmp");
	}

	@Test
	void removesStatTrackingAndCollapsesBlankLines() {
		AugmentDescriptionBuilder b = new AugmentDescriptionBuilder(AugmentLocale.EN, NO_STRINGS);
		AugmentDescriptionBuilder.Result r = b.build(
				"Damage: @f1.0@<br>Kills: @f2.0@<br><br><statTracking>x</statTracking><br>Real text<br>",
				SpellValues.from(List.of()));

		assertThat(r.description()).isEqualTo("Real text");
		assertThat(r.unresolved()).isEmpty();
	}

	@Test
	void stripsNonColorTagsKeepsColorTags() {
		AugmentDescriptionBuilder b = new AugmentDescriptionBuilder(AugmentLocale.EN, NO_STRINGS);
		AugmentDescriptionBuilder.Result r = b.build(
				"<mainText><font color='#fff'>Hi</font> <scaleAP>AP</scaleAP> %i:scaleHealShield%<li>a</li></mainText>",
				SpellValues.from(List.of()));

		assertThat(r.description()).isEqualTo("Hi <scaleAP>AP</scaleAP> a");
	}

	@Test
	void trimsSpacesAroundReferenceKeys() {
		AugmentDescriptionBuilder b = new AugmentDescriptionBuilder(AugmentLocale.EN,
				strings(Map.of("item_keyword_onhit", "On-Hit")));
		AugmentDescriptionBuilder.Result r = b.build("Gain {{ Item_Keyword_OnHit }} effects", SpellValues.from(List.of()));

		assertThat(r.description()).isEqualTo("Gain On-Hit effects");
	}

}
