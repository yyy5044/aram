package com.aram.community.comment;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.post.PostRepository;
import com.aram.community.user.User;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommentService {

	private final CommentRepository comments;

	private final PostRepository posts;

	private final JdbcTemplate jdbc;

	public CommentService(CommentRepository comments, PostRepository posts, JdbcTemplate jdbc) {
		this.jdbc = jdbc;
		this.comments = comments;
		this.posts = posts;
	}

	@Transactional(readOnly = true)
	public List<CommentResponse> list(long postId) {
		requirePost(postId);
		return comments.findByPostIdOrderByCreatedAtAscIdAsc(postId).stream().map(CommentResponse::of).toList();
	}

	@Transactional
	public CommentResponse create(User author, long postId, CommentRequest req) {
		lockPost(postId);
		Comment comment = comments.save(new Comment(postId, author, clean(req.content()), Instant.now()));
		comments.flush();
		comments.recount(postId);
		return CommentResponse.of(comment);
	}

	@Transactional
	public CommentResponse update(User actor, long commentId, CommentRequest req) {
		Comment comment = find(commentId);
		if (!comment.getAuthor().getId().equals(actor.getId())) {
			throw new ApiException(ErrorCode.FORBIDDEN);
		}
		comment.edit(clean(req.content()), Instant.now());
		return CommentResponse.of(comment);
	}

	@Transactional
	public void delete(User actor, long commentId) {
		Comment comment = find(commentId);
		if (!comment.getAuthor().getId().equals(actor.getId()) && !actor.isAdmin()) {
			throw new ApiException(ErrorCode.FORBIDDEN);
		}
		long postId = comment.getPostId();
		lockPost(postId);
		comments.delete(comment);
		comments.flush();
		comments.recount(postId);
	}

	private static String clean(String raw) {
		String content = raw.strip();
		if (content.isEmpty()) {
			throw new ApiException(ErrorCode.INVALID_INPUT, Map.of("content", "댓글을 입력해주세요"));
		}
		return content;
	}

	/**
	 * 글 행을 잠가요. 동시에 댓글이 달려도 댓글 수를 다시 셀 때 앞선 댓글이 모두 보이게 하려는 거예요.
	 */
	private void lockPost(long postId) {
		if (jdbc.queryForList("select id from posts where id = ? for update", Long.class, postId).isEmpty()) {
			throw new ApiException(ErrorCode.POST_NOT_FOUND);
		}
	}

	private void requirePost(long postId) {
		if (!posts.existsById(postId)) {
			throw new ApiException(ErrorCode.POST_NOT_FOUND);
		}
	}

	private Comment find(long commentId) {
		return comments.findById(commentId).orElseThrow(() -> new ApiException(ErrorCode.COMMENT_NOT_FOUND));
	}

}
