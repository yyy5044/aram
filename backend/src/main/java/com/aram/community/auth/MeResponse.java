package com.aram.community.auth;

import com.aram.community.user.User;
import java.util.UUID;

/**
 * 현재 사용자. avatarUrl은 보여줄 사진, discordAvatarUrl은 프로필 수정에서 "디스코드 사진으로 되돌리기" 미리보기용,
 * suggestedNickname은 닉네임 설정 화면의 기본값이에요.
 */
public record MeResponse(long id, String nickname, String avatarUrl, boolean admin, String suggestedNickname,
		boolean profilePublic, UUID profileImageId, String discordAvatarUrl) {

	public static MeResponse of(User user, AppUserPrincipal principal) {
		return new MeResponse(user.getId(), user.getNickname(), user.effectiveAvatarUrl(), user.isAdmin(),
				principal.discordDefaultName(), user.isProfilePublic(), user.getProfileImageId(), user.getAvatarUrl());
	}

}
