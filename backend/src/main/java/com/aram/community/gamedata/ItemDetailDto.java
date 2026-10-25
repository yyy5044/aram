package com.aram.community.gamedata;

import java.util.List;

/** 아이템 상자용 상세. original은 항상 영어, translation은 요청한 언어(원문과 같거나 없으면 null). */
public record ItemDetailDto(String id, ItemTier tier, int priceTotal, String iconUrl, List<String> fromIds,
		List<String> intoIds, AugmentTextDto original, AugmentTextDto translation) {

}
