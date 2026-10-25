package com.aram.community.gamedata.item;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.aram.community.gamedata.text.SpellValues;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class ItemValuesTest {

	static JsonNode item(int id) throws IOException {
		return ItemCatalogTest.items().get(id);
	}

	@Test
	void kiwiOverrideWins() throws IOException {
		// 우글렛의 마녀모자: 기본 Cooldown 20, Kiwi 60.
		SpellValues values = ItemValues.from(item(228002));

		assertThat(values.dataValue("Cooldown")).contains(List.of(60.0));
		assertThat(values.dataValue("APAmp")).contains(List.of(0.5));
	}

	@Test
	void kiwiBeatsAramWhenBothDiffer() throws IOException {
		JsonNode item = ItemCatalogTest.MAPPER.readTree("""
				{ "mDataValues": [ { "mName": "Power", "mValue": 1.0 } ],
				  "DataValuesModeOverride": {
				    "ARAM": { "DataValues": [ { "mName": "Power", "mValue": 2.0 } ] },
				    "Kiwi": { "DataValues": [ { "mName": "Power", "mValue": 3.0 } ] },
				    "URF": { "DataValues": [ { "mName": "Power", "mValue": 4.0 } ] } } }
				""");

		assertThat(ItemValues.from(item).dataValue("Power")).contains(List.of(3.0));
	}

	@Test
	void aramOverrideUsedWhenNoKiwi() throws IOException {
		SpellValues values = ItemValues.from(item(3084));

		assertThat(values.dataValue("DamageToMaxHealthRatio").orElseThrow().get(0)).isCloseTo(0.05,
				within(1e-6));
		// 덮어쓰지 않은 값은 기본 그대로예요.
		assertThat(values.dataValue("BaseDamage")).contains(List.of(70.0));
	}

	@Test
	void statFieldsReadable() throws IOException {
		SpellValues values = ItemValues.from(item(3084));

		assertThat(values.dataValue("FlatHPPoolMod")).contains(List.of(900.0));
		assertThat(values.dataValue("PercentBaseHPRegenMod")).contains(List.of(1.0));
	}

	@Test
	void statFieldsWithoutMPrefixReadable() throws IOException {
		// 마나무네의 마나는 자료에 m 없이 `flatMPPoolMod`로 들어 있어요. 설명은 @FlatMPPoolMod@로 불러요.
		SpellValues values = ItemValues.from(item(3004));

		assertThat(values.dataValue("FlatMPPoolMod")).contains(List.of(500.0));
	}

	@Test
	void missingValueCountsAsZero() throws IOException {
		// 마나무네의 TakedownMana는 mValue가 없어요. 게임 자료의 기본값 0이에요.
		SpellValues values = ItemValues.from(item(3004));

		assertThat(values.dataValue("TakedownMana")).contains(List.of(0.0));
	}

	@Test
	void effectAmountsNamedByPosition() throws IOException {
		// 옛 방식 수치 배열: @Effect1Amount@ = mEffectAmount[0], @Effect2Amount@ = mEffectAmount[1] …
		// 칸 자체가 배열이면 첫 값을 써요.
		JsonNode item = ItemCatalogTest.MAPPER.readTree("""
				{ "mEffectAmount": [ 0.0, 2.5, [ 20.0, 30.0 ] ] }
				""");

		SpellValues values = ItemValues.from(item);

		assertThat(values.dataValue("Effect1Amount")).contains(List.of(0.0));
		assertThat(values.dataValue("Effect2Amount")).contains(List.of(2.5));
		assertThat(values.dataValue("Effect3Amount")).contains(List.of(20.0));
		assertThat(values.dataValue("Effect4Amount")).isEmpty();
	}

	@Test
	void calculationsReadable() throws IOException {
		SpellValues values = ItemValues.from(item(3084));

		assertThat(values.calculation("ProcHealthGain")).isPresent();
		assertThat(values.calculation("TotalDemolishTime")).isPresent();
	}

	@Test
	void ofKeepsLowercaseAndHashedNames() {
		SpellValues values = SpellValues.of(Map.of("Power", List.of(1.0)), Map.of());

		assertThat(values.dataValue("power")).contains(List.of(1.0));
		assertThat(values.dataValue(SpellValues.hashedName("Power"))).contains(List.of(1.0));
	}

}
