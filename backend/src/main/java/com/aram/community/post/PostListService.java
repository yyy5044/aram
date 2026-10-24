package com.aram.community.post;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.common.PageResponse;
import com.aram.community.gamedata.Augment;
import com.aram.community.gamedata.AugmentDto;
import com.aram.community.gamedata.Champion;
import com.aram.community.gamedata.ChampionDto;
import com.aram.community.gamedata.GameDataService;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 글 목록: 정렬, 페이지(1부터, 20개씩), 태그 필터. 한 페이지의 태그는 쿼리 두 번으로 모아서 가져와요. */
@Service
@Transactional(readOnly = true)
public class PostListService {

	public static final int PAGE_SIZE = 20;

	private static final Sort LATEST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

	private static final Sort LIKES = Sort.by(Sort.Order.desc("likeCount"), Sort.Order.desc("createdAt"),
			Sort.Order.desc("id"));

	private final PostRepository posts;

	private final GameDataService gameData;

	public PostListService(PostRepository posts, GameDataService gameData) {
		this.posts = posts;
		this.gameData = gameData;
	}

	public PageResponse<PostListItem> list(String sort, int page, String championId, String augmentId) {
		Sort order = switch (sort) {
			case "latest" -> LATEST;
			case "likes" -> LIKES;
			default -> throw new ApiException(ErrorCode.INVALID_INPUT, Map.of("sort", "정렬은 latest 또는 likes만 쓸 수 있어요"));
		};
		requireValidPage(page);
		return toPage(posts.search(blankToNull(championId), blankToNull(augmentId),
				PageRequest.of(page - 1, PAGE_SIZE, order)));
	}

	/** 이 사용자가 쓴 글, 최신순. */
	public PageResponse<PostListItem> listByAuthor(long authorId, int page) {
		requireValidPage(page);
		return toPage(posts.findByAuthor_Id(authorId, PageRequest.of(page - 1, PAGE_SIZE, LATEST)));
	}

	/** 이 사용자가 스크랩한 글, 스크랩한 시간의 최신순. */
	public PageResponse<PostListItem> listScrapsOf(long userId, int page) {
		requireValidPage(page);
		return toPage(posts.findScrappedBy(userId, PageRequest.of(page - 1, PAGE_SIZE)));
	}

	public static void requireValidPage(int page) {
		if (page < 1) {
			throw new ApiException(ErrorCode.INVALID_INPUT, Map.of("page", "페이지는 1부터 시작해요"));
		}
	}

	private PageResponse<PostListItem> toPage(Page<Post> result) {
		List<Long> ids = result.getContent().stream().map(Post::getId).toList();
		Map<Long, List<ChampionDto>> champions = ids.isEmpty() ? Map.of()
				: posts.findChampionTags(ids)
					.stream()
					.sorted(Comparator.comparing(t -> t.getChampion().getNameKo()))
					.collect(Collectors.groupingBy(PostRepository.PostChampion::getPostId,
							Collectors.mapping(t -> gameData.toDto(t.getChampion()), Collectors.toList())));
		Map<Long, List<AugmentDto>> augments = ids.isEmpty() ? Map.of()
				: posts.findAugmentTags(ids)
					.stream()
					.sorted(Comparator.comparing(t -> t.getAugment().getNameKo()))
					.collect(Collectors.groupingBy(PostRepository.PostAugment::getPostId,
							Collectors.mapping(t -> gameData.toDto(t.getAugment()), Collectors.toList())));
		return PageResponse.of(result.map(p -> new PostListItem(p.getId(), p.getTitle(), p.getGamePatch(),
				AuthorDto.of(p.getAuthor()), champions.getOrDefault(p.getId(), List.of()),
				augments.getOrDefault(p.getId(), List.of()), p.getLikeCount(), p.getCommentCount(), p.getCreatedAt())));
	}

	private static String blankToNull(String s) {
		return s == null || s.isBlank() ? null : s;
	}

}
