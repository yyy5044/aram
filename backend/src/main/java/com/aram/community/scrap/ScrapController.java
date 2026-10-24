package com.aram.community.scrap;

import com.aram.community.auth.AppUserPrincipal;
import com.aram.community.auth.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts/{postId}/scrap")
public class ScrapController {

	private final ScrapService scrapService;

	private final CurrentUser currentUser;

	public ScrapController(ScrapService scrapService, CurrentUser currentUser) {
		this.scrapService = scrapService;
		this.currentUser = currentUser;
	}

	@PutMapping
	public ScrapService.ScrapState scrap(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable long postId) {
		return scrapService.scrap(postId, currentUser.requireWithNickname(principal).getId());
	}

	@DeleteMapping
	public ScrapService.ScrapState unscrap(@AuthenticationPrincipal AppUserPrincipal principal,
			@PathVariable long postId) {
		return scrapService.unscrap(postId, currentUser.requireWithNickname(principal).getId());
	}

}
