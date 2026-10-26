package com.aram.community.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import jakarta.servlet.http.Cookie;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class PostViewApiTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	@Autowired
	PostViewCounter counter;

	User author;

	User reader;

	User admin;

	long postId;

	@BeforeEach
	void seed() {
		jdbc.update("insert into game_data_state (id, current_ddragon_version, current_game_patch) values (1, '16.21.1', '26.21')");
		jdbc.update("insert into patches (ddragon_version, game_patch, released_order) values ('16.21.1','26.21',162101)");
		author = testUsers.create("양호");
		reader = testUsers.create("지현");
		admin = testUsers.createAdmin("관리자");
		postId = jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, created_at, updated_at) "
				+ "values (?, '아무무 글', '{\"type\":\"doc\",\"content\":[]}'::jsonb, '본문', '26.21', now() - interval '1 hour', now() - interval '1 hour') returning id",
				Long.class, author.getId());
	}

	ResultActions view(RequestPostProcessor who) throws Exception {
		return mockMvc.perform(get("/api/posts/" + postId).with(who));
	}

	ResultActions viewAnonymously(Cookie... cookies) throws Exception {
		var request = get("/api/posts/" + postId);
		if (cookies.length > 0) {
			request.cookie(cookies);
		}
		return mockMvc.perform(request);
	}

	int storedViewCount() {
		return jdbc.queryForObject("select view_count from posts where id = ?", Integer.class, postId);
	}

	int viewRecords() {
		return jdbc.queryForObject("select count(*) from post_views", Integer.class);
	}

	@Test
	void firstViewByOtherUserCounts() throws Exception {
		view(testUsers.as(reader)).andExpect(status().isOk()).andExpect(jsonPath("$.viewCount").value(1));
	}

	@Test
	void sameDayRepeatDoesNotCount() throws Exception {
		view(testUsers.as(reader));
		view(testUsers.as(reader));
		view(testUsers.as(reader)).andExpect(jsonPath("$.viewCount").value(1));
		assertThat(storedViewCount()).isEqualTo(1);
	}

	@Test
	void authorViewDoesNotCount() throws Exception {
		view(testUsers.as(author));
		view(testUsers.as(author)).andExpect(jsonPath("$.viewCount").value(0));
		assertThat(viewRecords()).isZero();
	}

	@Test
	void adminViewCounts() throws Exception {
		view(testUsers.as(admin)).andExpect(jsonPath("$.viewCount").value(1));
	}

	@Test
	void anonymousGetsCookieAndCounts() throws Exception {
		viewAnonymously().andExpect(status().isOk())
			.andExpect(jsonPath("$.viewCount").value(1))
			.andExpect(cookie().exists(ViewerCookie.NAME))
			.andExpect(cookie().maxAge(ViewerCookie.NAME, 31536000))
			.andExpect(cookie().httpOnly(ViewerCookie.NAME, true))
			.andExpect(cookie().path(ViewerCookie.NAME, "/"));
	}

	@Test
	void anonymousSameCookieCountsOnce() throws Exception {
		MvcResult first = viewAnonymously().andReturn();
		Cookie issued = first.getResponse().getCookie(ViewerCookie.NAME);
		assertThat(issued).isNotNull();

		viewAnonymously(new Cookie(ViewerCookie.NAME, issued.getValue()))
			.andExpect(jsonPath("$.viewCount").value(1))
			.andExpect(cookie().doesNotExist(ViewerCookie.NAME));
	}

	@Test
	void anonymousDifferentCookieCountsAgain() throws Exception {
		viewAnonymously(new Cookie(ViewerCookie.NAME, UUID.randomUUID().toString()));
		viewAnonymously(new Cookie(ViewerCookie.NAME, UUID.randomUUID().toString()))
			.andExpect(jsonPath("$.viewCount").value(2));
	}

	@Test
	void malformedCookieGetsNewOne() throws Exception {
		MvcResult result = viewAnonymously(new Cookie(ViewerCookie.NAME, "abc"))
			.andExpect(jsonPath("$.viewCount").value(1))
			.andReturn();
		Cookie issued = result.getResponse().getCookie(ViewerCookie.NAME);
		assertThat(issued).isNotNull();
		assertThat(UUID.fromString(issued.getValue()).toString()).isEqualTo(issued.getValue());
	}

	@Test
	void loggedInIgnoresLeftoverViewerCookie() throws Exception {
		mockMvc.perform(get("/api/posts/" + postId).with(testUsers.as(reader))
			.cookie(new Cookie(ViewerCookie.NAME, UUID.randomUUID().toString())));
		mockMvc
			.perform(get("/api/posts/" + postId).with(testUsers.as(reader))
				.cookie(new Cookie(ViewerCookie.NAME, UUID.randomUUID().toString())))
			.andExpect(jsonPath("$.viewCount").value(1))
			.andExpect(cookie().doesNotExist(ViewerCookie.NAME));
	}

	@Test
	void nextDayCountsAgain() {
		LocalDate day = LocalDate.of(2026, 10, 26);
		assertThat(counter.countOn(postId, reader.getId(), null, day)).isTrue();
		assertThat(counter.countOn(postId, reader.getId(), null, day)).isFalse();
		assertThat(counter.countOn(postId, reader.getId(), null, day.plusDays(1))).isTrue();
		assertThat(storedViewCount()).isEqualTo(2);
	}

	@Test
	void concurrentSameViewerCountsOnce() throws Exception {
		LocalDate day = LocalDate.of(2026, 10, 26);
		CountDownLatch start = new CountDownLatch(1);
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			List<Future<Boolean>> results = List.of(pool.submit(() -> {
				start.await();
				return counter.countOn(postId, reader.getId(), null, day);
			}), pool.submit(() -> {
				start.await();
				return counter.countOn(postId, reader.getId(), null, day);
			}));
			start.countDown();
			int counted = 0;
			for (Future<Boolean> r : results) {
				counted += r.get() ? 1 : 0;
			}
			assertThat(counted).isEqualTo(1);
		}
		finally {
			pool.shutdown();
		}
		assertThat(storedViewCount()).isEqualTo(1);
	}

	@Test
	void viewDoesNotTouchUpdatedAt() throws Exception {
		Timestamp before = jdbc.queryForObject("select updated_at from posts where id = ?", Timestamp.class, postId);
		view(testUsers.as(reader)).andExpect(jsonPath("$.edited").value(false));
		Timestamp after = jdbc.queryForObject("select updated_at from posts where id = ?", Timestamp.class, postId);
		assertThat(after).isEqualTo(before);
	}

	@Test
	void editingKeepsViewCount() throws Exception {
		view(testUsers.as(reader));
		mockMvc
			.perform(put("/api/posts/" + postId).with(testUsers.as(author))
				.contentType(MediaType.APPLICATION_JSON)
				.content(PostApiTest.body("고친 제목", List.of(), List.of(), "26.21")))
			.andExpect(status().isNoContent());
		view(testUsers.as(author)).andExpect(jsonPath("$.title").value("고친 제목"))
			.andExpect(jsonPath("$.viewCount").value(1));
	}

	@Test
	void deletingViewedPostWorks() throws Exception {
		view(testUsers.as(reader));
		mockMvc.perform(delete("/api/posts/" + postId).with(testUsers.as(author))).andExpect(status().isNoContent());
		assertThat(viewRecords()).isZero();
	}

	@Test
	void missingPostIs404WithoutRecord() throws Exception {
		mockMvc.perform(get("/api/posts/9999").with(testUsers.as(reader)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
		assertThat(viewRecords()).isZero();
	}

	@Test
	void kstDateBoundary() {
		assertThat(PostViewCounter.kstDate(Instant.parse("2026-10-26T14:59:59Z"))).isEqualTo(LocalDate.of(2026, 10, 26));
		assertThat(PostViewCounter.kstDate(Instant.parse("2026-10-26T15:00:00Z"))).isEqualTo(LocalDate.of(2026, 10, 27));
	}

}
