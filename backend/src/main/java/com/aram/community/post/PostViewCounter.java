package com.aram.community.post;

import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 조회수(설계 docs/superpowers/specs/2026-10-26-view-count-design.md 5.1). 같은 사람은 한 글을 하루(한국 시간 날짜)에 한 번만
 * 세고, 글쓴이 자신은 세지 않아요. post_views 기본 키가 하루 한 번을 지켜서 동시에 와도 한 번만 올라요.
 */
@Component
public class PostViewCounter {

	static final ZoneId KST = ZoneId.of("Asia/Seoul");

	private static final Logger log = LoggerFactory.getLogger(PostViewCounter.class);

	private final JdbcTemplate jdbc;

	private final TransactionTemplate tx;

	public PostViewCounter(JdbcTemplate jdbc, PlatformTransactionManager transactionManager) {
		this.jdbc = jdbc;
		this.tx = new TransactionTemplate(transactionManager);
	}

	public static LocalDate kstDate(Instant at) {
		return at.atZone(KST).toLocalDate();
	}

	/** 지금 날짜로 세요. 세다가 DB 오류가 나도 글은 보여야 해서 경고만 남겨요. */
	public boolean count(long postId, Long viewerUserId, String anonymousId) {
		try {
			return countOn(postId, viewerUserId, anonymousId, kstDate(Instant.now()));
		}
		catch (DataAccessException | TransactionException e) {
			log.warn("Could not count a view of post {}", postId, e);
			return false;
		}
	}

	/** 올렸으면 true. 로그인한 사람은 계정으로, 아니면 브라우저 쿠키로 구분해요. */
	public boolean countOn(long postId, Long viewerUserId, String anonymousId, LocalDate day) {
		String viewerKey = viewerUserId != null ? "u:" + viewerUserId : anonymousId != null ? "a:" + anonymousId : null;
		if (viewerKey == null) {
			return false;
		}
		Boolean counted = tx.execute(status -> {
			List<Long> authors = jdbc.queryForList("select author_id from posts where id = ?", Long.class, postId);
			if (authors.isEmpty() || authors.getFirst().equals(viewerUserId)) {
				return false;
			}
			int inserted = jdbc.update(
					"insert into post_views (post_id, viewer_key, view_date) values (?, ?, ?) on conflict do nothing", postId,
					viewerKey, Date.valueOf(day));
			if (inserted == 0) {
				return false;
			}
			jdbc.update("update posts set view_count = view_count + 1 where id = ?", postId);
			return true;
		});
		return Boolean.TRUE.equals(counted);
	}

}
