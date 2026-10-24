package com.aram.community.profile;

import com.aram.community.auth.AppUserPrincipal;
import com.aram.community.auth.CurrentUser;
import com.aram.community.auth.MeResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProfileController {

	private final ProfileService profileService;

	private final CurrentUser currentUser;

	public ProfileController(ProfileService profileService, CurrentUser currentUser) {
		this.profileService = profileService;
		this.currentUser = currentUser;
	}

	@PutMapping("/api/me/profile")
	public MeResponse update(@AuthenticationPrincipal AppUserPrincipal principal,
			@Valid @RequestBody ProfileUpdateRequest request) {
		return MeResponse.of(profileService.update(currentUser.require(principal), request), principal);
	}

}
