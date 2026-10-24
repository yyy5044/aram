package com.aram.community.post;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class TagStatsApiTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	User author;

	@BeforeEach
	void seed() {
		jdbc.update("insert into game_data_state (id, current_ddragon_version, current_game_patch) values (1, '16.21.1', '26.21')");
		jdbc.update("insert into champions (id, name_ko, image_file) values ('Amumu', '아무무', 'Amumu.png'), ('Jinx', '징크스', 'Jinx.png')");
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at, rarity) values "
				+ "('A1', '무한 궁극기', 'a1.png', true, now(), 'PRISMATIC'), "
				+ "('A2', '연쇄 번개', 'a2.png', true, now(), 'GOLD'), "
				+ "('A3', '거인 학살자', 'a3.png', true, now(), 'GOLD'), "
				+ "('A4', '옛 증강', 'a4.png', false, now(), 'SILVER')");
		author = testUsers.create("양호");
	}

	long insertPost(String title) {
		return jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, created_at, updated_at) "
				+ "values (?, ?, '{\"type\":\"doc\",\"content\":[]}'::jsonb, '본문', '26.21', now(), now()) returning id",
				Long.class, author.getId(), title);
	}

	long post(String champion, String... augments) {
		long id = insertPost("글");
		if (champion != null) {
			jdbc.update("insert into post_champions (post_id, champion_id) values (?, ?)", id, champion);
		}
		for (String a : augments) {
			jdbc.update("insert into post_augments (post_id, augment_id) values (?, ?)", id, a);
		}
		return id;
	}

	@Test
	void countsPostsPerTag() throws Exception {
		post("Amumu", "A1");
		post("Amumu", "A1", "A2");
		post("Jinx");

		mockMvc.perform(get("/api/tag-counts"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.champions.Amumu").value(2))
			.andExpect(jsonPath("$.champions.Jinx").value(1))
			.andExpect(jsonPath("$.augments.A1").value(2))
			.andExpect(jsonPath("$.augments.A2").value(1))
			.andExpect(jsonPath("$.augments.A3").doesNotExist());
	}

	@Test
	void countsDropWhenPostDeleted() throws Exception {
		post("Amumu", "A1");
		long second = post("Amumu", "A1", "A2");
		jdbc.update("delete from posts where id = ?", second);

		mockMvc.perform(get("/api/tag-counts"))
			.andExpect(jsonPath("$.champions.Amumu").value(1))
			.andExpect(jsonPath("$.augments.A2").doesNotExist());
	}

	@Test
	void inactiveAugmentsAreCounted() throws Exception {
		post("Jinx", "A4");

		mockMvc.perform(get("/api/tag-counts")).andExpect(jsonPath("$.augments.A4").value(1));
	}

	@Test
	void emptyCountsAreObjects() throws Exception {
		mockMvc.perform(get("/api/tag-counts"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.champions").isMap())
			.andExpect(jsonPath("$.augments").isMap());
	}

	@Test
	void topAugmentsOrderedByCountThenName() throws Exception {
		post("Amumu", "A2");
		post("Amumu", "A2");
		post("Amumu", "A1");
		post("Amumu", "A3");

		mockMvc.perform(get("/api/champions/Amumu/top-augments"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(3))
			.andExpect(jsonPath("$[0].augment.id").value("A2"))
			.andExpect(jsonPath("$[0].postCount").value(2))
			.andExpect(jsonPath("$[0].augment.rarity").value("GOLD"))
			.andExpect(jsonPath("$[1].augment.id").value("A3"))
			.andExpect(jsonPath("$[2].augment.id").value("A1"));
	}

	@Test
	void topAugmentsAtMostFive() throws Exception {
		for (int i = 5; i <= 10; i++) {
			jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at) values (?, ?, 'x.png', true, now())",
					"A" + i, "증강 " + i);
			post("Amumu", "A" + i);
		}

		mockMvc.perform(get("/api/champions/Amumu/top-augments")).andExpect(jsonPath("$.length()").value(5));
	}

	@Test
	void topAugmentsSkipInactive() throws Exception {
		post("Amumu", "A4");

		mockMvc.perform(get("/api/champions/Amumu/top-augments")).andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void topAugmentsOnlyFromThatChampion() throws Exception {
		post("Jinx", "A1");

		mockMvc.perform(get("/api/champions/Amumu/top-augments")).andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void topAugmentsUnknownChampion404() throws Exception {
		mockMvc.perform(get("/api/champions/Nope/top-augments"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("CHAMPION_NOT_FOUND"))
			.andExpect(jsonPath("$.message").value("챔피언을 찾을 수 없어요"));
	}

}
