package com.aram.community.gamedata;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.support.IntegrationTest;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ItemRepositoryTest extends IntegrationTest {

	@Autowired
	ItemRepository items;

	@Autowired
	ItemTextRepository texts;

	@Test
	void savesItemWithRecipeAndTexts() {
		items.saveAndFlush(new Item(3084, "심장강철", ItemTier.LEGENDARY, 3000, "3084.png",
				List.of(1011, 3801, 1011), List.of("Health", "HealthRegen"), Instant.now()));
		texts.save(new ItemText(new ItemTextId(3084, "ko"), "심장강철", "체력 +%…", Instant.now()));
		texts.save(new ItemText(new ItemTextId(3084, "en"), "Heartsteel", "Health +%…", Instant.now()));

		Item saved = items.findById(3084).orElseThrow();
		assertThat(saved.getNameKo()).isEqualTo("심장강철");
		assertThat(saved.getTier()).isEqualTo(ItemTier.LEGENDARY);
		assertThat(saved.getPriceTotal()).isEqualTo(3000);
		assertThat(saved.getIconFile()).isEqualTo("3084.png");
		assertThat(saved.isActive()).isTrue();
		// 재료는 순서와 중복을 그대로 돌려줘요.
		assertThat(saved.getFromIds()).containsExactly(1011, 3801, 1011);
		assertThat(saved.getCategories()).containsExactly("Health", "HealthRegen");
		assertThat(texts.findByIdItemId(3084)).extracting(t -> t.getId().locale())
			.containsExactlyInAnyOrder("ko", "en");
	}

	@Test
	void deactivateKeepsRow() {
		items.saveAndFlush(new Item(3865, "세계 지도", ItemTier.STARTER, 400, "3865.png", List.of(), List.of(),
				Instant.now()));

		Item item = items.findById(3865).orElseThrow();
		item.deactivate(Instant.now());
		items.saveAndFlush(item);

		Item reloaded = items.findById(3865).orElseThrow();
		assertThat(reloaded.isActive()).isFalse();
		assertThat(reloaded.getFromIds()).isEmpty();
	}

}
