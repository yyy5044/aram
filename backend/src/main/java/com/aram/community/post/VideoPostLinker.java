package com.aram.community.post;

import java.util.List;
import java.util.UUID;

/** 글 본문에 들어간 영상 클립을 그 글에 연결하고, 글을 지우면 함께 지워요(사진의 ImagePostLinker와 같은 규칙). */
public interface VideoPostLinker {

	void link(long postId, long uploaderId, List<UUID> videoIds);

	void deleteForPost(long postId);

}
