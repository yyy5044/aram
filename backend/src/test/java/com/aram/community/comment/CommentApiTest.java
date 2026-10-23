package com.aram.community.comment;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class CommentApiTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	User author;

	User other;

	long postId;

	@BeforeEach
	void seed() {
		author = testUsers.create("양호");
		other = testUsers.create("민수");
		postId = jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, created_at, updated_at) "
				+ "values (?, '글', '{}'::jsonb, '본문', '26.21', now(), now()) returning id", Long.class, author.getId());
	}

	static String json(String content) {
		return "{\"content\":\"" + content.replace("\n", "\\n") + "\"}";
	}

	ResultActions add(User user, String content) throws Exception {
		return mockMvc.perform(post("/api/posts/" + postId + "/comments").with(testUsers.as(user))
			.contentType(MediaType.APPLICATION_JSON)
			.content(json(content)));
	}

	long addOk(User user, String content) throws Exception {
		return ((Number) JsonPath.read(add(user, content).andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString(), "$.id")).longValue();
	}

	@Test
	void addAndListComments() throws Exception {
		addOk(other, "첫 댓글");
		jdbc.update("update comments set created_at = created_at - interval '1 minute', updated_at = updated_at - interval '1 minute'");
		addOk(author, "두 번째 댓글");

		mockMvc.perform(get("/api/posts/" + postId + "/comments"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0].content").value("첫 댓글"))
			.andExpect(jsonPath("$[0].author.nickname").value("민수"))
			.andExpect(jsonPath("$[1].content").value("두 번째 댓글"))
			.andExpect(jsonPath("$[0].edited").value(false));
		mockMvc.perform(get("/api/posts/" + postId)).andExpect(jsonPath("$.commentCount").value(2));
	}

	@Test
	void keepsLineBreaksAndTrims() throws Exception {
		add(author, "  첫 줄\n둘째 줄  ").andExpect(status().isCreated())
			.andExpect(jsonPath("$.content").value("첫 줄\n둘째 줄"));
	}

	@Test
	void blankCommentRejected() throws Exception {
		add(author, "   ").andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.content").value("댓글을 입력해주세요"));
	}

	@Test
	void tooLongCommentRejected() throws Exception {
		add(author, "가".repeat(1001)).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.content").value("댓글은 1,000자 이하로 써주세요"));
	}

	@Test
	void anonymousCannotComment() throws Exception {
		mockMvc.perform(post("/api/posts/" + postId + "/comments")
			.with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(json("안녕"))).andExpect(status().isUnauthorized());
	}

	@Test
	void onlyAuthorEdits() throws Exception {
		long id = addOk(author, "원래 댓글");
		jdbc.update("update comments set created_at = created_at - interval '1 minute', updated_at = updated_at - interval '1 minute'");

		mockMvc.perform(put("/api/comments/" + id).with(testUsers.as(other))
			.contentType(MediaType.APPLICATION_JSON)
			.content(json("남이 수정"))).andExpect(status().isForbidden());
		mockMvc.perform(put("/api/comments/" + id).with(testUsers.as(testUsers.createAdmin("관리자")))
			.contentType(MediaType.APPLICATION_JSON)
			.content(json("관리자 수정"))).andExpect(status().isForbidden());
		mockMvc.perform(put("/api/comments/" + id).with(testUsers.as(author))
			.contentType(MediaType.APPLICATION_JSON)
			.content(json("고친 댓글")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.content").value("고친 댓글"))
			.andExpect(jsonPath("$.edited").value(true));
	}

	@Test
	void authorOrAdminDeletes() throws Exception {
		long first = addOk(author, "하나");
		long second = addOk(author, "둘");

		mockMvc.perform(delete("/api/comments/" + first).with(testUsers.as(other))).andExpect(status().isForbidden());
		mockMvc.perform(delete("/api/comments/" + first).with(testUsers.as(testUsers.createAdmin("관리자"))))
			.andExpect(status().isNoContent());
		mockMvc.perform(delete("/api/comments/" + second).with(testUsers.as(author))).andExpect(status().isNoContent());

		mockMvc.perform(get("/api/posts/" + postId)).andExpect(jsonPath("$.commentCount").value(0));
	}

	@Test
	void missingCommentIs404() throws Exception {
		mockMvc.perform(delete("/api/comments/9999").with(testUsers.as(author)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("COMMENT_NOT_FOUND"));
	}

	@Test
	void commentsOnMissingPost404() throws Exception {
		mockMvc.perform(get("/api/posts/9999/comments"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
		mockMvc.perform(post("/api/posts/9999/comments").with(testUsers.as(author))
			.contentType(MediaType.APPLICATION_JSON)
			.content(json("안녕"))).andExpect(status().isNotFound());
	}

	@Test
	void deletingPostDeletesComments() throws Exception {
		addOk(other, "곧 사라질 댓글");
		mockMvc.perform(delete("/api/posts/" + postId).with(testUsers.as(author))).andExpect(status().isNoContent());
		org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject("select count(*) from comments", Integer.class))
			.isZero();
	}

}
