package com.aram.community.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class UserProfileFieldsTest extends IntegrationTest {

	@Autowired
	UserService userService;

	@Autowired
	UserRepository users;

	@Autowired
	TestUsers testUsers;

	private UUID insertImage(long uploaderId) {
		UUID id = UUID.randomUUID();
		jdbc.update("insert into images (id, uploader_id, storage_key, content_type, size_bytes, created_at) values (?, ?, ?, 'image/png', 10, now())",
				id, uploaderId, id + ".png");
		return id;
	}

	@Test
	void discordReloginKeepsCustomPhoto() {
		User u = userService.upsertFromDiscord("555", "https://cdn.discordapp.com/avatars/555/a.png");
		UUID imageId = insertImage(u.getId());
		jdbc.update("update users set profile_image_id = ? where id = ?", imageId, u.getId());

		userService.upsertFromDiscord("555", "https://cdn.discordapp.com/avatars/555/b.png");

		User reloaded = users.findById(u.getId()).orElseThrow();
		assertThat(reloaded.getProfileImageId()).isEqualTo(imageId);
		assertThat(reloaded.getAvatarUrl()).endsWith("/b.png");
		assertThat(reloaded.effectiveAvatarUrl()).isEqualTo("/api/images/" + imageId);
	}

	@Test
	void effectiveAvatarFallsBackToDiscordThenNull() {
		User withDiscord = userService.upsertFromDiscord("600", "https://cdn.discordapp.com/avatars/600/a.png");
		User withoutAny = userService.upsertFromDiscord("601", null);

		assertThat(users.findById(withDiscord.getId()).orElseThrow().effectiveAvatarUrl())
			.isEqualTo("https://cdn.discordapp.com/avatars/600/a.png");
		assertThat(users.findById(withoutAny.getId()).orElseThrow().effectiveAvatarUrl()).isNull();
	}

	@Test
	void profilePublicDefaultsToTrue() {
		User u = userService.upsertFromDiscord("602", null);
		assertThat(users.findById(u.getId()).orElseThrow().isProfilePublic()).isTrue();
	}

	@Test
	void meIncludesProfileFields() throws Exception {
		User u = userService.upsertFromDiscord("603", "https://cdn.discordapp.com/avatars/603/a.png");
		userService.changeNickname(u.getId(), "하포");
		User me = users.findById(u.getId()).orElseThrow();

		mockMvc.perform(get("/api/me").with(testUsers.as(me)))
			.andExpect(jsonPath("$.profilePublic").value(true))
			.andExpect(jsonPath("$.profileImageId").doesNotExist())
			.andExpect(jsonPath("$.discordAvatarUrl").value("https://cdn.discordapp.com/avatars/603/a.png"))
			.andExpect(jsonPath("$.avatarUrl").value("https://cdn.discordapp.com/avatars/603/a.png"));

		UUID imageId = insertImage(me.getId());
		jdbc.update("update users set profile_image_id = ? where id = ?", imageId, me.getId());

		mockMvc.perform(get("/api/me").with(testUsers.as(me)))
			.andExpect(jsonPath("$.profileImageId").value(imageId.toString()))
			.andExpect(jsonPath("$.avatarUrl").value("/api/images/" + imageId))
			.andExpect(jsonPath("$.discordAvatarUrl").value("https://cdn.discordapp.com/avatars/603/a.png"));
	}

	@Test
	void authorAvatarUsesCustomPhoto() throws Exception {
		User author = testUsers.create("양호");
		UUID imageId = insertImage(author.getId());
		jdbc.update("update users set profile_image_id = ? where id = ?", imageId, author.getId());
		long postId = jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, created_at, updated_at) "
				+ "values (?, '글', '{\"type\":\"doc\",\"content\":[]}'::jsonb, '본문', '26.21', now(), now()) returning id", Long.class,
				author.getId());

		mockMvc.perform(get("/api/posts/" + postId))
			.andExpect(jsonPath("$.author.avatarUrl").value("/api/images/" + imageId));
	}

}
