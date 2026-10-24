package com.aram.community.gamedata;

public record AugmentTextDto(String locale, String name, String description) {

	static AugmentTextDto from(AugmentText text) {
		return new AugmentTextDto(text.getId().locale(), text.getName(), text.getDescription());
	}

}
