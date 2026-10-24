package com.aram.community.profile;

import java.time.Instant;

/** 프로필의 "쓴 댓글" 한 줄. 어느 글에 단 댓글인지 함께 보여줘요. */
public record MyCommentItem(long id, String content, Instant createdAt, PostRef post) {

	public record PostRef(long id, String title) {
	}

}
