package com.aram.community.auth;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.user.User;
import com.aram.community.user.UserRepository;
import org.springframework.stereotype.Component;

/** 컨트롤러에서 로그인 사용자를 DB에서 꺼내고, 로그인·닉네임 요구 조건을 검사해요. */
@Component
public class CurrentUser {

	private final UserRepository users;

	public CurrentUser(UserRepository users) {
		this.users = users;
	}

	public User require(AppUserPrincipal principal) {
		if (principal == null) {
			throw new ApiException(ErrorCode.UNAUTHORIZED);
		}
		return users.findById(principal.userId()).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
	}

	public User requireWithNickname(AppUserPrincipal principal) {
		User user = require(principal);
		if (user.getNickname() == null) {
			throw new ApiException(ErrorCode.NICKNAME_REQUIRED);
		}
		return user;
	}

}
