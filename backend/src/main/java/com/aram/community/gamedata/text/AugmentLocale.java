package com.aram.community.gamedata.text;

import java.util.Map;
import java.util.Optional;

/** 설명을 만드는 언어. 코드(en, ko)와 CommunityDragon 폴더 이름, 언어별 문구를 가져요. */
public enum AugmentLocale {

	EN("en", "en_us", "default", "[Ability]",
			Map.of(0, "AP", 1, "Armor", 2, "AD", 6, "Magic Resist", 7, "Move Speed", 11, "Ability Haste", 12, "max Health"),
			"bonus ", "total "),
	KO("ko", "ko_kr", "ko_kr", "[스킬]",
			Map.of(0, "주문력", 1, "방어력", 2, "공격력", 6, "마법 저항력", 7, "이동 속도", 11, "스킬 가속", 12, "최대 체력"),
			"추가 ", "전체 ");

	private final String code;

	private final String folder;

	/** 클라이언트 자료(plugins/rcp-be-lol-game-data/global/…)의 언어 폴더. 영어는 default예요. */
	private final String clientFolder;

	private final String spellPlaceholder;

	private final Map<Integer, String> statNames;

	private final String bonusPrefix;

	private final String totalPrefix;

	AugmentLocale(String code, String folder, String clientFolder, String spellPlaceholder,
			Map<Integer, String> statNames, String bonusPrefix, String totalPrefix) {
		this.code = code;
		this.folder = folder;
		this.clientFolder = clientFolder;
		this.spellPlaceholder = spellPlaceholder;
		this.statNames = statNames;
		this.bonusPrefix = bonusPrefix;
		this.totalPrefix = totalPrefix;
	}

	public static Optional<AugmentLocale> fromCode(String code) {
		for (AugmentLocale locale : values()) {
			if (locale.code.equals(code)) {
				return Optional.of(locale);
			}
		}
		return Optional.empty();
	}

	public String code() {
		return code;
	}

	public String folder() {
		return folder;
	}

	public String clientFolder() {
		return clientFolder;
	}

	/** 챔피언마다 다른 스킬 이름({{SpellName}}) 자리에 넣는 글. */
	public String spellPlaceholder() {
		return spellPlaceholder;
	}

	/** 스탯 번호의 이름. 확인된 번호만 있고, 모르는 번호는 비어 있어요. */
	public Optional<String> statName(int stat) {
		return Optional.ofNullable(statNames.get(stat));
	}

	/** `mStatFormula` 0 기본, 1 추가, 2 전체. */
	public String statPrefix(int formula) {
		return switch (formula) {
			case 1 -> bonusPrefix;
			case 2 -> totalPrefix;
			default -> "";
		};
	}

	/** 스탯 계수 글. 예: 한국어 "(+최대 체력의 4%)", 영어 "(+4% max Health)". */
	public String statScaling(String percent, String statLabel) {
		return this == KO ? "(+" + statLabel + "의 " + percent + "%)" : "(+" + percent + "% " + statLabel + ")";
	}

}
