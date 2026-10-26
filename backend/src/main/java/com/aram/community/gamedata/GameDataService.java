package com.aram.community.gamedata;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.gamedata.text.AugmentLocale;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 챔피언·증강·아이템·패치 조회와 이미지 주소 만들기. */
@Service
@Transactional(readOnly = true)
public class GameDataService {

	private static final String DDRAGON_CDN = "https://ddragon.leagueoflegends.com/cdn/";

	private static final String CDRAGON_GAME = "https://raw.communitydragon.org/latest/game/";

	private final ChampionRepository champions;

	private final AugmentRepository augments;

	private final AugmentTextRepository texts;

	private final ItemRepository items;

	private final ItemTextRepository itemTexts;

	private final PatchRepository patches;

	private final GameDataStateRepository states;

	public GameDataService(ChampionRepository champions, AugmentRepository augments, AugmentTextRepository texts,
			ItemRepository items, ItemTextRepository itemTexts, PatchRepository patches,
			GameDataStateRepository states) {
		this.champions = champions;
		this.augments = augments;
		this.texts = texts;
		this.items = items;
		this.itemTexts = itemTexts;
		this.patches = patches;
		this.states = states;
	}

	public GameDataState state() {
		return states.findById(GameDataState.SINGLETON_ID).orElseGet(GameDataState::empty);
	}

	public Optional<String> currentGamePatch() {
		return Optional.ofNullable(state().getCurrentGamePatch());
	}

	public List<String> selectablePatches() {
		return patches.findTop8ByOrderByReleasedOrderDesc().stream().map(Patch::getGamePatch).toList();
	}

	public String championImageUrl(String imageFile) {
		String version = state().getCurrentDdragonVersion();
		return version == null ? null : DDRAGON_CDN + version + "/img/champion/" + imageFile;
	}

	public String augmentIconUrl(String iconPath) {
		return CDRAGON_GAME + iconPath;
	}

	public String itemIconUrl(String iconFile) {
		String version = state().getCurrentDdragonVersion();
		return version == null ? null : DDRAGON_CDN + version + "/img/item/" + iconFile;
	}

	public ChampionDto toDto(Champion champion) {
		return new ChampionDto(champion.getId(), champion.getNameKo(), championImageUrl(champion.getImageFile()));
	}

	public AugmentDto toDto(Augment augment) {
		return new AugmentDto(augment.getId(), augment.getNameKo(), augmentIconUrl(coloredIconPath(augment)),
				needsTint(augment), augment.isActive(), augment.getRarity());
	}

	/** 큰 아이콘(등급 색 있음)이 있으면 그것, 없으면 작은 아이콘. */
	private static String coloredIconPath(Augment augment) {
		String large = augment.getLargeIconPath();
		return large == null || large.isBlank() ? augment.getIconPath() : large;
	}

	/**
	 * 보여줄 아이콘이 흰 작은 아이콘(`…_small.png`)이라 화면이 등급 색을 입혀야 하는지. 큰 아이콘 파일이 없는 새 증강이
	 * 그래요. 스킬 증강의 공용 아이콘처럼 작은 것과 큰 것이 같은 파일이면 이미 색이 있어서 입히지 않아요.
	 */
	private static boolean needsTint(Augment augment) {
		return coloredIconPath(augment).endsWith("_small.png");
	}

	public List<ChampionDto> allChampions() {
		return champions.findAll().stream().sorted(Comparator.comparing(Champion::getNameKo)).map(this::toDto).toList();
	}

	/** 카드용 상세. original은 영어 행, translation은 lang 행(영어이거나 모르는 언어이거나 행이 없으면 null). */
	public AugmentDetailDto augmentDetail(String id, String lang) {
		Augment augment = augments.findById(id).orElseThrow(() -> new ApiException(ErrorCode.AUGMENT_NOT_FOUND));
		Map<String, AugmentText> byLocale = texts.findByIdAugmentId(id)
			.stream()
			.collect(Collectors.toMap(t -> t.getId().locale(), Function.identity()));
		AugmentText original = byLocale.get(AugmentLocale.EN.code());
		AugmentText translation = AugmentLocale.fromCode(lang)
			.filter(locale -> locale != AugmentLocale.EN)
			.map(locale -> byLocale.get(locale.code()))
			.orElse(null);
		return new AugmentDetailDto(augment.getId(), augment.getRarity(), augmentIconUrl(coloredIconPath(augment)),
				needsTint(augment),
				original == null ? null : AugmentTextDto.from(original),
				translation == null ? null : AugmentTextDto.from(translation));
	}

	/** 활성 아이템들의 재료를 뒤집어 아이템별 "이걸로 만드는 상위 아이템" 번호를 만들어요(중복 없이, 활성인 것만). */
	private Map<Integer, List<Integer>> intoIdsByItem(List<Item> all) {
		Map<Integer, Set<Integer>> into = new HashMap<>();
		for (Item item : all) {
			if (!item.isActive()) {
				continue;
			}
			for (int fromId : item.getFromIds()) {
				into.computeIfAbsent(fromId, k -> new TreeSet<>()).add(item.getId());
			}
		}
		Map<Integer, List<Integer>> result = new HashMap<>();
		into.forEach((k, v) -> result.put(k, List.copyOf(v)));
		return result;
	}

	private static List<String> asStrings(List<Integer> ids) {
		return ids.stream().map(String::valueOf).toList();
	}

	private ItemDto toDto(Item item, Map<Integer, List<Integer>> into) {
		return new ItemDto(String.valueOf(item.getId()), item.getNameKo(), item.getTier(), item.getPriceTotal(),
				itemIconUrl(item.getIconFile()), asStrings(item.getFromIds()),
				asStrings(into.getOrDefault(item.getId(), List.of())), item.isActive(), item.getCategories());
	}

	public ItemDto toDto(Item item) {
		return toDtos(List.of(item)).get(0);
	}

	/** 여러 아이템을 한 번에 바꿔요. 표를 한 번만 읽어서 intoIds를 만들고, 순서는 받은 그대로예요. */
	public List<ItemDto> toDtos(Collection<Item> given) {
		if (given.isEmpty()) {
			return List.of();
		}
		Map<Integer, List<Integer>> into = intoIdsByItem(items.findAll());
		return given.stream().map(item -> toDto(item, into)).toList();
	}

	public List<ItemDto> allItems() {
		List<Item> all = items.findAll();
		Map<Integer, List<Integer>> into = intoIdsByItem(all);
		return all.stream().sorted(Comparator.comparing(Item::getNameKo)).map(item -> toDto(item, into)).toList();
	}

	/** 상자용 상세. 번호가 숫자가 아니거나 없으면 ITEM_NOT_FOUND. original은 영어 행, translation은 lang 행. */
	public ItemDetailDto itemDetail(String id, String lang) {
		int itemId;
		try {
			itemId = Integer.parseInt(id);
		}
		catch (NumberFormatException e) {
			throw new ApiException(ErrorCode.ITEM_NOT_FOUND);
		}
		Item item = items.findById(itemId).orElseThrow(() -> new ApiException(ErrorCode.ITEM_NOT_FOUND));
		ItemDto dto = toDto(item);
		Map<String, ItemText> byLocale = itemTexts.findByIdItemId(itemId)
			.stream()
			.collect(Collectors.toMap(t -> t.getId().locale(), Function.identity()));
		ItemText original = byLocale.get(AugmentLocale.EN.code());
		ItemText translation = AugmentLocale.fromCode(lang)
			.filter(locale -> locale != AugmentLocale.EN)
			.map(locale -> byLocale.get(locale.code()))
			.orElse(null);
		return new ItemDetailDto(dto.id(), dto.tier(), dto.priceTotal(), dto.iconUrl(), dto.fromIds(), dto.intoIds(),
				original == null ? null : AugmentTextDto.from(original),
				translation == null ? null : AugmentTextDto.from(translation));
	}

	public List<AugmentDto> allAugments() {
		return augments.findAll().stream().sorted(Comparator.comparing(Augment::getNameKo)).map(this::toDto).toList();
	}

}
