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
	void augmentsIncludeRarity() throws Exception {
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at, rarity) values "
				+ "('ARAM_GiantSlayer', '거인 학살자', 'gs.png', true, now(), 'PRISMATIC')");
		mockMvc.perform(get("/api/augments"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].rarity").value("PRISMATIC"));
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

	private void seedTexts() {
		jdbc.update("insert into augments (id, name_ko, icon_path, large_icon_path, active, updated_at, rarity) values "
				+ "('OminousPact', '불길한 서약', 's.png', 'assets/ux/cherry/augments/icons/wisdomofages_large.png', true, now(), 'PRISMATIC')");
		jdbc.update("insert into augment_texts (augment_id, locale, name, description, updated_at) values "
				+ "('OminousPact', 'en', 'Ominous Pact', 'Gain <magicDamage>75~150 AP</magicDamage>', now()), "
				+ "('OminousPact', 'ko', '불길한 서약', '<magicDamage>주문력 75~150</magicDamage>', now())");
	}

	@Test
	void detailWithTranslation() throws Exception {
		seedTexts();
		mockMvc.perform(get("/api/augments/OminousPact").param("lang", "ko"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value("OminousPact"))
			.andExpect(jsonPath("$.rarity").value("PRISMATIC"))
			.andExpect(jsonPath("$.iconUrl").value(
					"https://raw.communitydragon.org/latest/game/assets/ux/cherry/augments/icons/wisdomofages_large.png"))
			.andExpect(jsonPath("$.original.locale").value("en"))
			.andExpect(jsonPath("$.original.name").value("Ominous Pact"))
			.andExpect(jsonPath("$.translation.locale").value("ko"))
			.andExpect(jsonPath("$.translation.description").value("<magicDamage>주문력 75~150</magicDamage>"));
	}

	@Test
	void detailSameLanguageHasNullTranslation() throws Exception {
		seedTexts();
		mockMvc.perform(get("/api/augments/OminousPact").param("lang", "en"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.original.name").value("Ominous Pact"))
			.andExpect(jsonPath("$.translation").value(org.hamcrest.Matchers.nullValue()));
		mockMvc.perform(get("/api/augments/OminousPact"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.translation").value(org.hamcrest.Matchers.nullValue()));
		mockMvc.perform(get("/api/augments/OminousPact").param("lang", "xx"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.translation").value(org.hamcrest.Matchers.nullValue()));
	}

	@Test
	void detailMissingLocaleRowIsNull() throws Exception {
		seedTexts();
		jdbc.update("delete from augment_texts where locale = 'ko'");
		mockMvc.perform(get("/api/augments/OminousPact").param("lang", "ko"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.original.name").value("Ominous Pact"))
			.andExpect(jsonPath("$.translation").value(org.hamcrest.Matchers.nullValue()));
	}

	@Test
	void detailUnknownAugmentIs404() throws Exception {
		mockMvc.perform(get("/api/augments/Nope").param("lang", "ko"))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("AUGMENT_NOT_FOUND"))
			.andExpect(jsonPath("$.message").value("없는 증강이에요"));
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
