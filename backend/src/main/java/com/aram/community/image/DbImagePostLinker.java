package com.aram.community.image;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.post.ImagePostLinker;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** 글 본문에 들어간 이미지를 그 글에 연결해요. 내가 올렸고 다른 글에 쓰이지 않은 이미지만 쓸 수 있어요. */
@Component
public class DbImagePostLinker implements ImagePostLinker {

	private final ImageRepository images;

	private final ImageService imageService;

	public DbImagePostLinker(ImageRepository images, ImageService imageService) {
		this.images = images;
		this.imageService = imageService;
	}

	@Override
	@Transactional
	public void link(long postId, long uploaderId, List<UUID> imageIds) {
		Set<UUID> ids = new LinkedHashSet<>(imageIds);
		if (ids.isEmpty()) {
			images.unlinkAll(postId);
			return;
		}
		List<Image> found = images.findAllById(ids);
		boolean allUsable = found.size() == ids.size() && found.stream()
			.allMatch(i -> i.getUploaderId() == uploaderId && (i.getPostId() == null || i.getPostId() == postId));
		if (!allUsable) {
			throw new ApiException(ErrorCode.INVALID_INPUT, Map.of("content", "올린 적 없는 이미지가 들어 있어요"));
		}
		images.unlinkOthers(postId, ids);
		images.linkAll(postId, ids);
	}

	@Override
	@Transactional
	public void deleteForPost(long postId) {
		imageService.deleteAll(images.findByPostId(postId));
	}

}
