package com.aram.community.gamedata.text;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tools.jackson.databind.JsonNode;

/**
 * 챔피언 스킬({{SpellName}})이 어느 칸(Q/W/E/R)인지 자료로 알 수 있으면 알려줘요. 대부분의 스킬 증강은 챔피언마다 칸이 달라서
 * 알 수 없고, 증강 이름 끝(`GoH_PentakillAug_W`)이나 수치 이름 앞(`WAbilityHaste`)에 칸이 적힌 것만 고정이에요.
 */
public final class AbilitySlot {

	private static final Pattern ID_SUFFIX = Pattern.compile("_([QWER])$");

	private static final Pattern VALUE_PREFIX = Pattern.compile("^([QWER])[A-Z]");

	private AbilitySlot() {
	}

	public static Optional<String> of(String augmentId, List<JsonNode> spellObjects) {
		Matcher id = ID_SUFFIX.matcher(augmentId);
		if (id.find()) {
			return Optional.of(id.group(1));
		}
		Set<String> slots = new HashSet<>();
		for (JsonNode spellObject : spellObjects) {
			for (JsonNode dv : spellObject.path("mSpell").path("DataValues")) {
				Matcher m = VALUE_PREFIX.matcher(dv.path("name").asString(""));
				if (m.find()) {
					slots.add(m.group(1));
				}
			}
		}
		// 단서가 하나로 모일 때만 믿어요.
		return slots.size() == 1 ? Optional.of(slots.iterator().next()) : Optional.empty();
	}

}
