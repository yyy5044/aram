package com.aram.community.gamedata;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import org.junit.jupiter.api.Test;

class GameDataControllerTest extends IntegrationTest {

	private void seed() {
		jdbc.update("insert into game_data_state (id, current_ddragon_version, current_game_patch) values (1, '16.21.1', '26.21')");
		jdbc.update("insert into champions (id, name_ko, image_file) values ('Jinx', '징크스', 'Jinx.png'), ('Amumu', '아무무', 'Amumu.png')");
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at) values "
				+ "('ARAM_LegDay', '하체 운동의 날', 'assets/ux/cherry/augments/icons/legday_small.png', true, now()), "
				+ "('Old', '옛 증강', 'x.png', false, now())");
		for (int minor = 13; minor <= 21; minor++) {
			jdbc.update("insert into patches (ddragon_version, game_patch, released_order) values (?, ?, ?)",
					"16." + minor + ".1", "26." + minor, minor);
		}
	}

	@Test
	void listsChampionsByName() throws Exception {
		seed();
		mockMvc.perform(get("/api/champions"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0].id").value("Amumu"))
			.andExpect(jsonPath("$[0].nameKo").value("아무무"))
			.andExpect(jsonPath("$[0].imageUrl")
				.value("https://ddragon.leagueoflegends.com/cdn/16.21.1/img/champion/Amumu.png"));
	}

	@Test
	void listsAugmentsIncludingInactive() throws Exception {
		seed();
		mockMvc.perform(get("/api/augments"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[?(@.id == 'Old')].active").value(false))
			.andExpect(jsonPath("$[?(@.id == 'ARAM_LegDay')].iconUrl").value(
					"https://raw.communitydragon.org/latest/game/assets/ux/cherry/augments/icons/legday_small.png"));
	}

	@Test
	void patchesReturnsCurrentAndTopEight() throws Exception {
		seed();
		mockMvc.perform(get("/api/patches"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.current").value("26.21"))
			.andExpect(jsonPath("$.patches.length()").value(8))
			.andExpect(jsonPath("$.patches[0]").value("26.21"))
			.andExpect(jsonPath("$.patches[7]").value("26.14"));
	}

	@Test
	void emptyStateIsSafe() throws Exception {
		mockMvc.perform(get("/api/champions")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
		mockMvc.perform(get("/api/patches"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.current").doesNotExist())
			.andExpect(jsonPath("$.patches.length()").value(0));
	}

}
