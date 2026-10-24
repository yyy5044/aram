package com.aram.community.post;

import com.aram.community.user.User;

public record AuthorDto(long id, String nickname, String avatarUrl) {

	public static AuthorDto of(User user) {
		return new AuthorDto(user.getId(), user.getNickname(), user.effectiveAvatarUrl());
	}

}
