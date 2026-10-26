package com.aram.community.gamedata;

import com.aram.community.gamedata.GameDataClient.AugmentData;
import com.aram.community.gamedata.GameDataClient.ChampionData;
import com.aram.community.gamedata.GameDataClient.ItemData;
import com.aram.community.gamedata.GameDataClient.LocalizedText;
import com.aram.community.gamedata.text.AugmentLocale;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 패치가 바뀌었을 때만 챔피언·증강·아이템 목록을 새로 받아요. 실패하면 기존 데이터를 그대로 두고 사유만 남겨요.
 */
@Service
public class GameDataSyncService {

	public enum SyncResult {

		UPDATED, UNCHANGED, FAILED

	}

	static final int MIN_AUGMENTS = 20;

	/** 실제 상점은 190개쯤이에요. 이보다 적으면 자료 형식이 바뀐 것으로 봐요. */
	static final int MIN_ITEMS = 10;

	private static final int KEPT_PATCHES = 8;

	private static final Logger log = LoggerFactory.getLogger(GameDataSyncService.class);

	private final GameDataClient client;

	private final ChampionRepository champions;

	private final AugmentRepository augments;

	private final AugmentTextRepository texts;

	private final ItemRepository items;

	private final ItemTextRepository itemTexts;

	private final PatchRepository patches;

	private final GameDataStateRepository states;

	private final TransactionTemplate tx;

	public GameDataSyncService(GameDataClient client, ChampionRepository champions, AugmentRepository augments,
			AugmentTextRepository texts, ItemRepository items, ItemTextRepository itemTexts, PatchRepository patches,
			GameDataStateRepository states, TransactionTemplate tx) {
		this.client = client;
		this.champions = champions;
		this.augments = augments;
		this.texts = texts;
		this.items = items;
		this.itemTexts = itemTexts;
		this.patches = patches;
		this.states = states;
		this.tx = tx;
	}

	public SyncResult sync() {
		try {
			List<String> versions = client.fetchVersions();
			String latest = versions.get(0);
			Optional<String> cdragonVersion = fetchCdragonVersion();
			tx.executeWithoutResult(s -> savePatches(versions));

			GameDataState state = loadState();
			// CommunityDragon은 라이엇보다 늦게 갱신되거나 패치 중간에 자료를 고칠 때가 있어서, 그 버전이 바뀌어도 다시 받아요.
			boolean cdragonChanged = cdragonVersion.isPresent()
					&& !cdragonVersion.get().equals(state.getCurrentCdragonVersion());
			boolean needsFull = !latest.equals(state.getCurrentDdragonVersion()) || cdragonChanged
					|| champions.count() == 0 || augments.count() == 0 || items.count() == 0;
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

			List<ItemData> itemData;
			try {
				itemData = client.fetchItems();
				if (itemData.size() < MIN_ITEMS) {
					throw new IllegalStateException(
							"Only " + itemData.size() + " items found; data format may have changed");
				}
				tx.executeWithoutResult(s -> saveItems(itemData));
			}
			catch (RuntimeException e) {
				// 챔피언·증강은 이미 저장됐어요. 버전을 올리지 않아서 다음 확인(30분 뒤) 때 전체를 다시 받아요.
				log.warn("Item sync failed, keeping the previous items: {}", e.toString());
				markFailed(e);
				return SyncResult.FAILED;
			}

			tx.executeWithoutResult(s -> updateState(st -> {
				Instant now = Instant.now();
				st.markChecked(now);
				st.markSynced(latest, GamePatches.toGamePatch(latest),
						cdragonVersion.orElse(st.getCurrentCdragonVersion()), now);
			}));
			int unresolved = augmentData.stream().mapToInt(AugmentData::unresolvedCount).sum();
			int itemUnresolved = itemData.stream().mapToInt(ItemData::unresolvedCount).sum();
			log.info(
					"Game data synced to {} ({} champions, {} augments, {} unresolved placeholders, {} items, {} unresolved item placeholders)",
					latest, championData.size(), augmentData.size(), unresolved, itemData.size(), itemUnresolved);
			return SyncResult.UPDATED;
		}
		catch (RuntimeException e) {
			log.warn("Game data sync failed: {}", e.toString());
			markFailed(e);
			return SyncResult.FAILED;
		}
	}

	private void markFailed(RuntimeException e) {
		String message = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
		tx.executeWithoutResult(s -> updateState(st -> {
			st.markChecked(Instant.now());
			st.markFailed(message);
		}));
	}

	/** 버전 파일을 못 읽어도 동기화를 멈추지 않고, 예전처럼 라이엇 패치 번호만 보게 해요. */
	private Optional<String> fetchCdragonVersion() {
		try {
			return Optional.of(client.fetchCdragonVersion());
		}
		catch (RuntimeException e) {
			log.warn("CommunityDragon version unavailable, checking the patch number only: {}", e.toString());
			return Optional.empty();
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
		Map<AugmentTextId, AugmentText> existingTexts = texts.findAll()
			.stream()
			.collect(Collectors.toMap(AugmentText::getId, Function.identity()));
		for (AugmentData a : incoming.values()) {
			Augment augment = existing.get(a.id());
			if (augment == null) {
				augments.save(new Augment(a.id(), a.nameKo(), a.iconPath(), a.largeIconPath(), a.rarity(), now));
			}
			else {
				augment.refresh(a.nameKo(), a.iconPath(), a.largeIconPath(), a.rarity(), now);
			}
			for (Map.Entry<AugmentLocale, LocalizedText> e : a.texts().entrySet()) {
				AugmentTextId id = new AugmentTextId(a.id(), e.getKey().code());
				AugmentText text = existingTexts.get(id);
				if (text == null) {
					texts.save(new AugmentText(id, e.getValue().name(), e.getValue().description(), now));
				}
				else {
					text.refresh(e.getValue().name(), e.getValue().description(), now);
				}
			}
		}
		existing.values().stream().filter(a -> !incoming.containsKey(a.getId())).forEach(a -> a.deactivate(now));
	}

	private void saveItems(List<ItemData> data) {
		Instant now = Instant.now();
		Map<Integer, Item> existing = items.findAll()
			.stream()
			.collect(Collectors.toMap(Item::getId, Function.identity()));
		Map<Integer, ItemData> incoming = data.stream()
			.collect(Collectors.toMap(ItemData::id, Function.identity(), (a, b) -> a));
		Map<ItemTextId, ItemText> existingTexts = itemTexts.findAll()
			.stream()
			.collect(Collectors.toMap(ItemText::getId, Function.identity()));
		for (ItemData i : incoming.values()) {
			// 아이콘은 Data Dragon의 아이템 그림 이름(번호.png)이에요.
			String iconFile = i.id() + ".png";
			Item item = existing.get(i.id());
			if (item == null) {
				items.save(new Item(i.id(), i.nameKo(), i.tier(), i.priceTotal(), iconFile, i.fromIds(), i.categories(),
						now));
			}
			else {
				item.refresh(i.nameKo(), i.tier(), i.priceTotal(), iconFile, i.fromIds(), i.categories(), now);
			}
			for (Map.Entry<AugmentLocale, LocalizedText> e : i.texts().entrySet()) {
				ItemTextId id = new ItemTextId(i.id(), e.getKey().code());
				ItemText text = existingTexts.get(id);
				if (text == null) {
					itemTexts.save(new ItemText(id, e.getValue().name(), e.getValue().description(), now));
				}
				else {
					text.refresh(e.getValue().name(), e.getValue().description(), now);
				}
			}
		}
		existing.values().stream().filter(i -> !incoming.containsKey(i.getId())).forEach(i -> i.deactivate(now));
	}

}
