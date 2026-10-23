package com.aram.community.auth;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class DevLoginControllerTest extends IntegrationTest {

	@Test
	void devLoginIsNotRegisteredByDefault() throws Exception {
		mockMvc.perform(post("/api/dev/login").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"discordId\":\"dev-1\",\"nickname\":\"테스터\"}"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("NOT_FOUND"));
	}

}
