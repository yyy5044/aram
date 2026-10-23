package com.aram.community.gamedata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class GamePatchesTest {

	@Test
	void convertsDdragonVersion() {
		assertThat(GamePatches.toGamePatch("16.21.1")).isEqualTo("26.21");
		assertThat(GamePatches.toGamePatch("15.3.1")).isEqualTo("25.3");
	}

	@Test
	void rejectsGarbage() {
		assertThatThrownBy(() -> GamePatches.toGamePatch("lolpatch_7.20"))
			.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void ordersNewerVersionsHigher() {
		assertThat(GamePatches.releasedOrder("16.21.1")).isGreaterThan(GamePatches.releasedOrder("16.20.1"));
		assertThat(GamePatches.releasedOrder("16.1.1")).isGreaterThan(GamePatches.releasedOrder("15.24.1"));
	}

}
