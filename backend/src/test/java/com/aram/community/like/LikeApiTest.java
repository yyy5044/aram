package com.aram.community.like;

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

class LikeApiTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	User fan;

	long postId;

	@BeforeEach
	void seed() {
		User author = testUsers.create("양호");
		fan = testUsers.create("민수");
		postId = jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, created_at, updated_at) "
				+ "values (?, '글', '{}'::jsonb, '본문', '26.21', now(), now()) returning id", Long.class, author.getId());
	}

	@Test
	void likeAndUnlike() throws Exception {
		mockMvc.perform(put("/api/posts/" + postId + "/like").with(testUsers.as(fan)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.likeCount").value(1))
			.andExpect(jsonPath("$.likedByMe").value(true));
		mockMvc.perform(get("/api/posts/" + postId).with(testUsers.as(fan)))
			.andExpect(jsonPath("$.likedByMe").value(true))
			.andExpect(jsonPath("$.likeCount").value(1));

		mockMvc.perform(delete("/api/posts/" + postId + "/like").with(testUsers.as(fan)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.likeCount").value(0))
			.andExpect(jsonPath("$.likedByMe").value(false));
	}

	@Test
	void repeatedLikeIsIdempotent() throws Exception {
		mockMvc.perform(put("/api/posts/" + postId + "/like").with(testUsers.as(fan))).andExpect(status().isOk());
		mockMvc.perform(put("/api/posts/" + postId + "/like").with(testUsers.as(fan)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.likeCount").value(1));
	}

	@Test
	void concurrentLikesDoNotDuplicate() throws Exception {
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			List<Future<Integer>> results = new ArrayList<>();
			for (int i = 0; i < 2; i++) {
				results.add(pool.submit(() -> {
					start.await();
					return mockMvc.perform(put("/api/posts/" + postId + "/like").with(testUsers.as(fan)))
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
		assertThat(jdbc.queryForObject("select like_count from posts where id = ?", Integer.class, postId)).isEqualTo(1);
		assertThat(jdbc.queryForObject("select count(*) from post_likes", Integer.class)).isEqualTo(1);
	}

	@Test
	void concurrentLikesFromDifferentUsersAreAllCounted() throws Exception {
		int users = 6;
		for (int round = 0; round < 5; round++) {
			jdbc.update("delete from post_likes");
			jdbc.update("update posts set like_count = 0");
			List<User> fans = new ArrayList<>();
			for (int i = 0; i < users; i++) {
				fans.add(testUsers.create("팬" + round + "_" + i));
			}
			CountDownLatch start = new CountDownLatch(1);
			ExecutorService pool = Executors.newFixedThreadPool(users);
			try {
				List<Future<Integer>> results = new ArrayList<>();
				for (User u : fans) {
					results.add(pool.submit(() -> {
						start.await();
						return mockMvc.perform(put("/api/posts/" + postId + "/like").with(testUsers.as(u)))
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
			assertThat(jdbc.queryForObject("select like_count from posts where id = ?", Integer.class, postId))
				.as("round %d", round)
				.isEqualTo(users);
		}
	}

	@Test
	void unlikeWithoutLikeIsFine() throws Exception {
		mockMvc.perform(delete("/api/posts/" + postId + "/like").with(testUsers.as(fan)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.likeCount").value(0));
	}

	@Test
	void anonymousCannotLike() throws Exception {
		mockMvc.perform(put("/api/posts/" + postId + "/like").with(csrf())).andExpect(status().isUnauthorized());
	}

	@Test
	void likeMissingPost404() throws Exception {
		mockMvc.perform(put("/api/posts/9999/like").with(testUsers.as(fan)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
	}

	@Test
	void anonymousViewerSeesLikedByMeFalse() throws Exception {
		mockMvc.perform(put("/api/posts/" + postId + "/like").with(testUsers.as(fan))).andExpect(status().isOk());
		mockMvc.perform(get("/api/posts/" + postId))
			.andExpect(jsonPath("$.likedByMe").value(false))
			.andExpect(jsonPath("$.likeCount").value(1));
	}

	@Test
	void deletingPostDeletesLikes() throws Exception {
		mockMvc.perform(put("/api/posts/" + postId + "/like").with(testUsers.as(fan))).andExpect(status().isOk());
		jdbc.update("delete from posts where id = ?", postId);
		assertThat(jdbc.queryForObject("select count(*) from post_likes", Integer.class)).isZero();
	}

}
