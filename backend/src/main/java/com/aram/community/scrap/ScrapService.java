package com.aram.community.scrap;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.post.PostRepository;
import com.aram.community.post.ScrapLookup;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 스크랩과 스크랩 취소. 여러 번 눌러도 결과가 같아요. */
@Service
public class ScrapService implements ScrapLookup {

	public record ScrapState(boolean scrappedByMe) {
	}

	private final JdbcTemplate jdbc;

	private final PostRepository posts;

	public ScrapService(JdbcTemplate jdbc, PostRepository posts) {
		this.jdbc = jdbc;
		this.posts = posts;
	}

	@Transactional
	public ScrapState scrap(long postId, long userId) {
		requirePost(postId);
		jdbc.update("insert into scraps (user_id, post_id, created_at) values (?, ?, now()) on conflict do nothing",
				userId, postId);
		return new ScrapState(true);
	}

	@Transactional
	public ScrapState unscrap(long postId, long userId) {
		requirePost(postId);
		jdbc.update("delete from scraps where user_id = ? and post_id = ?", userId, postId);
		return new ScrapState(false);
	}

	@Override
	@Transactional(readOnly = true)
	public boolean isScrapped(long postId, long userId) {
		return Boolean.TRUE.equals(jdbc.queryForObject(
				"select exists (select 1 from scraps where user_id = ? and post_id = ?)", Boolean.class, userId, postId));
	}

	private void requirePost(long postId) {
		if (!posts.existsById(postId)) {
			throw new ApiException(ErrorCode.POST_NOT_FOUND);
		}
	}

}
