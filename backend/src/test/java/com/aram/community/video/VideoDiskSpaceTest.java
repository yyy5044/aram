package com.aram.community.video;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.user.User;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;

/** 서버 디스크 여유가 바닥 기준보다 적으면 올리기를 받지 않아요(DB와 같은 디스크라서). */
@TestPropertySource(properties = "app.videos.min-free-bytes=9000000000000000000")
class VideoDiskSpaceTest extends VideoTestSupport {

	@TempDir
	Path dir;

	@Test
	void refusesWhenTheDiskIsNearlyFull() throws Exception {
		User u = testUsers.create("양호");
		mockMvc.perform(multipart("/api/videos").file(new MockMultipartFile("file", "clip.mp4", "video/mp4", sampleBytes(dir)))
			.with(testUsers.as(u)))
			.andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.code").value("VIDEO_NO_SPACE"))
			.andExpect(jsonPath("$.message").value("지금은 영상을 올릴 수 없어요. 관리자에게 알려 주세요"));
	}

}
