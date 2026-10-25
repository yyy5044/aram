package com.aram.community.post;

import com.aram.community.auth.AppUserPrincipal;
import com.aram.community.auth.CurrentUser;
import com.aram.community.common.PageResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/posts")
public class PostController {

	private final PostService postService;

	private final PostListService postListService;

	private final CurrentUser currentUser;

	public PostController(PostService postService, PostListService postListService, CurrentUser currentUser) {
		this.postListService = postListService;
		this.postService = postService;
		this.currentUser = currentUser;
	}

	@GetMapping
	public PageResponse<PostListItem> list(@RequestParam(defaultValue = "latest") String sort,
			@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int size,
			@RequestParam(required = false) String champion, @RequestParam(required = false) String augment,
			@RequestParam(required = false) String item) {
		return postListService.list(sort, page, size, champion, augment, item);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public Map<String, Long> create(@AuthenticationPrincipal AppUserPrincipal principal,
			@Valid @RequestBody PostRequest request) {
		long id = postService.create(currentUser.requireWithNickname(principal), request);
		return Map.of("id", id);
	}

	@GetMapping("/{postId}")
	public PostDetailResponse get(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable long postId) {
		return postService.get(postId, principal == null ? null : principal.userId());
	}

	@PutMapping("/{postId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void update(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable long postId,
			@Valid @RequestBody PostRequest request) {
		postService.update(currentUser.requireWithNickname(principal), postId, request);
	}

	@DeleteMapping("/{postId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable long postId) {
		postService.delete(currentUser.requireWithNickname(principal), postId);
	}

}
