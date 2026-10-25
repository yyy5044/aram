package com.aram.community.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/** Spring이 multipart 한도에서 먼저 막을 때도 경로에 맞는 문구가 나와야 해요. */
class UploadSizeErrorTest {

	private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

	@Test
	void videoUploadsSayVideoLimit() {
		MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/videos");
		assertThat(handler.handleTooLarge(new MaxUploadSizeExceededException(1), req).getBody().code())
			.isEqualTo("VIDEO_TOO_LARGE");
	}

	@Test
	void imageUploadsKeepImageLimit() {
		MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/images");
		assertThat(handler.handleTooLarge(new MaxUploadSizeExceededException(1), req).getBody().code())
			.isEqualTo("IMAGE_TOO_LARGE");
	}

}
