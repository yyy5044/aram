package com.aram.community.post;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** 이미지 기능이 붙기 전 임시 구현. Task 7에서 지워요. */
@Component
class NoopImagePostLinker implements ImagePostLinker {

	@Override
	public void link(long postId, long uploaderId, List<UUID> imageIds) {
	}

	@Override
	public void deleteForPost(long postId) {
	}

}
