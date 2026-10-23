package com.aram.community.auth;

import com.aram.community.user.User;
import com.aram.community.user.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
public class MeController {

	record NicknameRequest(String nickname) {
	}

	private final CurrentUser currentUser;

	private final UserService userService;

	public MeController(CurrentUser currentUser, UserService userService) {
		this.currentUser = currentUser;
		this.userService = userService;
	}

	@GetMapping
	public MeResponse me(@AuthenticationPrincipal AppUserPrincipal principal) {
		if (principal == null) {
			return null;
		}
		return MeResponse.of(currentUser.require(principal), principal);
	}

	@PutMapping("/nickname")
	public MeResponse changeNickname(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestBody NicknameRequest request) {
		User user = currentUser.require(principal);
		return MeResponse.of(userService.changeNickname(user.getId(), request.nickname()), principal);
	}

}
