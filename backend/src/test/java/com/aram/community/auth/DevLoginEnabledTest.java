package com.aram.community.auth;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;

@TestPropertySource(properties = "app.dev-login.enabled=true")
class DevLoginEnabledTest extends IntegrationTest {

	@Test
	void devLoginCreatesSession() throws Exception {
		MvcResult result = mockMvc
			.perform(post("/api/dev/login").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"discordId\":\"dev-1\",\"nickname\":\"테스터\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nickname").value("테스터"))
			.andReturn();
		// 로그인 정보는 DB에 있고, 다음 요청은 SESSION 쿠키로 찾아요.
		Cookie session = result.getResponse().getCookie("SESSION");

		mockMvc.perform(get("/api/me").cookie(session))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nickname").value("테스터"));
	}

}
