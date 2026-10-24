package com.aram.community.gamedata.text;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** 챔피언 스킬({{SpellName}})이 어느 칸인지 자료로 알 수 있는 증강만 칸을 알려줘요. */
class AbilitySlotTest {

	static final JsonMapper MAPPER = JsonMapper.builder().build();

	static List<JsonNode> spellWith(String... dataValueNames) {
		StringBuilder sb = new StringBuilder();
		for (String n : dataValueNames) {
			sb.append(sb.isEmpty() ? "" : ",").append("{\"name\":\"").append(n).append("\",\"values\":[1,1,1,1,1,1,1]}");
		}
		return List.of(MAPPER.readTree("{\"mSpell\":{\"DataValues\":[" + sb + "]}}"));
	}

	@Test
	void slotFromAugmentIdSuffix() {
		assertThat(AbilitySlot.of("GoH_PentakillAug_W", spellWith())).contains("W");
		assertThat(AbilitySlot.of("GoH_PentakillAug_R", spellWith())).contains("R");
	}

	@Test
	void slotFromDataValueNames() {
		assertThat(AbilitySlot.of("ARAM_BreadAndJam", spellWith("WAbilityHaste"))).contains("W");
		assertThat(AbilitySlot.of("ARAM_BreadAndButter", spellWith("QAbilityHaste", "QReducedAbilityHaste"))).contains("Q");
	}

	@Test
	void noSlotWhenChampionDecides() {
		assertThat(AbilitySlot.of("Bonk", spellWith("DamageMultiplier", "AoERange"))).isEmpty();
	}

	@Test
	void noSlotWhenCluesDisagree() {
		assertThat(AbilitySlot.of("Mixed", spellWith("QFoo", "WBar"))).isEmpty();
	}

}
