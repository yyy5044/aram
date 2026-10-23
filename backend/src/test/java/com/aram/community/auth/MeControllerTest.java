package com.aram.community.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class MeControllerTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	@Test
	void anonymousMeIsNull() throws Exception {
		mockMvc.perform(get("/api/me")).andExpect(status().isOk()).andExpect(content().string(""));
	}

	@Test
	void loggedInMeReturnsProfile() throws Exception {
		User u = testUsers.create("양호");
		mockMvc.perform(get("/api/me").with(testUsers.as(u)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(u.getId()))
			.andExpect(jsonPath("$.nickname").value("양호"))
			.andExpect(jsonPath("$.admin").value(false));
	}

	@Test
	void setsNicknameTrimmed() throws Exception {
		User u = testUsers.createWithoutNickname();
		putNickname(u, "  양호_1 ").andExpect(status().isOk()).andExpect(jsonPath("$.nickname").value("양호_1"));
	}

	@ParameterizedTest
	@ValueSource(strings = { "   ", "a", "열세글자이상의닉네임입니다", "양 호", "😀😀" })
	void rejectsBlankOrInvalidNickname(String nickname) throws Exception {
		User u = testUsers.createWithoutNickname();
		putNickname(u, nickname).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_INPUT"))
			.andExpect(jsonPath("$.fieldErrors.nickname").exists());
	}

	@Test
	void rejectsDuplicateIgnoringCase() throws Exception {
		testUsers.create("Yangho");
		User other = testUsers.createWithoutNickname();
		putNickname(other, "yangho").andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("NICKNAME_TAKEN"));
	}

	@Test
	void keepingOwnNicknameIsAllowed() throws Exception {
		User u = testUsers.create("양호");
		putNickname(u, "양호").andExpect(status().isOk());
	}

	@Test
	void anonymousCannotSetNickname() throws Exception {
		mockMvc.perform(put("/api/me/nickname").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"nickname\":\"양호\"}"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void logoutReturns204() throws Exception {
		User u = testUsers.create("양호");
		mockMvc.perform(post("/api/logout").with(testUsers.as(u))).andExpect(status().isNoContent());
	}

	private ResultActions putNickname(User u, String nickname) throws Exception {
		return mockMvc.perform(put("/api/me/nickname").with(testUsers.as(u))
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"nickname\":\"" + nickname + "\"}"));
	}

}
