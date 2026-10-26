package com.aram.community.gamedata;

import java.util.List;

/** 아이템 목록용. id·fromIds·intoIds는 문자열이에요(주소·본문 박스와 같은 모양). iconUrl은 Data Dragon 버전을 모르면 null. */
public record ItemDto(String id, String nameKo, ItemTier tier, int priceTotal, String iconUrl, List<String> fromIds,
		List<String> intoIds, boolean active, List<String> categories) {

}
