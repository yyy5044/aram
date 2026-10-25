package com.aram.community.gamedata.item;

import com.aram.community.gamedata.text.SpellValues;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import tools.jackson.databind.JsonNode;

/**
 * 아이템 하나(`ItemData`)의 설명에 넣을 수치를 모아요. 능력치 필드(`mFlatHPPoolMod: 900` → `@FlatHPPoolMod@`),
 * 옛 방식 수치 배열(`mEffectAmount[0]` → `@Effect1Amount@`), 수치(`mDataValues`), 계산식(`mItemCalculations`)이에요. 수치는 증강 칼바람 값이 먼저예요: `Kiwi` > `ARAM` > 기본.
 */
public final class ItemValues {

	/** 덮어쓰기를 적용하는 순서. 뒤에 오는 것이 이겨요. */
	private static final List<String> MODE_OVERRIDES = List.of("ARAM", "Kiwi");

	private ItemValues() {
	}

	public static SpellValues from(JsonNode item) {
		// 소문자 이름으로 모아서, 뒤에 넣은 값(덮어쓰기)이 대소문자와 상관없이 앞 값을 바꾸게 해요.
		Map<String, List<Double>> values = new LinkedHashMap<>();
		item.properties().forEach(e -> {
			if (e.getValue().isNumber()) {
				values.put(statName(e.getKey()).toLowerCase(Locale.ROOT), List.of(e.getValue().asDouble()));
			}
		});
		putEffectAmounts(values, item.path("mEffectAmount"));
		putDataValues(values, item.path("mDataValues"));
		JsonNode overrides = item.path("DataValuesModeOverride");
		for (String mode : MODE_OVERRIDES) {
			putDataValues(values, overrides.path(mode).path("DataValues"));
		}
		Map<String, JsonNode> calculations = new HashMap<>();
		item.path("mItemCalculations").properties().forEach(e -> calculations.put(e.getKey(), e.getValue()));
		return SpellValues.of(values, calculations);
	}

	/**
	 * 능력치 필드 이름에서 앞의 `m`을 떼요(`mFlatHPPoolMod` → `FlatHPPoolMod`). 마나(`flatMPPoolMod`)처럼 `m` 없이 오는
	 * 필드도 있어서, 숫자 필드는 이름 그대로도 모두 받아요.
	 */
	private static String statName(String field) {
		if (field.length() > 1 && field.charAt(0) == 'm' && Character.isUpperCase(field.charAt(1))) {
			return field.substring(1);
		}
		return field;
	}

	/** `mEffectAmount`의 i번째 값은 `@Effect{i+1}Amount@`예요. 칸 자체가 배열이면 첫 값을 써요. */
	private static void putEffectAmounts(Map<String, List<Double>> values, JsonNode amounts) {
		for (int i = 0; i < amounts.size(); i++) {
			JsonNode amount = amounts.get(i);
			if (amount.isArray()) {
				amount = amount.path(0);
			}
			if (amount.isNumber()) {
				values.put("effect" + (i + 1) + "amount", List.of(amount.asDouble()));
			}
		}
	}

	/** 값이 빠진 항목은 게임 자료의 기본값 0이에요. */
	private static void putDataValues(Map<String, List<Double>> values, JsonNode dataValues) {
		for (JsonNode dv : dataValues) {
			String name = dv.path("mName").asString("");
			if (!name.isEmpty()) {
				values.put(name.toLowerCase(Locale.ROOT), List.of(dv.path("mValue").asDouble(0)));
			}
		}
	}

}
