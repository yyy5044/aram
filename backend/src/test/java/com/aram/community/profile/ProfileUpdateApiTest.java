package com.aram.community.profile;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class ProfileUpdateApiTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	User me;

	@BeforeEach
	void seed() {
		me = testUsers.create("하포");
		jdbc.update("update users set avatar_url = 'https://cdn.discordapp.com/avatars/x/a.png' where id = ?", me.getId());
	}

	UUID insertImage(long uploaderId, Long postId) {
		UUID id = UUID.randomUUID();
		jdbc.update("insert into images (id, uploader_id, post_id, storage_key, content_type, size_bytes, created_at) values (?, ?, ?, ?, 'image/png', 10, now())",
				id, uploaderId, postId, id + ".png");
		return id;
	}

	ResultActions putProfile(User user, String json) throws Exception {
		return mockMvc.perform(put("/api/me/profile").with(testUsers.as(user))
			.contentType(MediaType.APPLICATION_JSON)
			.content(json));
	}

	static String body(String nickname, UUID imageId, Boolean profilePublic) {
		return "{\"nickname\":\"" + nickname + "\",\"profileImageId\":" + (imageId == null ? "null" : "\"" + imageId + "\"")
				+ (profilePublic == null ? "" : ",\"profilePublic\":" + profilePublic) + "}";
	}

	@Test
	void updatesAllThreeFields() throws Exception {
		UUID img = insertImage(me.getId(), null);
		putProfile(me, body("새닉", img, false)).andExpect(status().isOk())
			.andExpect(jsonPath("$.nickname").value("새닉"))
			.andExpect(jsonPath("$.profilePublic").value(false))
			.andExpect(jsonPath("$.profileImageId").value(img.toString()))
			.andExpect(jsonPath("$.avatarUrl").value("/api/images/" + img));
	}

	@Test
	void nullImageRevertsToDiscordPhoto() throws Exception {
		UUID img = insertImage(me.getId(), null);
		putProfile(me, body("하포", img, true)).andExpect(status().isOk());
		putProfile(me, body("하포", null, true)).andExpect(status().isOk())
			.andExpect(jsonPath("$.profileImageId").doesNotExist())
			.andExpect(jsonPath("$.avatarUrl").value("https://cdn.discordapp.com/avatars/x/a.png"));
	}

	@Test
	void rejectsSomeoneElsesImage() throws Exception {
		UUID img = insertImage(testUsers.create("민수").getId(), null);
		putProfile(me, body("하포", img, true)).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.profileImageId").value("쓸 수 없는 이미지예요"));
	}

	@Test
	void rejectsImageUsedInPost() throws Exception {
		long postId = jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, created_at, updated_at) "
				+ "values (?, '글', '{}'::jsonb, '본문', '26.21', now(), now()) returning id", Long.class, me.getId());
		UUID img = insertImage(me.getId(), postId);
		putProfile(me, body("하포", img, true)).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.profileImageId").value("쓸 수 없는 이미지예요"));
	}

	@Test
	void rejectsUnknownImage() throws Exception {
		putProfile(me, body("하포", UUID.randomUUID(), true)).andExpect(status().isBadRequest());
	}

	@Test
	void duplicateNicknameIs409AndNothingChanges() throws Exception {
		testUsers.create("민수");
		putProfile(me, body("민수", null, false)).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("NICKNAME_TAKEN"));
		mockMvc.perform(get("/api/me").with(testUsers.as(me)))
			.andExpect(jsonPath("$.nickname").value("하포"))
			.andExpect(jsonPath("$.profilePublic").value(true));
	}

	@Test
	void invalidNicknameShowsFieldError() throws Exception {
		putProfile(me, body("a", null, true)).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.nickname").exists());
	}

	@Test
	void missingProfilePublicIs400() throws Exception {
		putProfile(me, body("하포", null, null)).andExpect(status().isBadRequest());
	}

	@Test
	void anonymousCannotUpdate() throws Exception {
		mockMvc.perform(put("/api/me/profile").with(csrf())
			.contentType(MediaType.APPLICATION_JSON)
			.content(body("하포", null, true))).andExpect(status().isUnauthorized());
	}

}
