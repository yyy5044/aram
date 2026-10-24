package com.aram.community.gamedata;

/** iconUrl은 등급 색이 들어 있는 큰 아이콘. 그 파일이 없으면 흰 작은 아이콘이고 iconTinted가 true예요(화면이 등급 색을 입혀요). */
public record AugmentDto(String id, String nameKo, String iconUrl, boolean iconTinted, boolean active,
		AugmentRarity rarity) {

}
