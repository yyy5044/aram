package com.aram.community.like;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.post.LikeLookup;
import com.aram.community.post.PostRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 추천과 추천 취소. 여러 번 눌러도 결과가 같고, 추천 수는 매번 실제 개수로 다시 세서 어긋나지 않아요.
 */
@Service
public class LikeService implements LikeLookup {

	public record LikeState(int likeCount, boolean likedByMe) {
	}

	private final JdbcTemplate jdbc;

	private final PostRepository posts;

	public LikeService(JdbcTemplate jdbc, PostRepository posts) {
		this.jdbc = jdbc;
		this.posts = posts;
	}

	@Transactional
	public LikeState like(long postId, long userId) {
		requirePost(postId);
		jdbc.update("insert into post_likes (post_id, user_id, created_at) values (?, ?, now()) on conflict do nothing",
				postId, userId);
		return new LikeState(recount(postId), true);
	}

	@Transactional
	public LikeState unlike(long postId, long userId) {
		requirePost(postId);
		jdbc.update("delete from post_likes where post_id = ? and user_id = ?", postId, userId);
		return new LikeState(recount(postId), false);
	}

	@Override
	@Transactional(readOnly = true)
	public boolean isLiked(long postId, long userId) {
		Boolean liked = jdbc.queryForObject(
				"select exists (select 1 from post_likes where post_id = ? and user_id = ?)", Boolean.class, postId,
				userId);
		return Boolean.TRUE.equals(liked);
	}

	private int recount(long postId) {
		return jdbc.queryForObject("update posts set like_count = (select count(*) from post_likes where post_id = ?) "
				+ "where id = ? returning like_count", Integer.class, postId, postId);
	}

	private void requirePost(long postId) {
		if (!posts.existsById(postId)) {
			throw new ApiException(ErrorCode.POST_NOT_FOUND);
		}
	}

}
