package com.aram.community.gamedata;

import com.aram.community.gamedata.GameDataClient.AugmentData;
import com.aram.community.gamedata.GameDataClient.ChampionData;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 패치가 바뀌었을 때만 챔피언·증강 목록을 새로 받아요. 실패하면 기존 데이터를 그대로 두고 사유만 남겨요.
 */
@Service
public class GameDataSyncService {

	public enum SyncResult {

		UPDATED, UNCHANGED, FAILED

	}

	static final int MIN_AUGMENTS = 20;

	private static final int KEPT_PATCHES = 8;

	private static final Logger log = LoggerFactory.getLogger(GameDataSyncService.class);

	private final GameDataClient client;

	private final ChampionRepository champions;

	private final AugmentRepository augments;

	private final PatchRepository patches;

	private final GameDataStateRepository states;

	private final TransactionTemplate tx;

	public GameDataSyncService(GameDataClient client, ChampionRepository champions, AugmentRepository augments,
			PatchRepository patches, GameDataStateRepository states, TransactionTemplate tx) {
		this.client = client;
		this.champions = champions;
		this.augments = augments;
		this.patches = patches;
		this.states = states;
		this.tx = tx;
	}

	public SyncResult sync() {
		try {
			List<String> versions = client.fetchVersions();
			String latest = versions.get(0);
			tx.executeWithoutResult(s -> savePatches(versions));

			GameDataState state = loadState();
			boolean needsFull = !latest.equals(state.getCurrentDdragonVersion()) || champions.count() == 0
					|| augments.count() == 0;
			if (!needsFull) {
				tx.executeWithoutResult(s -> updateState(st -> st.markChecked(Instant.now())));
				return SyncResult.UNCHANGED;
			}

			List<ChampionData> championData = client.fetchChampions(latest);
			tx.executeWithoutResult(s -> saveChampions(championData));

			List<AugmentData> augmentData = client.fetchAugments();
			if (augmentData.size() < MIN_AUGMENTS) {
				throw new IllegalStateException(
						"Only " + augmentData.size() + " augments found; data format may have changed");
			}
			tx.executeWithoutResult(s -> saveAugments(augmentData));

			tx.executeWithoutResult(s -> updateState(st -> {
				Instant now = Instant.now();
				st.markChecked(now);
				st.markSynced(latest, GamePatches.toGamePatch(latest), now);
			}));
			log.info("Game data synced to {} ({} champions, {} augments)", latest, championData.size(),
					augmentData.size());
			return SyncResult.UPDATED;
		}
		catch (RuntimeException e) {
			log.warn("Game data sync failed: {}", e.toString());
			String message = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
			tx.executeWithoutResult(s -> updateState(st -> {
				st.markChecked(Instant.now());
				st.markFailed(message);
			}));
			return SyncResult.FAILED;
		}
	}

	private GameDataState loadState() {
		return states.findById(GameDataState.SINGLETON_ID).orElseGet(GameDataState::empty);
	}

	private void updateState(java.util.function.Consumer<GameDataState> change) {
		GameDataState state = loadState();
		change.accept(state);
		states.save(state);
	}

	private void savePatches(List<String> versions) {
		versions.stream()
			.limit(KEPT_PATCHES)
			.filter(v -> !patches.existsById(v))
			.forEach(v -> patches.save(new Patch(v, GamePatches.toGamePatch(v), GamePatches.releasedOrder(v))));
	}

	private void saveChampions(List<ChampionData> data) {
		Map<String, Champion> existing = champions.findAll()
			.stream()
			.collect(Collectors.toMap(Champion::getId, Function.identity()));
		for (ChampionData c : data) {
			Champion champion = existing.get(c.id());
			if (champion == null) {
				champions.save(new Champion(c.id(), c.nameKo(), c.imageFile()));
			}
			else {
				champion.update(c.nameKo(), c.imageFile());
			}
		}
	}

	private void saveAugments(List<AugmentData> data) {
		Instant now = Instant.now();
		Map<String, Augment> existing = augments.findAll()
			.stream()
			.collect(Collectors.toMap(Augment::getId, Function.identity()));
		Map<String, AugmentData> incoming = data.stream()
			.collect(Collectors.toMap(AugmentData::id, Function.identity(), (a, b) -> a));
		for (AugmentData a : incoming.values()) {
			Augment augment = existing.get(a.id());
			if (augment == null) {
				augments.save(new Augment(a.id(), a.nameKo(), a.iconPath(), a.iconPath(), a.rarity(), now));
			}
			else {
				augment.refresh(a.nameKo(), a.iconPath(), a.iconPath(), a.rarity(), now);
			}
		}
		existing.values().stream().filter(a -> !incoming.containsKey(a.getId())).forEach(a -> a.deactivate(now));
	}

}
