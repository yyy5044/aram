package com.aram.community.video;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.user.User;
import com.jayway.jsonpath.JsonPath;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mock.web.MockMultipartFile;

class VideoApiTest extends VideoTestSupport {

	@TempDir
	Path dir;

	@Autowired
	VideoService videoService;

	@Value("${app.videos.tmp-dir}")
	Path tmpDir;

	@Test
	void uploadConvertsAndServes() throws Exception {
		User u = testUsers.create("양호");
		UUID id = upload(u, sampleBytes(dir));

		String ready = awaitStatus(u, id, "READY");
		assertThat((Integer) JsonPath.read(ready, "$.progress")).isEqualTo(100);
		assertThat((String) JsonPath.read(ready, "$.url")).isEqualTo("/api/videos/" + id);
		assertThat((String) JsonPath.read(ready, "$.posterUrl")).isEqualTo("/api/videos/" + id + "/poster");
		assertThat((Integer) JsonPath.read(ready, "$.width")).isEqualTo(320);

		mockMvc.perform(get("/api/videos/" + id))
			.andExpect(status().isOk())
			.andExpect(header().string("Content-Type", "video/mp4"))
			.andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("immutable")));
		byte[] part = mockMvc.perform(get("/api/videos/" + id).header("Range", "bytes=0-99"))
			.andExpect(status().isPartialContent())
			.andExpect(header().string("Content-Range", org.hamcrest.Matchers.startsWith("bytes 0-99/")))
			.andReturn()
			.getResponse()
			.getContentAsByteArray();
		assertThat(part).hasSize(100);
		mockMvc.perform(get("/api/videos/" + id + "/poster"))
			.andExpect(status().isOk())
			.andExpect(header().string("Content-Type", "image/jpeg"));
		assertThat(Files.exists(tmpDir.resolve(id + ".src"))).isFalse();
	}

	@Test
	void rejectsNonVideo() throws Exception {
		User u = testUsers.create("양호");
		mockMvc
			.perform(multipart("/api/videos")
				.file(new MockMultipartFile("file", "a.png", "image/png", new byte[] { (byte) 0x89, 'P', 'N', 'G', 0, 0, 0, 0 }))
				.with(testUsers.as(u)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VIDEO_UNSUPPORTED"))
			.andExpect(jsonPath("$.message").value("영상 파일만 넣을 수 있어요"));
	}

	@Test
	void rejectsOverLimit() throws Exception {
		User u = testUsers.create("양호");
		byte[] big = new byte[1024 * 1024 + 1];
		byte[] header = { 0, 0, 0, 0x18, 'f', 't', 'y', 'p' };
		System.arraycopy(header, 0, big, 0, header.length);
		mockMvc.perform(multipart("/api/videos").file(new MockMultipartFile("file", "big.mp4", "video/mp4", big))
			.with(testUsers.as(u)))
			.andExpect(status().isPayloadTooLarge())
			.andExpect(jsonPath("$.code").value("VIDEO_TOO_LARGE"))
			.andExpect(jsonPath("$.message").value("영상 파일은 200MB까지 올릴 수 있어요"));
	}

	@Test
	void statusIsPrivate() throws Exception {
		User owner = testUsers.create("양호");
		User other = testUsers.create("민수");
		UUID id = UUID.randomUUID();
		videos.save(Video.queued(id, owner.getId(), Instant.now()));

		mockMvc.perform(get("/api/videos/" + id + "/status").with(testUsers.as(other)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("VIDEO_NOT_FOUND"));
	}

	@Test
	void notReadyIsNotServed() throws Exception {
		User owner = testUsers.create("양호");
		UUID id = UUID.randomUUID();
		videos.save(Video.queued(id, owner.getId(), Instant.now()));

		mockMvc.perform(get("/api/videos/" + id)).andExpect(status().isNotFound());
		mockMvc.perform(get("/api/videos/" + id + "/poster")).andExpect(status().isNotFound());
	}

	@Test
	void restartFailsInterruptedJobs() {
		User owner = testUsers.create("양호");
		UUID id = UUID.randomUUID();
		Video v = Video.queued(id, owner.getId(), Instant.now());
		v.markProcessing();
		videos.save(v);

		videoService.failInterrupted();

		Video after = videos.findById(id).orElseThrow();
		assertThat(after.getStatus()).isEqualTo(VideoStatus.FAILED);
		assertThat(after.getErrorMessage()).isEqualTo("서버가 다시 켜져서 변환이 멈췄어요. 다시 올려 주세요");
	}

	@Test
	void nicknameRequired() throws Exception {
		User u = testUsers.createWithoutNickname();
		mockMvc.perform(multipart("/api/videos").file(new MockMultipartFile("file", "clip.mp4", "video/mp4", new byte[16]))
			.with(testUsers.as(u)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("NICKNAME_REQUIRED"));
	}

}
