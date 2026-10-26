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

class PostListApiTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	User author;

	@BeforeEach
	void seed() {
		jdbc.update("insert into game_data_state (id, current_ddragon_version, current_game_patch) values (1, '16.21.1', '26.21')");
		jdbc.update("insert into champions (id, name_ko, image_file) values ('Amumu', '아무무', 'Amumu.png'), ('Jinx', '징크스', 'Jinx.png')");
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at) values ('A1', '무한 궁극기', 'a1.png', true, now()), ('A2', '연쇄 번개', 'a2.png', true, now())");
		author = testUsers.create("양호");
	}

	/** minutesAgo가 클수록 오래된 글. */
	long insertPost(String title, int minutesAgo, int likes, int comments) {
		return jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, like_count, comment_count, created_at, updated_at) "
				+ "values (?, ?, '{\"type\":\"doc\",\"content\":[]}'::jsonb, '본문', '26.21', ?, ?, now() - make_interval(mins => ?), now() - make_interval(mins => ?)) returning id",
				Long.class, author.getId(), title, likes, comments, minutesAgo, minutesAgo);
	}

	long insertPost(String title, int minutesAgo, int likes, int comments, int views) {
		long id = insertPost(title, minutesAgo, likes, comments);
		jdbc.update("update posts set view_count = ? where id = ?", views, id);
		return id;
	}

	void tagChampion(long postId, String championId) {
		jdbc.update("insert into post_champions (post_id, champion_id) values (?, ?)", postId, championId);
	}

	void tagAugment(long postId, String augmentId) {
		jdbc.update("insert into post_augments (post_id, augment_id) values (?, ?)", postId, augmentId);
	}

	@Test
	void latestFirstByDefault() throws Exception {
		insertPost("오래된 글", 30, 0, 0);
		insertPost("최신 글", 1, 0, 0);
		insertPost("중간 글", 10, 0, 0);

		mockMvc.perform(get("/api/posts"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items[0].title").value("최신 글"))
			.andExpect(jsonPath("$.items[2].title").value("오래된 글"))
			.andExpect(jsonPath("$.page").value(1))
			.andExpect(jsonPath("$.size").value(20))
			.andExpect(jsonPath("$.totalItems").value(3))
			.andExpect(jsonPath("$.totalPages").value(1));
	}

	@Test
	void sortsByLikes() throws Exception {
		insertPost("5개", 3, 5, 0);
		insertPost("9개", 2, 9, 0);
		insertPost("1개", 1, 1, 0);

		mockMvc.perform(get("/api/posts?sort=likes"))
			.andExpect(jsonPath("$.items[0].title").value("9개"))
			.andExpect(jsonPath("$.items[1].title").value("5개"))
			.andExpect(jsonPath("$.items[2].title").value("1개"));
	}

	@Test
	void sizeLimitsPage() throws Exception {
		for (int i = 0; i < 7; i++) {
			insertPost("글 " + i, i, 0, 0);
		}
		mockMvc.perform(get("/api/posts?size=5"))
			.andExpect(jsonPath("$.items.length()").value(5))
			.andExpect(jsonPath("$.size").value(5))
			.andExpect(jsonPath("$.totalPages").value(2));
		mockMvc.perform(get("/api/posts?size=5&page=2")).andExpect(jsonPath("$.items.length()").value(2));
	}

	@Test
	void sizeOutOfRangeIs400() throws Exception {
		for (String size : new String[] { "0", "21" }) {
			mockMvc.perform(get("/api/posts?size=" + size))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.fieldErrors.size").value("한 번에 1~20개까지 볼 수 있어요"));
		}
	}

	@Test
	void paginatesTwentyPerPage() throws Exception {
		for (int i = 0; i < 21; i++) {
			insertPost("글 " + i, i, 0, 0);
		}
		mockMvc.perform(get("/api/posts?page=1"))
			.andExpect(jsonPath("$.items.length()").value(20))
			.andExpect(jsonPath("$.totalPages").value(2));
		mockMvc.perform(get("/api/posts?page=2"))
			.andExpect(jsonPath("$.items.length()").value(1))
			.andExpect(jsonPath("$.items[0].title").value("글 20"))
			.andExpect(jsonPath("$.page").value(2));
	}

	@Test
	void pageBeyondEndIsEmpty() throws Exception {
		insertPost("하나", 1, 0, 0);
		mockMvc.perform(get("/api/posts?page=5"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items.length()").value(0));
	}

	@Test
	void pageZeroRejected() throws Exception {
		mockMvc.perform(get("/api/posts?page=0")).andExpect(status().isBadRequest());
	}

	@Test
	void unknownSortRejected() throws Exception {
		mockMvc.perform(get("/api/posts?sort=popular"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.sort").value("정렬은 latest, likes, views만 쓸 수 있어요"));
	}

	@Test
	void sortsByViews() throws Exception {
		insertPost("5회", 3, 0, 0, 5);
		insertPost("9회", 2, 0, 0, 9);
		insertPost("1회", 1, 0, 0, 1);

		mockMvc.perform(get("/api/posts?sort=views"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items[0].title").value("9회"))
			.andExpect(jsonPath("$.items[1].title").value("5회"))
			.andExpect(jsonPath("$.items[2].title").value("1회"));
	}

	@Test
	void viewsTieNewestFirst() throws Exception {
		insertPost("옛 글", 5, 0, 0, 4);
		insertPost("새 글", 1, 0, 0, 4);

		mockMvc.perform(get("/api/posts?sort=views"))
			.andExpect(jsonPath("$.items[0].title").value("새 글"))
			.andExpect(jsonPath("$.items[1].title").value("옛 글"));
	}

	@Test
	void listIncludesViewCount() throws Exception {
		insertPost("7회", 1, 0, 0, 7);

		mockMvc.perform(get("/api/posts")).andExpect(jsonPath("$.items[0].viewCount").value(7));
	}

	@Test
	void filtersByChampion() throws Exception {
		tagChampion(insertPost("아무무 글", 3, 0, 0), "Amumu");
		tagChampion(insertPost("징크스 글", 2, 0, 0), "Jinx");
		insertPost("태그 없음", 1, 0, 0);

		mockMvc.perform(get("/api/posts?champion=Amumu"))
			.andExpect(jsonPath("$.totalItems").value(1))
			.andExpect(jsonPath("$.items[0].title").value("아무무 글"))
			.andExpect(jsonPath("$.items[0].champions[0].id").value("Amumu"));
	}

	@Test
	void filtersByAugment() throws Exception {
		tagAugment(insertPost("A1 글", 2, 0, 0), "A1");
		tagAugment(insertPost("A2 글", 1, 0, 0), "A2");

		mockMvc.perform(get("/api/posts?augment=A2"))
			.andExpect(jsonPath("$.totalItems").value(1))
			.andExpect(jsonPath("$.items[0].title").value("A2 글"));
	}

	@Test
	void filtersByBothWithAnd() throws Exception {
		long both = insertPost("둘 다", 3, 0, 0);
		tagChampion(both, "Amumu");
		tagAugment(both, "A1");
		tagChampion(insertPost("챔피언만", 2, 0, 0), "Amumu");
		tagAugment(insertPost("증강만", 1, 0, 0), "A1");

		mockMvc.perform(get("/api/posts?champion=Amumu&augment=A1"))
			.andExpect(jsonPath("$.totalItems").value(1))
			.andExpect(jsonPath("$.items[0].title").value("둘 다"));
	}

	@Test
	void listIncludesTagsAuthorAndCounts() throws Exception {
		long id = insertPost("태그 많은 글", 1, 7, 3);
		tagChampion(id, "Jinx");
		tagChampion(id, "Amumu");
		tagAugment(id, "A1");

		mockMvc.perform(get("/api/posts"))
			.andExpect(jsonPath("$.items[0].champions.length()").value(2))
			.andExpect(jsonPath("$.items[0].champions[0].nameKo").value("아무무"))
			.andExpect(jsonPath("$.items[0].augments[0].nameKo").value("무한 궁극기"))
			.andExpect(jsonPath("$.items[0].augments[0].iconUrl").exists())
			.andExpect(jsonPath("$.items[0].author.nickname").value("양호"))
			.andExpect(jsonPath("$.items[0].likeCount").value(7))
			.andExpect(jsonPath("$.items[0].commentCount").value(3))
			.andExpect(jsonPath("$.items[0].gamePatch").value("26.21"))
			.andExpect(jsonPath("$.items[0].createdAt").exists())
			.andExpect(jsonPath("$.items[0].content").doesNotExist());
	}

}
