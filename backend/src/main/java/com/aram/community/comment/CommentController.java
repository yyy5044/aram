package com.aram.community.comment;

import com.aram.community.auth.AppUserPrincipal;
import com.aram.community.auth.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CommentController {

	private final CommentService commentService;

	private final CurrentUser currentUser;

	public CommentController(CommentService commentService, CurrentUser currentUser) {
		this.commentService = commentService;
		this.currentUser = currentUser;
	}

	@GetMapping("/api/posts/{postId}/comments")
	public List<CommentResponse> list(@PathVariable long postId) {
		return commentService.list(postId);
	}

	@PostMapping("/api/posts/{postId}/comments")
	@ResponseStatus(HttpStatus.CREATED)
	public CommentResponse create(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable long postId,
			@Valid @RequestBody CommentRequest request) {
		return commentService.create(currentUser.requireWithNickname(principal), postId, request);
	}

	@PutMapping("/api/comments/{commentId}")
	public CommentResponse update(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable long commentId,
			@Valid @RequestBody CommentRequest request) {
		return commentService.update(currentUser.requireWithNickname(principal), commentId, request);
	}

	@DeleteMapping("/api/comments/{commentId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable long commentId) {
		commentService.delete(currentUser.requireWithNickname(principal), commentId);
	}

}
