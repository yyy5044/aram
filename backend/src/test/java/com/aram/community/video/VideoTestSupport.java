package com.aram.community.video;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.SampleVideos;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import com.jayway.jsonpath.JsonPath;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;

abstract class VideoTestSupport extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	@Autowired
	VideoRepository videos;

	static byte[] sampleBytes(Path dir) throws Exception {
		return Files.readAllBytes(SampleVideos.make(dir, 320, 240, 24, 2, false));
	}

	UUID upload(User user, byte[] bytes) throws Exception {
		String response = mockMvc
			.perform(multipart("/api/videos").file(new MockMultipartFile("file", "clip.mp4", "video/mp4", bytes))
				.with(testUsers.as(user)))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return UUID.fromString(JsonPath.read(response, "$.id"));
	}

	/** 상태가 원하는 값이 될 때까지 기다려요(최대 30초). 마지막 응답 JSON을 돌려줘요. */
	String awaitStatus(User user, UUID id, String wanted) throws Exception {
		String last = "";
		for (int i = 0; i < 300; i++) {
			last = mockMvc.perform(get("/api/videos/" + id + "/status").with(testUsers.as(user)))
				.andReturn()
				.getResponse()
				.getContentAsString();
			if (wanted.equals(JsonPath.read(last, "$.status"))) {
				return last;
			}
			Thread.sleep(100);
		}
		throw new AssertionError("status never became " + wanted + ": " + last);
	}

}
