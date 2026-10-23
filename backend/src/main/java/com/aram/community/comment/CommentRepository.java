package com.aram.community.comment;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface CommentRepository extends JpaRepository<Comment, Long> {

	@EntityGraph(attributePaths = "author")
	List<Comment> findByPostIdOrderByCreatedAtAscIdAsc(Long postId);

	/** 댓글 수를 실제 개수로 다시 맞춰요. */
	@Modifying
	@Query(value = "update posts set comment_count = (select count(*) from comments where post_id = :postId) where id = :postId",
			nativeQuery = true)
	void recount(long postId);

}
