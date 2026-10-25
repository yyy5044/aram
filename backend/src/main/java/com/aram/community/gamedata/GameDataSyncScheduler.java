package com.aram.community.gamedata;

import com.aram.community.gamedata.GameDataSyncService.SyncResult;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 서버가 켜질 때 한 번, 그 뒤로 6시간마다 게임 데이터를 확인해요. 실패하면 30분 뒤에 다시 해요. */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true")
public class GameDataSyncScheduler {

	private final GameDataSyncService sync;

	private final SyncTimer timer = new SyncTimer();

	public GameDataSyncScheduler(GameDataSyncService sync) {
		this.sync = sync;
	}

	@EventListener(ApplicationReadyEvent.class)
	public void onStartup() {
		timer.started();
		Thread.ofVirtual().name("gamedata-initial-sync").start(this::run);
	}

	@Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT5M")
	public void periodic() {
		if (timer.due(Instant.now())) {
			timer.started();
			run();
		}
	}

	private void run() {
		SyncResult result = SyncResult.FAILED;
		try {
			result = sync.sync();
		}
		finally {
			timer.record(result, Instant.now());
		}
	}

}
