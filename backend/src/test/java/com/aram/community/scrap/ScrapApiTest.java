package com.aram.community.scrap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ScrapApiTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	User reader;

	long postId;

	@BeforeEach
	void seed() {
		User author = testUsers.create("양호");
		reader = testUsers.create("민수");
		postId = jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, created_at, updated_at) "
				+ "values (?, '글', '{}'::jsonb, '본문', '26.21', now(), now()) returning id", Long.class, author.getId());
	}

	int scrapRows() {
		return jdbc.queryForObject("select count(*) from scraps", Integer.class);
	}

	@Test
	void scrapAndUnscrap() throws Exception {
		mockMvc.perform(put("/api/posts/" + postId + "/scrap").with(testUsers.as(reader)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.scrappedByMe").value(true));
		mockMvc.perform(get("/api/posts/" + postId).with(testUsers.as(reader)))
			.andExpect(jsonPath("$.scrappedByMe").value(true));
		mockMvc.perform(delete("/api/posts/" + postId + "/scrap").with(testUsers.as(reader)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.scrappedByMe").value(false));
		assertThat(scrapRows()).isZero();
	}

	@Test
	void repeatedScrapIsIdempotent() throws Exception {
		mockMvc.perform(put("/api/posts/" + postId + "/scrap").with(testUsers.as(reader))).andExpect(status().isOk());
		mockMvc.perform(put("/api/posts/" + postId + "/scrap").with(testUsers.as(reader))).andExpect(status().isOk());
		assertThat(scrapRows()).isEqualTo(1);
	}

	@Test
	void concurrentScrapsDoNotFail() throws Exception {
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			List<Future<Integer>> results = new ArrayList<>();
			for (int i = 0; i < 2; i++) {
				results.add(pool.submit(() -> {
					start.await();
					return mockMvc.perform(put("/api/posts/" + postId + "/scrap").with(testUsers.as(reader)))
						.andReturn()
						.getResponse()
						.getStatus();
				}));
			}
			start.countDown();
			for (Future<Integer> r : results) {
				assertThat(r.get()).isEqualTo(200);
			}
		}
		finally {
			pool.shutdown();
		}
		assertThat(scrapRows()).isEqualTo(1);
	}

	@Test
	void anonymousCannotScrap() throws Exception {
		mockMvc.perform(put("/api/posts/" + postId + "/scrap").with(csrf())).andExpect(status().isUnauthorized());
	}

	@Test
	void scrapMissingPost404() throws Exception {
		mockMvc.perform(put("/api/posts/9999/scrap").with(testUsers.as(reader)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
	}

	@Test
	void otherViewersSeeScrappedByMeFalse() throws Exception {
		mockMvc.perform(put("/api/posts/" + postId + "/scrap").with(testUsers.as(reader))).andExpect(status().isOk());
		mockMvc.perform(get("/api/posts/" + postId).with(testUsers.as(testUsers.create("지훈"))))
			.andExpect(jsonPath("$.scrappedByMe").value(false));
		mockMvc.perform(get("/api/posts/" + postId)).andExpect(jsonPath("$.scrappedByMe").value(false));
	}

	@Test
	void deletingPostRemovesScraps() throws Exception {
		mockMvc.perform(put("/api/posts/" + postId + "/scrap").with(testUsers.as(reader))).andExpect(status().isOk());
		jdbc.update("delete from posts where id = ?", postId);
		assertThat(scrapRows()).isZero();
	}

}
