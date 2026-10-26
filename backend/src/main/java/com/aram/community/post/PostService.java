package com.aram.community.post;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.gamedata.Augment;
import com.aram.community.gamedata.AugmentRepository;
import com.aram.community.gamedata.Champion;
import com.aram.community.gamedata.ChampionRepository;
import com.aram.community.gamedata.GameDataService;
import com.aram.community.gamedata.ItemRepository;
import com.aram.community.gamedata.PatchRepository;
import com.aram.community.user.User;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class PostService {

	static final int TITLE_MAX = 100;

	static final int MAX_CHAMPIONS = 5;

	static final int MAX_AUGMENTS = 10;

	private final PostRepository posts;

	private final ChampionRepository champions;

	private final AugmentRepository augments;

	private final ItemRepository items;

	private final PatchRepository patches;

	private final PostContentValidator validator;

	private final ImagePostLinker imageLinker;

	private final VideoPostLinker videoLinker;

	private final GameDataService gameData;

	private final LikeLookup likeLookup;

	private final ScrapLookup scrapLookup;

	private final JsonMapper jsonMapper;

	public PostService(PostRepository posts, ChampionRepository champions, AugmentRepository augments,
			ItemRepository items, PatchRepository patches, PostContentValidator validator, ImagePostLinker imageLinker,
			VideoPostLinker videoLinker, GameDataService gameData, LikeLookup likeLookup, ScrapLookup scrapLookup, JsonMapper jsonMapper) {
		this.scrapLookup = scrapLookup;
		this.posts = posts;
		this.champions = champions;
		this.augments = augments;
		this.items = items;
		this.patches = patches;
		this.validator = validator;
		this.imageLinker = imageLinker;
		this.videoLinker = videoLinker;
		this.gameData = gameData;
		this.likeLookup = likeLookup;
		this.jsonMapper = jsonMapper;
	}

	@Transactional
	public long create(User author, PostRequest req) {
		Input input = prepare(req, Set.of());
		Post post = posts.save(Post.create(author, input.title(), input.content(), req.gamePatch(), input.champions(),
				input.augments(), Instant.now()));
		imageLinker.link(post.getId(), author.getId(), input.content().imageIds());
		videoLinker.link(post.getId(), author.getId(), input.content().videoIds());
		return post.getId();
	}

	@Transactional
	public void update(User actor, long postId, PostRequest req) {
		Post post = find(postId);
		if (!post.getAuthor().getId().equals(actor.getId())) {
			throw new ApiException(ErrorCode.FORBIDDEN);
		}
		Set<String> alreadyAttached = post.getAugments().stream().map(Augment::getId).collect(Collectors.toSet());
		Input input = prepare(req, alreadyAttached);
		post.edit(input.title(), input.content(), req.gamePatch(), input.champions(), input.augments(), Instant.now());
		imageLinker.link(post.getId(), actor.getId(), input.content().imageIds());
		videoLinker.link(post.getId(), actor.getId(), input.content().videoIds());
	}

	@Transactional
	public void delete(User actor, long postId) {
		Post post = find(postId);
		if (!post.getAuthor().getId().equals(actor.getId()) && !actor.isAdmin()) {
			throw new ApiException(ErrorCode.FORBIDDEN);
		}
		imageLinker.deleteForPost(postId);
		videoLinker.deleteForPost(postId);
		posts.delete(post);
	}

	@Transactional(readOnly = true)
	public PostDetailResponse get(long postId, Long viewerId) {
		Post post = find(postId);
		boolean likedByMe = viewerId != null && likeLookup.isLiked(postId, viewerId);
		boolean scrappedByMe = viewerId != null && scrapLookup.isScrapped(postId, viewerId);
		return new PostDetailResponse(post.getId(), post.getTitle(), post.getContent(), post.getGamePatch(),
				AuthorDto.of(post.getAuthor()),
				post.getChampions()
					.stream()
					.sorted(Comparator.comparing(Champion::getNameKo))
					.map(gameData::toDto)
					.toList(),
				post.getAugments().stream().sorted(Comparator.comparing(Augment::getNameKo)).map(gameData::toDto).toList(),
				post.getLikeCount(), post.getCommentCount(), post.getViewCount(), likedByMe, scrappedByMe, post.getCreatedAt(), post.getUpdatedAt(),
				post.isEdited());
	}

	private Post find(long postId) {
		return posts.findById(postId).orElseThrow(() -> new ApiException(ErrorCode.POST_NOT_FOUND));
	}

	private record Input(String title, ValidatedContent content, Set<Champion> champions, Set<Augment> augments) {
	}

	/** 본문 박스의 챔피언·증강·아이템이 실제로 있는지 봐요. 사용 중이 아닌(옛) 증강·아이템도 있는 것으로 쳐요. */
	private void requireMentionedTagsExist(List<Mention> mentions) {
		Set<String> championIds = new LinkedHashSet<>();
		Set<String> augmentIds = new LinkedHashSet<>();
		Set<Integer> itemIds = new LinkedHashSet<>();
		for (Mention m : mentions) {
			switch (m.kind()) {
				case "champion" -> championIds.add(m.id());
				case "item" -> itemIds.add(Integer.valueOf(m.id()));
				default -> augmentIds.add(m.id());
			}
		}
		boolean allExist = champions.findAllById(championIds).size() == championIds.size()
				&& augments.findAllById(augmentIds).size() == augmentIds.size()
				&& items.findAllById(itemIds).size() == itemIds.size();
		if (!allExist) {
			throw field("content", "없는 챔피언·증강·아이템이 들어 있어요");
		}
	}

	private Input prepare(PostRequest req, Set<String> alreadyAttachedAugments) {
		String title = req.title().strip();
		if (title.isEmpty()) {
			throw field("title", "제목을 입력해주세요");
		}
		if (title.length() > TITLE_MAX) {
			throw field("title", "제목은 100자 이하로 써주세요");
		}
		ValidatedContent content = validator.validate(jsonMapper.writeValueAsString(req.content()));
		requireMentionedTagsExist(content.mentions());
		if (!patches.existsByGamePatch(req.gamePatch())) {
			throw field("gamePatch", "고를 수 없는 패치예요");
		}

		Set<String> championIds = new LinkedHashSet<>(req.championIdsOrEmpty());
		if (championIds.size() > MAX_CHAMPIONS) {
			throw field("championIds", "챔피언은 5개까지 고를 수 있어요");
		}
		List<Champion> foundChampions = champions.findAllById(championIds);
		if (foundChampions.size() != championIds.size()) {
			throw field("championIds", "없는 챔피언이 들어 있어요");
		}

		Set<String> augmentIds = new LinkedHashSet<>(req.augmentIdsOrEmpty());
		if (augmentIds.size() > MAX_AUGMENTS) {
			throw field("augmentIds", "증강은 10개까지 고를 수 있어요");
		}
		List<Augment> foundAugments = augments.findAllById(augmentIds);
		if (foundAugments.size() != augmentIds.size()) {
			throw field("augmentIds", "없는 증강이 들어 있어요");
		}
		boolean addsInactive = foundAugments.stream()
			.anyMatch(a -> !a.isActive() && !alreadyAttachedAugments.contains(a.getId()));
		if (addsInactive) {
			throw field("augmentIds", "현재 게임에 없는 증강은 새로 붙일 수 없어요");
		}
		return new Input(title, content, new LinkedHashSet<>(foundChampions), new LinkedHashSet<>(foundAugments));
	}

	private static ApiException field(String name, String message) {
		return new ApiException(ErrorCode.INVALID_INPUT, Map.of(name, message));
	}

}
