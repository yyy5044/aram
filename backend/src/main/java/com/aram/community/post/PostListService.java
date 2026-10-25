package com.aram.community.post;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.common.PageResponse;
import com.aram.community.gamedata.Augment;
import com.aram.community.gamedata.AugmentDto;
import com.aram.community.gamedata.Champion;
import com.aram.community.gamedata.ChampionDto;
import com.aram.community.gamedata.GameDataService;
import com.aram.community.gamedata.Item;
import com.aram.community.gamedata.ItemDto;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 글 목록: 정렬, 페이지(1부터, 20개씩), 태그 필터. 한 페이지의 태그는 종류별 쿼리 한 번씩으로 모아서 가져와요. */
@Service
@Transactional(readOnly = true)
public class PostListService {

	public static final int PAGE_SIZE = 20;

	private static final Integer NO_ITEM = -1;

	private static final Sort LATEST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

	private static final Sort LIKES = Sort.by(Sort.Order.desc("likeCount"), Sort.Order.desc("createdAt"),
			Sort.Order.desc("id"));

	private final PostRepository posts;

	private final GameDataService gameData;

	public PostListService(PostRepository posts, GameDataService gameData) {
		this.posts = posts;
		this.gameData = gameData;
	}

	public PageResponse<PostListItem> list(String sort, int page, int size, String championId, String augmentId,
			String itemId) {
		Sort order = switch (sort) {
			case "latest" -> LATEST;
			case "likes" -> LIKES;
			default -> throw new ApiException(ErrorCode.INVALID_INPUT, Map.of("sort", "정렬은 latest 또는 likes만 쓸 수 있어요"));
		};
		requireValidPage(page);
		if (size < 1 || size > PAGE_SIZE) {
			throw new ApiException(ErrorCode.INVALID_INPUT, Map.of("size", "한 번에 1~20개까지 볼 수 있어요"));
		}
		return toPage(posts.search(blankToNull(championId), blankToNull(augmentId), parseItemId(itemId),
				PageRequest.of(page - 1, size, order)));
	}

	/** 숫자가 아니거나 너무 큰 아이템 번호는 어떤 글도 맞지 않는 번호(-1)로 바꿔서 빈 결과가 나오게 해요. */
	private static Integer parseItemId(String itemId) {
		String id = blankToNull(itemId);
		if (id == null) {
			return null;
		}
		try {
			return Integer.valueOf(id);
		}
		catch (NumberFormatException e) {
			return NO_ITEM;
		}
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
		Map<Long, List<ItemDto>> items = ids.isEmpty() ? Map.of() : itemsByPost(ids);
		return PageResponse.of(result.map(p -> new PostListItem(p.getId(), p.getTitle(), p.getGamePatch(),
				AuthorDto.of(p.getAuthor()), champions.getOrDefault(p.getId(), List.of()),
				augments.getOrDefault(p.getId(), List.of()), items.getOrDefault(p.getId(), List.of()),
				p.getLikeCount(), p.getCommentCount(), p.getCreatedAt())));
	}

	/** 한 페이지 글들의 아이템을 모아 한 번에 바꾼 뒤(표를 한 번만 읽어요) 글별로 묶어요. 이름순. */
	private Map<Long, List<ItemDto>> itemsByPost(List<Long> postIds) {
		List<PostRepository.PostItem> tags = posts.findItemTags(postIds)
			.stream()
			.sorted(Comparator.comparing(t -> t.getItem().getNameKo()))
			.toList();
		Map<Integer, ItemDto> dtos = new HashMap<>();
		List<Item> distinct = tags.stream().map(PostRepository.PostItem::getItem).distinct().toList();
		List<ItemDto> mapped = gameData.toDtos(distinct);
		for (int i = 0; i < distinct.size(); i++) {
			dtos.put(distinct.get(i).getId(), mapped.get(i));
		}
		return tags.stream()
			.collect(Collectors.groupingBy(PostRepository.PostItem::getPostId,
					Collectors.mapping(t -> dtos.get(t.getItem().getId()), Collectors.toList())));
	}

	private static String blankToNull(String s) {
		return s == null || s.isBlank() ? null : s;
	}

}
