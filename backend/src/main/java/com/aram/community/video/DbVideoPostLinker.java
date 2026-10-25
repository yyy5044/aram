package com.aram.community.video;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.post.VideoPostLinker;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** 글 본문에 들어간 영상을 그 글에 연결해요. 내가 올렸고, 변환이 끝났고, 다른 글에 쓰이지 않은 영상만 쓸 수 있어요. */
@Component
public class DbVideoPostLinker implements VideoPostLinker {

	private final VideoRepository videos;

	private final VideoService videoService;

	public DbVideoPostLinker(VideoRepository videos, VideoService videoService) {
		this.videos = videos;
		this.videoService = videoService;
	}

	@Override
	@Transactional
	public void link(long postId, long uploaderId, List<UUID> videoIds) {
		Set<UUID> ids = new LinkedHashSet<>(videoIds);
		if (ids.isEmpty()) {
			videos.unlinkAll(postId);
			return;
		}
		List<Video> found = videos.findAllById(ids);
		boolean allMine = found.size() == ids.size() && found.stream()
			.allMatch(v -> v.getUploaderId() == uploaderId && (v.getPostId() == null || v.getPostId() == postId));
		if (!allMine) {
			throw new ApiException(ErrorCode.INVALID_INPUT, Map.of("content", "올린 적 없는 영상이 들어 있어요"));
		}
		if (found.stream().anyMatch(v -> v.getStatus() != VideoStatus.READY)) {
			throw new ApiException(ErrorCode.INVALID_INPUT, Map.of("content", "영상 변환이 끝나지 않았어요"));
		}
		videos.unlinkOthers(postId, ids);
		videos.linkAll(postId, ids);
	}

	@Override
	@Transactional
	public void deleteForPost(long postId) {
		videoService.deleteAll(videos.findByPostId(postId));
	}

}
