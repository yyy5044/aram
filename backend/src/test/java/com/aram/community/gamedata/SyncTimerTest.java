package com.aram.community.gamedata;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.gamedata.GameDataSyncService.SyncResult;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class SyncTimerTest {

	static final Instant T = Instant.parse("2026-10-25T00:00:00Z");

	@Test
	void retriesSoonAfterAFailure() {
		SyncTimer timer = new SyncTimer();
		timer.record(SyncResult.FAILED, T);
		assertThat(timer.due(T.plus(Duration.ofMinutes(29)))).isFalse();
		assertThat(timer.due(T.plus(Duration.ofMinutes(30)))).isTrue();
	}

	@Test
	void waitsSixHoursAfterASuccessfulCheck() {
		SyncTimer timer = new SyncTimer();
		timer.record(SyncResult.UNCHANGED, T);
		assertThat(timer.due(T.plus(Duration.ofMinutes(30)))).isFalse();
		assertThat(timer.due(T.plus(Duration.ofHours(6)))).isTrue();
	}

	@Test
	void waitsWhileTheStartupSyncIsRunning() {
		SyncTimer timer = new SyncTimer();
		timer.started();
		assertThat(timer.due(T.plus(Duration.ofHours(1)))).isFalse();
	}

}
