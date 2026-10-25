package com.aram.community.common;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class ErrorHandlingTest extends IntegrationTest {

	@Test
	void apiExceptionBecomesErrorResponse() throws Exception {
		mockMvc.perform(get("/api/probe/not-found"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("POST_NOT_FOUND"))
			.andExpect(jsonPath("$.message").value("글을 찾을 수 없어요"))
			.andExpect(jsonPath("$.fieldErrors").doesNotExist());
	}

	@Test
	void unauthenticatedWriteIs401Json() throws Exception {
		mockMvc.perform(post("/api/probe/echo").with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"a\"}"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
	}

	@Test
	void missingCsrfIs403() throws Exception {
		mockMvc.perform(post("/api/probe/echo").with(user("u"))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"a\"}"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("CSRF_INVALID"))
			.andExpect(jsonPath("$.message").value("화면이 오래 열려 있었어요. 새로고침한 뒤 다시 시도해주세요"));
	}

	@Test
	void unsupportedMethodIs405() throws Exception {
		mockMvc.perform(put("/api/probe/not-found").with(user("u")).with(csrf()))
			.andExpect(status().isMethodNotAllowed())
			.andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
	}

	@Test
	void uploadWithoutFilePartIs400() throws Exception {
		mockMvc.perform(multipart("/api/probe/upload").with(user("u")).with(csrf()))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_INPUT"));
	}

	@Test
	void uploadThatIsNotMultipartIs400() throws Exception {
		mockMvc.perform(post("/api/probe/upload").with(user("u")).with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_INPUT"));
	}

	@Test
	void failedDiscordLoginGoesBackToTheSiteWithAnErrorFlag() throws Exception {
		mockMvc.perform(get("/login/oauth2/code/discord").param("error", "access_denied").param("state", "x"))
			.andExpect(redirectedUrl("/auth/done?error"));
	}

	@Test
	void validationErrorsListFields() throws Exception {
		mockMvc.perform(post("/api/probe/echo").with(user("u")).with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\" \"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_INPUT"))
			.andExpect(jsonPath("$.fieldErrors.title").value("제목을 입력해주세요"));
	}

	@Test
	void unexpectedErrorIs500WithoutDetails() throws Exception {
		mockMvc.perform(get("/api/probe/boom"))
			.andExpect(status().isInternalServerError())
			.andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
			.andExpect(jsonPath("$.message").value("잠시 후 다시 시도해주세요"));
	}

	@Test
	void statusEndpointStillPublic() throws Exception {
		mockMvc.perform(get("/api/status")).andExpect(status().isOk());
	}

}
