package com.aram.community.gamedata;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.JsonNode;

/** 증강 등급. kiwi.bin.json의 rarity 값: 없음·0 → 실버, 1 → 골드, 2 → 프리즘. */
public enum AugmentRarity {

	PRISMATIC, GOLD, SILVER;

	private static final Logger log = LoggerFactory.getLogger(AugmentRarity.class);

	public static AugmentRarity fromKiwi(JsonNode augmentData) {
		int value = augmentData.path("rarity").asInt(0);
		return switch (value) {
			case 0 -> SILVER;
			case 1 -> GOLD;
			case 2 -> PRISMATIC;
			default -> {
				log.warn("Unknown augment rarity {} for {}; treating as SILVER", value,
						augmentData.path("AugmentNameId").asString(""));
				yield SILVER;
			}
		};
	}

}
