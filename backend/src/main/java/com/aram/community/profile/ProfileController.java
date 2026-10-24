package com.aram.community.profile;

import com.aram.community.auth.AppUserPrincipal;
import com.aram.community.auth.CurrentUser;
import com.aram.community.auth.MeResponse;
import com.aram.community.common.PageResponse;
import com.aram.community.post.PostListItem;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
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

	@GetMapping("/api/users/{userId}/profile")
	public ProfileResponse profile(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable long userId) {
		return profileService.get(userId, viewerId(principal));
	}

	@GetMapping("/api/users/{userId}/posts")
	public PageResponse<PostListItem> posts(@AuthenticationPrincipal AppUserPrincipal principal,
			@PathVariable long userId, @RequestParam(defaultValue = "1") int page) {
		return profileService.posts(userId, viewerId(principal), page);
	}

	@GetMapping("/api/users/{userId}/comments")
	public PageResponse<MyCommentItem> comments(@AuthenticationPrincipal AppUserPrincipal principal,
			@PathVariable long userId, @RequestParam(defaultValue = "1") int page) {
		return profileService.comments(userId, viewerId(principal), page);
	}

	@GetMapping("/api/users/{userId}/scraps")
	public PageResponse<PostListItem> scraps(@AuthenticationPrincipal AppUserPrincipal principal,
			@PathVariable long userId, @RequestParam(defaultValue = "1") int page) {
		return profileService.scraps(userId, viewerId(principal), page);
	}

	private static Long viewerId(AppUserPrincipal principal) {
		return principal == null ? null : principal.userId();
	}

}
