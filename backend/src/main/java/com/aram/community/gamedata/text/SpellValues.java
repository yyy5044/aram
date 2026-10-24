package com.aram.community.gamedata.text;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import tools.jackson.databind.JsonNode;

/** 증강의 스펠 항목들에서 모은 수치(DataValues)와 계산식(mSpellCalculations). 같은 이름은 먼저 온 항목이 이겨요. */
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
				dataValues.putIfAbsent(name, list);
			}
			spell.path("mSpellCalculations")
				.properties()
				.forEach(e -> calculations.putIfAbsent(e.getKey().toLowerCase(Locale.ROOT), e.getValue()));
		}
		return new SpellValues(dataValues, calculations);
	}

	public Optional<List<Double>> dataValue(String name) {
		return Optional.ofNullable(dataValues.get(name.toLowerCase(Locale.ROOT)));
	}

	public Optional<JsonNode> calculation(String name) {
		return Optional.ofNullable(calculations.get(name.toLowerCase(Locale.ROOT)));
	}

}
