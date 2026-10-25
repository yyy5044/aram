package com.aram.community.post;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.gamedata.ChampionRepository;
import com.aram.community.gamedata.GameDataService;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 태그별 글 수와 챔피언의 자주 함께 쓰는 증강. 모두 읽기 전용이에요. */
@Service
@Transactional(readOnly = true)
public class TagStatsService {

	static final int TOP_AUGMENTS = 5;

	private final PostRepository posts;

	private final ChampionRepository champions;

	private final GameDataService gameData;

	public TagStatsService(PostRepository posts, ChampionRepository champions, GameDataService gameData) {
		this.posts = posts;
		this.champions = champions;
		this.gameData = gameData;
	}

	public TagCountsResponse counts() {
		return new TagCountsResponse(toMap(posts.countByChampion()), toMap(posts.countByAugment()),
				toMap(posts.countByItem()));
	}

	public List<TopAugmentItem> topAugments(String championId) {
		if (!champions.existsById(championId)) {
			throw new ApiException(ErrorCode.CHAMPION_NOT_FOUND);
		}
		return posts.topAugmentsWith(championId, PageRequest.of(0, TOP_AUGMENTS))
			.stream()
			.map(row -> new TopAugmentItem(gameData.toDto(row.getAugment()), row.getPostCount()))
			.toList();
	}

	private static Map<String, Long> toMap(List<PostRepository.TagCount> rows) {
		return rows.stream()
			.collect(Collectors.toMap(PostRepository.TagCount::getId, PostRepository.TagCount::getPostCount));
	}

}
