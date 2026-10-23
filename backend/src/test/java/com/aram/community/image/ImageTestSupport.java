package com.aram.community.image;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import com.jayway.jsonpath.JsonPath;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mock.web.MockMultipartFile;

abstract class ImageTestSupport extends IntegrationTest {

	/** 1x1 투명 PNG. */
	static final byte[] PNG = Base64.getDecoder()
		.decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");

	@Autowired
	TestUsers testUsers;

	@Value("${app.images.dir}")
	String imagesDir;

	UUID upload(User user) throws Exception {
		String response = mockMvc
			.perform(multipart("/api/images").file(new MockMultipartFile("file", "shot.png", "image/png", PNG))
				.with(testUsers.as(user)))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return UUID.fromString(JsonPath.read(response, "$.id"));
	}

	Path fileOf(UUID imageId) {
		String key = jdbc.queryForObject("select storage_key from images where id = ?", String.class, imageId);
		return Path.of(imagesDir).resolve(key);
	}

	void deleteFileOnDisk(UUID imageId) throws Exception {
		Files.deleteIfExists(fileOf(imageId));
	}

}
