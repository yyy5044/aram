package com.aram.community.video;

import com.aram.community.auth.AppUserPrincipal;
import com.aram.community.auth.CurrentUser;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/videos")
public class VideoController {

	private static final CacheControl FOREVER = CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable();

	private final VideoService videoService;

	private final CurrentUser currentUser;

	public VideoController(VideoService videoService, CurrentUser currentUser) {
		this.videoService = videoService;
		this.currentUser = currentUser;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public VideoStatusResponse upload(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestParam("file") MultipartFile file) {
		return videoService.upload(currentUser.requireWithNickname(principal), file);
	}

	@GetMapping("/{id}/status")
	public VideoStatusResponse status(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id) {
		return videoService.status(id, currentUser.require(principal).getId());
	}

	/** 클립. Resource로 돌려주면 Spring이 Range 요청(iPhone 재생에 필요)을 206으로 처리해요. */
	@GetMapping("/{id}")
	public ResponseEntity<Resource> video(@PathVariable UUID id) {
		return ResponseEntity.ok()
			.contentType(MediaType.parseMediaType("video/mp4"))
			.cacheControl(FOREVER)
			.body(new FileSystemResource(videoService.servedFile(id)));
	}

	@GetMapping("/{id}/poster")
	public ResponseEntity<Resource> poster(@PathVariable UUID id) {
		return ResponseEntity.ok()
			.contentType(MediaType.IMAGE_JPEG)
			.cacheControl(FOREVER)
			.body(new FileSystemResource(videoService.posterFile(id)));
	}

}
