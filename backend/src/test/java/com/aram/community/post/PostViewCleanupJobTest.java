package com.aram.community.post;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import java.sql.Date;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class PostViewCleanupJobTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	@Autowired
	PostViewCleanupJob job;

	@Test
	void removesRecordsOlderThanYesterdayAndKeepsTheCount() {
		long authorId = testUsers.create("양호").getId();
		long postId = jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, created_at, updated_at) "
				+ "values (?, '글', '{\"type\":\"doc\",\"content\":[]}'::jsonb, '본문', '26.21', now(), now()) returning id",
				Long.class, authorId);
		jdbc.update("update posts set view_count = 3 where id = ?", postId);
		LocalDate today = LocalDate.of(2026, 10, 26);
		for (LocalDate day : new LocalDate[] { today.minusDays(2), today.minusDays(1), today }) {
			jdbc.update("insert into post_views (post_id, viewer_key, view_date) values (?, 'u:1', ?)", postId,
					Date.valueOf(day));
		}

		assertThat(job.cleanup(today)).isEqualTo(1);

		assertThat(jdbc.queryForList("select view_date from post_views order by view_date", Date.class))
			.extracting(Date::toLocalDate)
			.containsExactly(today.minusDays(1), today);
		assertThat(jdbc.queryForObject("select view_count from posts where id = ?", Integer.class, postId)).isEqualTo(3);
	}

}
