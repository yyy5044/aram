package com.aram.community.image;

import com.aram.community.auth.AppUserPrincipal;
import com.aram.community.auth.CurrentUser;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.core.io.InputStreamResource;
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
@RequestMapping("/api/images")
public class ImageController {

	private final ImageService imageService;

	private final CurrentUser currentUser;

	public ImageController(ImageService imageService, CurrentUser currentUser) {
		this.imageService = imageService;
		this.currentUser = currentUser;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ImageService.Uploaded upload(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestParam("file") MultipartFile file) {
		return imageService.upload(currentUser.requireWithNickname(principal), file);
	}

	@GetMapping("/{id}")
	public ResponseEntity<InputStreamResource> get(@PathVariable UUID id) {
		ImageService.Served served = imageService.open(id);
		return ResponseEntity.ok()
			.contentType(MediaType.parseMediaType(served.contentType()))
			.cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
			.body(new InputStreamResource(served.data()));
	}

}
