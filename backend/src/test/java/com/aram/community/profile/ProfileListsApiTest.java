package com.aram.community.profile;

import static com.aram.community.profile.ProfileFixtures.KST;
import static com.aram.community.profile.ProfileFixtures.kst;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ProfileListsApiTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	ProfileFixtures data;

	User me;

	User other;

	LocalDate today;

	@BeforeEach
	void seed() {
		data = new ProfileFixtures(jdbc);
		me = testUsers.create("하포");
		other = testUsers.create("민수");
		today = LocalDate.now(KST);
	}

	String base() {
		return "/api/users/" + me.getId();
	}

	@Test
	void postsListLatestFirstAndPaged() throws Exception {
		for (int i = 0; i < 21; i++) {
			data.post(me.getId(), "글 " + i, kst(today, 0, 0).plusSeconds(60L * i));
		}
		data.post(other.getId(), "남의 글", kst(today, 12, 0));
		mockMvc.perform(get(base() + "/posts?page=1"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items.length()").value(20))
			.andExpect(jsonPath("$.items[0].title").value("글 20"))
			.andExpect(jsonPath("$.totalItems").value(21));
		mockMvc.perform(get(base() + "/posts?page=2")).andExpect(jsonPath("$.items[0].title").value("글 0"));
	}

	@Test
	void commentsListIncludesPostTitle() throws Exception {
		long p = data.post(other.getId(), "아무무 글", kst(today, 9, 0));
		data.comment(me.getId(), p, "먼저 단 댓글", kst(today, 10, 0));
		data.comment(me.getId(), p, "나중에 단 댓글", kst(today, 11, 0));
		data.comment(other.getId(), p, "남의 댓글", kst(today, 12, 0));

		mockMvc.perform(get(base() + "/comments"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalItems").value(2))
			.andExpect(jsonPath("$.items[0].content").value("나중에 단 댓글"))
			.andExpect(jsonPath("$.items[0].post.id").value(p))
			.andExpect(jsonPath("$.items[0].post.title").value("아무무 글"))
			.andExpect(jsonPath("$.items[0].createdAt").exists());
	}

	@Test
	void scrapsListOrderedByScrapTime() throws Exception {
		long older = data.post(other.getId(), "오래된 글", kst(today.minusDays(5), 9, 0));
		long newer = data.post(other.getId(), "새 글", kst(today, 9, 0));
		data.scrap(me.getId(), newer, kst(today, 10, 0));
		data.scrap(me.getId(), older, kst(today, 11, 0));

		mockMvc.perform(get(base() + "/scraps"))
			.andExpect(jsonPath("$.items[0].title").value("오래된 글"))
			.andExpect(jsonPath("$.items[1].title").value("새 글"))
			.andExpect(jsonPath("$.items[0].author.nickname").value("민수"));
	}

	@Test
	void scrapsOfDeletedPostsDisappear() throws Exception {
		long p = data.post(other.getId(), "지워질 글", kst(today, 9, 0));
		data.scrap(me.getId(), p, kst(today, 10, 0));
		jdbc.update("delete from posts where id = ?", p);
		mockMvc.perform(get(base() + "/scraps")).andExpect(jsonPath("$.totalItems").value(0));
	}

	@Test
	void privateListsAre403ForOthersIncludingAdmin() throws Exception {
		data.makePrivate(me.getId());
		User admin = testUsers.createAdmin("관리자");
		for (String list : new String[] { "/posts", "/comments", "/scraps" }) {
			mockMvc.perform(get(base() + list))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("PROFILE_PRIVATE"));
			mockMvc.perform(get(base() + list).with(testUsers.as(other))).andExpect(status().isForbidden());
			mockMvc.perform(get(base() + list).with(testUsers.as(admin))).andExpect(status().isForbidden());
		}
	}

	@Test
	void ownerCanReadOwnPrivateLists() throws Exception {
		data.makePrivate(me.getId());
		for (String list : new String[] { "/posts", "/comments", "/scraps" }) {
			mockMvc.perform(get(base() + list).with(testUsers.as(me))).andExpect(status().isOk());
		}
	}

	@Test
	void unknownUserLists404AndPageZero400() throws Exception {
		mockMvc.perform(get("/api/users/9999/posts")).andExpect(status().isNotFound());
		mockMvc.perform(get(base() + "/posts?page=0")).andExpect(status().isBadRequest());
	}

}
