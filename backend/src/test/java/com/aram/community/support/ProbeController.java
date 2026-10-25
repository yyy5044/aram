package com.aram.community.support;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** 테스트 전용: 공통 오류 처리와 보안 규칙을 확인하기 위한 엔드포인트. */
@RestController
class ProbeController {

	record Echo(@NotBlank(message = "제목을 입력해주세요") String title) {
	}

	@GetMapping("/api/probe/not-found")
	void notFound() {
		throw new ApiException(ErrorCode.POST_NOT_FOUND);
	}

	@PostMapping("/api/probe/echo")
	Echo echo(@Valid @RequestBody Echo echo) {
		return echo;
	}

	@PostMapping("/api/probe/upload")
	long upload(@RequestParam("file") MultipartFile file) {
		return file.getSize();
	}

	@GetMapping("/api/probe/boom")
	void boom() {
		throw new IllegalStateException("boom");
	}

}
