package com.aram.community.image;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.user.User;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ImageApiTest extends ImageTestSupport {

	@Test
	void uploadAndServe() throws Exception {
		User u = testUsers.create("양호");
		String response = mockMvc
			.perform(multipart("/api/images").file(new MockMultipartFile("file", "shot.png", "image/png", PNG))
				.with(testUsers.as(u)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.id").exists())
			.andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.startsWith("/api/images/")))
			.andReturn()
			.getResponse()
			.getContentAsString();
		String url = com.jayway.jsonpath.JsonPath.read(response, "$.url");

		mockMvc.perform(get(url))
			.andExpect(status().isOk())
			.andExpect(header().string("Content-Type", "image/png"))
			.andExpect(header().string("Cache-Control", containsString("immutable")))
			.andExpect(content().bytes(PNG));
	}

	@Test
	void rejectsNonImageEvenWithImageName() throws Exception {
		User u = testUsers.create("양호");
		mockMvc
			.perform(multipart("/api/images")
				.file(new MockMultipartFile("file", "fake.png", "image/png",
						"this is not an image".getBytes(StandardCharsets.UTF_8)))
				.with(testUsers.as(u)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("UNSUPPORTED_IMAGE"));
	}

	@Test
	void rejectsOversized() throws Exception {
		User u = testUsers.create("양호");
		byte[] big = new byte[10 * 1024 * 1024 + 1];
		System.arraycopy(PNG, 0, big, 0, PNG.length);
		mockMvc
			.perform(multipart("/api/images").file(new MockMultipartFile("file", "big.png", "image/png", big))
				.with(testUsers.as(u)))
			.andExpect(status().isPayloadTooLarge())
			.andExpect(jsonPath("$.code").value("IMAGE_TOO_LARGE"));
	}

	@Test
	void anonymousCannotUpload() throws Exception {
		mockMvc
			.perform(multipart("/api/images").file(new MockMultipartFile("file", "shot.png", "image/png", PNG))
				.with(csrf()))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void missingFileIs404() throws Exception {
		UUID id = upload(testUsers.create("양호"));
		deleteFileOnDisk(id);

		mockMvc.perform(get("/api/images/" + id))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("IMAGE_NOT_FOUND"));
	}

	@Test
	void unknownImageIs404() throws Exception {
		mockMvc.perform(get("/api/images/" + UUID.randomUUID())).andExpect(status().isNotFound());
	}

}
