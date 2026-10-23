package com.aram.community.comment;

import com.aram.community.post.AuthorDto;
import java.time.Instant;

public record CommentResponse(long id, AuthorDto author, String content, Instant createdAt, Instant updatedAt,
		boolean edited) {

	static CommentResponse of(Comment c) {
		return new CommentResponse(c.getId(), AuthorDto.of(c.getAuthor()), c.getContent(), c.getCreatedAt(),
				c.getUpdatedAt(), c.isEdited());
	}

}
