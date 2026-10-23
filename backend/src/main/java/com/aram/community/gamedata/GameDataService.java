package com.aram.community.gamedata;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
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

	private final PatchRepository patches;

	private final GameDataStateRepository states;

	public GameDataService(ChampionRepository champions, AugmentRepository augments, PatchRepository patches,
			GameDataStateRepository states) {
		this.champions = champions;
		this.augments = augments;
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
		return new AugmentDto(augment.getId(), augment.getNameKo(), augmentIconUrl(augment.getIconPath()),
				augment.isActive());
	}

	public List<ChampionDto> allChampions() {
		return champions.findAll().stream().sorted(Comparator.comparing(Champion::getNameKo)).map(this::toDto).toList();
	}

	public List<AugmentDto> allAugments() {
		return augments.findAll().stream().sorted(Comparator.comparing(Augment::getNameKo)).map(this::toDto).toList();
	}

}
