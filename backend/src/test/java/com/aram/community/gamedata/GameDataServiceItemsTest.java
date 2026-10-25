package com.aram.community.gamedata;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.support.IntegrationTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class GameDataServiceItemsTest extends IntegrationTest {

	@Autowired
	private GameDataService gameData;

	@Autowired
	private ItemRepository items;

	private void seed() {
		jdbc.update("insert into game_data_state (id, current_ddragon_version, current_game_patch) values (1, '16.21.1', '26.21')");
		jdbc.update("insert into items (id, name_ko, tier, price_total, icon_file, from_ids, active, updated_at) values "
				+ "(1011, '거인의 허리띠', 'BASIC', 900, '1011.png', '{}', true, now()), "
				+ "(3084, '굳건한 심장', 'LEGENDARY', 3000, '3084.png', '{1011,1011}', true, now()), "
				+ "(3083, '워모그의 갑옷', 'LEGENDARY', 3000, '3083.png', '{1011}', true, now()), "
				+ "(9999, '옛 아이템', 'EPIC', 2000, '9999.png', '{1011}', false, now())");
	}

	@Test
	void toDtosMapsSeveralItemsInGivenOrderWithIntoIds() {
		seed();
		List<Item> given = List.of(items.findById(3084).orElseThrow(), items.findById(1011).orElseThrow(),
				items.findById(9999).orElseThrow());

		List<ItemDto> dtos = gameData.toDtos(given);

		assertThat(dtos).extracting(ItemDto::id).containsExactly("3084", "1011", "9999");
		assertThat(dtos.get(0).intoIds()).isEmpty();
		assertThat(dtos.get(0).fromIds()).containsExactly("1011", "1011");
		// 활성 아이템만, 중복 없이
		assertThat(dtos.get(1).intoIds()).containsExactlyInAnyOrder("3083", "3084");
		assertThat(dtos.get(2).active()).isFalse();
		assertThat(dtos.get(2).intoIds()).isEmpty();
		assertThat(gameData.toDto(items.findById(1011).orElseThrow()).intoIds())
			.containsExactlyInAnyOrder("3083", "3084");
		assertThat(gameData.toDtos(List.of())).isEmpty();
	}

}
