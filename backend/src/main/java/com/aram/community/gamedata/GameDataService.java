package com.aram.community.gamedata;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.gamedata.text.AugmentLocale;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 챔피언·증강·패치 조회와 이미지 주소 만들기. */
@Service
@Transactional(readOnly = true)
public class GameDataService {

	private static final String DDRAGON_CDN = "https://ddragon.leagueoflegends.com/cdn/";

	private static final String CDRAGON_GAME = "https://raw.communitydragon.org/latest/game/";

	private final ChampionRepository champions;

	private final AugmentRepository augments;

	private final AugmentTextRepository texts;

	private final PatchRepository patches;

	private final GameDataStateRepository states;

	public GameDataService(ChampionRepository champions, AugmentRepository augments, AugmentTextRepository texts,
			PatchRepository patches, GameDataStateRepository states) {
		this.champions = champions;
		this.augments = augments;
		this.texts = texts;
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

	public List<AugmentDto> allAugments() {
		return augments.findAll().stream().sorted(Comparator.comparing(Augment::getNameKo)).map(this::toDto).toList();
	}

}
