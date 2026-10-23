package com.aram.community.post;

import java.util.List;
import java.util.UUID;

/** 본문 속 이미지를 글에 연결하고, 글을 지울 때 이미지도 지워요. 구현은 image 패키지에 있어요. */
public interface ImagePostLinker {

	void link(long postId, long uploaderId, List<UUID> imageIds);

	void deleteForPost(long postId);

}
