package com.aram.community.profile;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import org.springframework.jdbc.core.JdbcTemplate;

/** 프로필 테스트용 데이터를 시간까지 정해서 넣어요. */
final class ProfileFixtures {

	static final ZoneId KST = ZoneId.of("Asia/Seoul");

	private final JdbcTemplate jdbc;

	ProfileFixtures(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	static Instant kst(LocalDate date, int hour, int minute) {
		return date.atTime(LocalTime.of(hour, minute)).atZone(KST).toInstant();
	}

	long post(long authorId, String title, Instant at) {
		return jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, created_at, updated_at) "
				+ "values (?, ?, '{\"type\":\"doc\",\"content\":[]}'::jsonb, '본문', '26.21', ?, ?) returning id", Long.class,
				authorId, title, Timestamp.from(at), Timestamp.from(at));
	}

	long comment(long authorId, long postId, String content, Instant at) {
		return jdbc.queryForObject("insert into comments (post_id, author_id, content, created_at, updated_at) values (?, ?, ?, ?, ?) returning id",
				Long.class, postId, authorId, content, Timestamp.from(at), Timestamp.from(at));
	}

	void scrap(long userId, long postId, Instant at) {
		jdbc.update("insert into scraps (user_id, post_id, created_at) values (?, ?, ?)", userId, postId, Timestamp.from(at));
	}

	void makePrivate(long userId) {
		jdbc.update("update users set profile_public = false where id = ?", userId);
	}

}
