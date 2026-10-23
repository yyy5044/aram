package com.aram.community.post;

/** 글 상세의 "내가 추천했는지" 조회. 구현은 like 패키지에 있어요. */
public interface LikeLookup {

	boolean isLiked(long postId, long userId);

}
