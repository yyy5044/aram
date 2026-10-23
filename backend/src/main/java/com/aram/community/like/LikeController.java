package com.aram.community.like;

import com.aram.community.auth.AppUserPrincipal;
import com.aram.community.auth.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts/{postId}/like")
public class LikeController {

	private final LikeService likeService;

	private final CurrentUser currentUser;

	public LikeController(LikeService likeService, CurrentUser currentUser) {
		this.likeService = likeService;
		this.currentUser = currentUser;
	}

	@PutMapping
	public LikeService.LikeState like(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable long postId) {
		return likeService.like(postId, currentUser.requireWithNickname(principal).getId());
	}

	@DeleteMapping
	public LikeService.LikeState unlike(@AuthenticationPrincipal AppUserPrincipal principal,
			@PathVariable long postId) {
		return likeService.unlike(postId, currentUser.requireWithNickname(principal).getId());
	}

}
