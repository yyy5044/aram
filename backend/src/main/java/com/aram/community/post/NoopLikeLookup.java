package com.aram.community.post;

import org.springframework.stereotype.Component;

/** 추천 기능이 붙기 전 임시 구현. Task 9에서 지워요. */
@Component
class NoopLikeLookup implements LikeLookup {

	@Override
	public boolean isLiked(long postId, long userId) {
		return false;
	}

}
