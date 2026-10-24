package com.aram.community.gamedata;

/** 증강 카드용 상세. original은 항상 영어, translation은 요청한 언어(원문과 같거나 없으면 null). */
public record AugmentDetailDto(String id, AugmentRarity rarity, String iconUrl, AugmentTextDto original,
		AugmentTextDto translation) {

}
