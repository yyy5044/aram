package com.aram.community.gamedata.text;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import tools.jackson.databind.JsonNode;

/**
 * 증강의 스펠 항목들(또는 아이템, {@link #of})에서 모은 수치(DataValues)와 계산식(mSpellCalculations). 같은 이름은 먼저 온
 * 항목이 이겨요.
 */
public final class SpellValues {

	private final Map<String, List<Double>> dataValues;

	private final Map<String, JsonNode> calculations;

	private SpellValues(Map<String, List<Double>> dataValues, Map<String, JsonNode> calculations) {
		this.dataValues = dataValues;
		this.calculations = calculations;
	}

	public static SpellValues from(List<JsonNode> spellObjects) {
		Map<String, List<Double>> dataValues = new HashMap<>();
		Map<String, JsonNode> calculations = new HashMap<>();
		for (JsonNode spellObject : spellObjects) {
			JsonNode spell = spellObject.path("mSpell");
			for (JsonNode dv : spell.path("DataValues")) {
				String name = dv.path("name").asString("").toLowerCase(Locale.ROOT);
				JsonNode values = dv.path("values");
				if (name.isEmpty() || !values.isArray() || values.isEmpty()) {
					continue;
				}
				List<Double> list = new ArrayList<>();
				values.forEach(v -> list.add(v.asDouble()));
				putWithHash(dataValues, name, list);
			}
			spell.path("mSpellCalculations").properties().forEach(e -> putWithHash(calculations, e.getKey(), e.getValue()));
		}
		return new SpellValues(dataValues, calculations);
	}

	/** 이미 모은 수치와 계산식으로 만들어요(아이템처럼 스펠 항목이 아닌 자료). 이름은 대소문자를 가리지 않아요. */
	public static SpellValues of(Map<String, List<Double>> dataValues, Map<String, JsonNode> calculations) {
		Map<String, List<Double>> values = new HashMap<>();
		dataValues.forEach((name, list) -> {
			if (!name.isEmpty() && !list.isEmpty()) {
				putWithHash(values, name, List.copyOf(list));
			}
		});
		Map<String, JsonNode> calcs = new HashMap<>();
		calculations.forEach((name, calc) -> putWithHash(calcs, name, calc));
		return new SpellValues(values, calcs);
	}

	/** 소문자 이름과, 계산식이 해시 이름으로 가리킬 때를 위한 해시 이름으로 넣어요. 먼저 넣은 것이 이겨요. */
	private static <T> void putWithHash(Map<String, T> map, String name, T value) {
		String lower = name.toLowerCase(Locale.ROOT);
		map.putIfAbsent(lower, value);
		map.putIfAbsent(hashedName(lower), value);
	}

	/** 이름으로 찾고, 없으면 해시 이름({4b11fb1c})으로 한 번 더 찾아요. */
	public Optional<List<Double>> dataValue(String name) {
		return Optional.ofNullable(lookup(dataValues, name));
	}

	public Optional<JsonNode> calculation(String name) {
		return Optional.ofNullable(lookup(calculations, name));
	}

	private static <T> T lookup(Map<String, T> map, String name) {
		T found = map.get(name.toLowerCase(Locale.ROOT));
		return found != null ? found : map.get(hashedName(name));
	}

	/**
	 * 라이엇 자료는 이름을 모르는 계산식·수치를 소문자 이름의 FNV-1a 32비트 해시로 내보내요(`{4b11fb1c}`).
	 * 문자열 표의 해시(XXH3, {@link StringTableKeys})와는 다른 방식이에요.
	 */
	public static String hashedName(String name) {
		int hash = 0x811c9dc5;
		for (byte b : name.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)) {
			hash ^= (b & 0xff);
			hash *= 0x01000193;
		}
		return String.format("{%08x}", hash);
	}

}
