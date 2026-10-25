package com.aram.community.gamedata.item;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.gamedata.ItemTier;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class ItemCatalogTest {

	static final JsonMapper MAPPER = JsonMapper.builder().build();

	static Map<String, JsonNode> load(String name) throws IOException {
		String text = new ClassPathResource("gamedata/" + name).getContentAsString(StandardCharsets.UTF_8);
		Map<String, JsonNode> result = new LinkedHashMap<>();
		MAPPER.readTree(text).properties().forEach(e -> result.put(e.getKey(), e.getValue()));
		return result;
	}

	static Map<Integer, JsonNode> items() throws IOException {
		return ItemCatalog.itemsById(load("items-small.cdtb.bin.json"));
	}

	static ItemCatalog.Entry entry(List<ItemCatalog.Entry> list, int id) {
		return list.stream().filter(e -> e.id() == id).findFirst().orElseThrow();
	}

	@Test
	void kiwiShopIncludesAramOnlyItems() throws IOException {
		Set<Integer> ids = ItemCatalog.kiwiItemIds(load("map12-small.bin.json"));

		assertThat(ids).contains(3084, 126697, 3112, 228002, 220008);
		assertThat(ids).doesNotContain(6697);
	}

	@Test
	void itemsByIdKeepsOnlyItemData() throws IOException {
		Map<Integer, JsonNode> items = items();

		assertThat(items).containsKeys(3084, 1011, 220008);
		assertThat(items.get(3084).path("price").asInt()).isEqualTo(400);
	}

	@Test
	void buildSkipsUnbuyableAndUnknown() throws IOException {
		Set<Integer> shop = Set.of(3084, 220008, 999999999);

		List<ItemCatalog.Entry> built = ItemCatalog.build(shop, items());

		assertThat(built).extracting(ItemCatalog.Entry::id).containsExactly(3084);
	}

	@Test
	void buildIsSortedByNumber() throws IOException {
		List<ItemCatalog.Entry> built = ItemCatalog.build(Set.of(228002, 3084, 1011, 126697), items());

		assertThat(built).extracting(ItemCatalog.Entry::id).containsExactly(1011, 3084, 126697, 228002);
	}

	@Test
	void heartsteelTotalPriceAndRecipe() throws IOException {
		List<ItemCatalog.Entry> built = ItemCatalog.build(Set.of(3084, 1011), items());

		ItemCatalog.Entry heartsteel = entry(built, 3084);
		assertThat(heartsteel.priceTotal()).isEqualTo(3000);
		assertThat(heartsteel.fromIds()).containsExactly(1011, 3801, 1011);
		assertThat(heartsteel.data().path("itemID").asInt()).isEqualTo(3084);
		assertThat(entry(built, 1011).priceTotal()).isEqualTo(900);
	}

	@Test
	void missingIngredientCostsNothing() throws IOException {
		Map<Integer, JsonNode> items = new LinkedHashMap<>(items());
		items.remove(1028);

		// 1011(500) 재료 1028이 자료에 없으면 그 재료는 0골드로 쳐요.
		assertThat(entry(ItemCatalog.build(Set.of(1011), items), 1011).priceTotal()).isEqualTo(500);
	}

	@Test
	void tiers() throws IOException {
		Map<Integer, JsonNode> items = items();

		assertThat(ItemCatalog.tierOf(items.get(3084))).isEqualTo(ItemTier.LEGENDARY);
		assertThat(ItemCatalog.tierOf(items.get(1011))).isEqualTo(ItemTier.EPIC);
		assertThat(ItemCatalog.tierOf(items.get(3006))).isEqualTo(ItemTier.BOOTS);
		assertThat(ItemCatalog.tierOf(items.get(1001))).isEqualTo(ItemTier.BOOTS);
		assertThat(ItemCatalog.tierOf(items.get(1036))).isEqualTo(ItemTier.BASIC);
		assertThat(ItemCatalog.tierOf(items.get(2003))).isEqualTo(ItemTier.STARTER);
		assertThat(ItemCatalog.tierOf(items.get(2138))).isEqualTo(ItemTier.STARTER);
		assertThat(ItemCatalog.tierOf(items.get(3070))).isEqualTo(ItemTier.STARTER);
		assertThat(ItemCatalog.tierOf(items.get(228002))).isEqualTo(ItemTier.AUGMENT_MODE);
		assertThat(ItemCatalog.tierOf(items.get(6032))).isEqualTo(ItemTier.AUGMENT_MODE);
	}

	@Test
	void builtEntriesCarryTier() throws IOException {
		List<ItemCatalog.Entry> built = ItemCatalog.build(Set.of(3084, 3006, 6032), items());

		assertThat(entry(built, 3084).tier()).isEqualTo(ItemTier.LEGENDARY);
		assertThat(entry(built, 3006).tier()).isEqualTo(ItemTier.BOOTS);
		assertThat(entry(built, 6032).tier()).isEqualTo(ItemTier.AUGMENT_MODE);
	}
}
