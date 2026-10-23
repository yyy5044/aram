package com.aram.community.auth;

import com.aram.community.user.User;

/** 현재 사용자. suggestedNickname은 닉네임 설정 화면의 기본값이에요. */
public record MeResponse(long id, String nickname, String avatarUrl, boolean admin, String suggestedNickname) {

	public static MeResponse of(User user, AppUserPrincipal principal) {
		return new MeResponse(user.getId(), user.getNickname(), user.getAvatarUrl(), user.isAdmin(),
				principal.discordDefaultName());
	}

}
