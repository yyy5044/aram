package com.aram.community.gamedata;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 서버가 켜질 때 한 번, 그 뒤로 6시간마다 게임 데이터를 확인해요. */
@Component
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true")
public class GameDataSyncScheduler {

	private final GameDataSyncService sync;

	public GameDataSyncScheduler(GameDataSyncService sync) {
		this.sync = sync;
	}

	@EventListener(ApplicationReadyEvent.class)
	public void onStartup() {
		Thread.ofVirtual().name("gamedata-initial-sync").start(sync::sync);
	}

	@Scheduled(fixedDelayString = "PT6H", initialDelayString = "PT6H")
	public void periodic() {
		sync.sync();
	}

}
