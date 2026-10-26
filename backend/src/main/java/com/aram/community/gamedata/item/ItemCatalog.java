package com.aram.community.gamedata.item;

import com.aram.community.gamedata.ItemTier;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import tools.jackson.databind.JsonNode;

/**
 * 증강 칼바람(KIWI) 상점에서 살 수 있는 아이템을 게임 자료에서 골라내고, 단계와 총가격을 계산해요. 자료를 받는 일은 하지 않는
 * 순수한 함수 모음이에요.
 */
public final class ItemCatalog {

	private static final String KIWI_MODE = "Maps/Shipping/Map12/Modes/KIWI";

	private ItemCatalog() {
	}

	/** 상점 아이템 하나. fromIds는 재료 번호로, 자료에 적힌 순서와 중복을 그대로 둬요. */
	public record Entry(int id, JsonNode data, ItemTier tier, int priceTotal, List<Integer> fromIds,
			List<String> categories) {
	}

	/** map12 자료에서 KIWI 모드의 아이템 목록들을 합친 번호 집합이에요. */
	public static Set<Integer> kiwiItemIds(Map<String, JsonNode> map12) {
		Set<Integer> ids = new HashSet<>();
		JsonNode mode = map12.get(KIWI_MODE);
		if (mode == null) {
			return ids;
		}
		for (JsonNode listKey : mode.path("itemLists")) {
			JsonNode list = map12.get(listKey.asString(""));
			if (list == null) {
				continue;
			}
			for (JsonNode ref : list.path("mItems")) {
				Integer id = idOf(ref.asString(""));
				if (id != null) {
					ids.add(id);
				}
			}
		}
		return ids;
	}

	/** 아이템 자료에서 `ItemData`만 골라 `itemID`로 모아요. */
	public static Map<Integer, JsonNode> itemsById(Map<String, JsonNode> itemsBin) {
		Map<Integer, JsonNode> items = new HashMap<>();
		for (JsonNode node : itemsBin.values()) {
			if ("ItemData".equals(node.path("__type").asString("")) && node.path("itemID").isNumber()) {
				items.put(node.path("itemID").asInt(), node);
			}
		}
		return items;
	}

	/** 상점 번호 중 살 수 있는 것만 번호 순으로 돌려줘요. 자료에 없는 번호는 건너뛰어요. */
	public static List<Entry> build(Set<Integer> shopIds, Map<Integer, JsonNode> items) {
		Map<Integer, Integer> totals = new HashMap<>();
		List<Entry> entries = new ArrayList<>();
		for (int id : new TreeSet<>(shopIds)) {
			JsonNode item = items.get(id);
			if (item == null || !inStore(item) || item.has("mRequiredChampion")) {
				continue;
			}
			int total = totalPrice(id, items, totals, new HashSet<>());
			if (total <= 0) {
				continue;
			}
			entries.add(new Entry(id, item, tierOf(item), total, recipeIds(item), categoriesOf(item)));
		}
		return entries;
	}

	/**
	 * 단계를 정해요. epicness는 `ItemData` 최상위 값만 써요(`mItemDataClient.epicness`는 상점 묶음과 달라요).
	 */
	public static ItemTier tierOf(JsonNode item) {
		JsonNode epicnessNode = item.path("epicness");
		int epicness = epicnessNode.isNumber() ? epicnessNode.asInt() : 2;
		if (epicness == 8) {
			return ItemTier.AUGMENT_MODE;
		}
		if (hasCategory(item, "Boots")) {
			return ItemTier.BOOTS;
		}
		if (hasCategory(item, "Consumable") || epicness == 0 || epicness == 1 || epicness == 3) {
			return ItemTier.STARTER;
		}
		return switch (epicness) {
			case 7 -> ItemTier.AUGMENT_MODE;
			case 5 -> ItemTier.LEGENDARY;
			case 4 -> ItemTier.EPIC;
			default -> ItemTier.BASIC;
		};
	}

	/** 상점에 적혀 있다고 분명히 나온 것만 살 수 있어요(적혀 있지 않은 것은 상점 밖 아이템이에요). */
	private static boolean inStore(JsonNode item) {
		return item.path("mItemDataAvailability").path("mInStore").asBoolean(false);
	}

	/** 능력치 분류(`mCategories`). 자료 순서 그대로, 빈 값은 건너뛰어요. 없으면 빈 목록이에요. */
	public static List<String> categoriesOf(JsonNode item) {
		List<String> categories = new ArrayList<>();
		for (JsonNode category : item.path("mCategories")) {
			String name = category.asString("");
			if (!name.isEmpty()) {
				categories.add(name);
			}
		}
		return categories;
	}

	private static boolean hasCategory(JsonNode item, String name) {
		return categoriesOf(item).contains(name);
	}

	private static List<Integer> recipeIds(JsonNode item) {
		List<Integer> ids = new ArrayList<>();
		for (JsonNode link : item.path("recipeItemLinks")) {
			Integer id = idOf(link.asString(""));
			if (id != null) {
				ids.add(id);
			}
		}
		return ids;
	}

	/** 조합 가격 + 재료 총가격이에요. 자료에 없는 재료는 0골드로 쳐요. */
	private static int totalPrice(int id, Map<Integer, JsonNode> items, Map<Integer, Integer> memo, Set<Integer> path) {
		Integer known = memo.get(id);
		if (known != null) {
			return known;
		}
		JsonNode item = items.get(id);
		// path는 재료가 서로를 가리키는 잘못된 자료에서 무한히 도는 것을 막아요.
		if (item == null || !path.add(id)) {
			return 0;
		}
		int total = item.path("price").asInt(0);
		for (int ingredient : recipeIds(item)) {
			total += totalPrice(ingredient, items, memo, path);
		}
		path.remove(id);
		memo.put(id, total);
		return total;
	}

	/** `"Items/3084"` 같은 경로에서 번호를 꺼내요. */
	private static Integer idOf(String path) {
		int slash = path.lastIndexOf('/');
		try {
			return Integer.valueOf(path.substring(slash + 1));
		}
		catch (NumberFormatException e) {
			return null;
		}
	}

}
