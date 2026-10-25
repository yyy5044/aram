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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

class ProfileApiTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	ProfileFixtures data;

	User me;

	@BeforeEach
	void seed() {
		data = new ProfileFixtures(jdbc);
		me = testUsers.create("하포");
		LocalDate today = LocalDate.now(KST);
		long p1 = data.post(me.getId(), "글 하나", kst(today.minusDays(1), 12, 0));
		data.post(me.getId(), "글 둘", kst(today.minusDays(2), 12, 0));
		data.comment(me.getId(), p1, "댓글", kst(today.minusDays(1), 13, 0));
		data.scrap(me.getId(), p1, kst(today, 8, 0));
	}

	MockHttpServletRequestBuilder profileOf(User user) {
		return get("/api/users/" + user.getId() + "/profile");
	}

	@Test
	void publicProfileForAnonymous() throws Exception {
		mockMvc.perform(profileOf(me))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nickname").value("하포"))
			.andExpect(jsonPath("$.locked").value(false))
			.andExpect(jsonPath("$.mine").value(false))
			.andExpect(jsonPath("$.profilePublic").value(true))
			.andExpect(jsonPath("$.joinedAt").exists())
			.andExpect(jsonPath("$.stats.postCount").value(2))
			.andExpect(jsonPath("$.stats.commentCount").value(1))
			.andExpect(jsonPath("$.stats.scrapCount").value(1))
			.andExpect(jsonPath("$.activity.days.length()").value(2))
			.andExpect(jsonPath("$.activity.from").exists())
			.andExpect(jsonPath("$.activity.to").value(LocalDate.now(KST).toString()));
	}

	@Test
	void receivedLikesSumOnlyThisUsersPosts() throws Exception {
		jdbc.update("update posts set like_count = 2 where title = '글 하나'");
		jdbc.update("update posts set like_count = 3 where title = '글 둘'");
		User other = testUsers.create("민수");
		long otherPost = data.post(other.getId(), "남의 글", kst(LocalDate.now(KST), 9, 0));
		jdbc.update("update posts set like_count = 7 where id = ?", otherPost);
		mockMvc.perform(profileOf(me)).andExpect(jsonPath("$.stats.receivedLikeCount").value(5));
		mockMvc.perform(profileOf(other)).andExpect(jsonPath("$.stats.receivedLikeCount").value(7));
	}

	@Test
	void receivedLikesAreZeroWithoutPosts() throws Exception {
		User fresh = testUsers.create("새친구");
		mockMvc.perform(profileOf(fresh)).andExpect(jsonPath("$.stats.receivedLikeCount").value(0));
	}

	@Test
	void privateProfileIsLockedForOthersAndAdmin() throws Exception {
		data.makePrivate(me.getId());
		for (MockHttpServletRequestBuilder req : new MockHttpServletRequestBuilder[] { profileOf(me),
				profileOf(me).with(testUsers.as(testUsers.create("민수"))),
				profileOf(me).with(testUsers.as(testUsers.createAdmin("관리자"))) }) {
			mockMvc.perform(req)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.locked").value(true))
				.andExpect(jsonPath("$.nickname").value("하포"))
				.andExpect(jsonPath("$.joinedAt").exists())
				.andExpect(jsonPath("$.stats").value((Object) null))
				.andExpect(jsonPath("$.activity").value((Object) null));
		}
	}

	@Test
	void ownerSeesPrivateProfile() throws Exception {
		data.makePrivate(me.getId());
		mockMvc.perform(profileOf(me).with(testUsers.as(me)))
			.andExpect(jsonPath("$.mine").value(true))
			.andExpect(jsonPath("$.locked").value(false))
			.andExpect(jsonPath("$.profilePublic").value(false))
			.andExpect(jsonPath("$.stats.postCount").value(2));
	}

	@Test
	void unknownUser404() throws Exception {
		mockMvc.perform(get("/api/users/9999/profile"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
	}

	@Test
	void userWithoutNickname404() throws Exception {
		User newbie = testUsers.createWithoutNickname();
		mockMvc.perform(profileOf(newbie)).andExpect(status().isNotFound());
	}

}
