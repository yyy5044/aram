package com.aram.community.gamedata;

import com.aram.community.gamedata.GameDataSyncService.SyncResult;
import java.time.Duration;
import java.time.Instant;

/** 다음 동기화 시각을 정해요. 확인에 성공하면 6시간 뒤, 실패하면 30분 뒤에 다시 해요. */
final class SyncTimer {

	static final Duration NORMAL = Duration.ofHours(6);

	static final Duration RETRY = Duration.ofMinutes(30);

	private Instant next = Instant.MIN;

	/** 동기화를 시작했어요. 끝날 때까지는 다시 하지 않아요. */
	synchronized void started() {
		next = Instant.MAX;
	}

	synchronized void record(SyncResult result, Instant now) {
		next = now.plus(result == SyncResult.FAILED ? RETRY : NORMAL);
	}

	synchronized boolean due(Instant now) {
		return !now.isBefore(next);
	}

}
