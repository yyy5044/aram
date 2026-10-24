package com.aram.community.gamedata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** 한 줄짜리 상태 테이블(id = 1): 현재 패치와 마지막 동기화 결과. */
@Entity
@Table(name = "game_data_state")
public class GameDataState {

	public static final int SINGLETON_ID = 1;

	@Id
	private Integer id;

	@Column(name = "current_ddragon_version", length = 20)
	private String currentDdragonVersion;

	@Column(name = "current_game_patch", length = 10)
	private String currentGamePatch;

	/** 마지막으로 받은 CommunityDragon 자료 버전(content-metadata.json의 version). */
	@Column(name = "current_cdragon_version", length = 120)
	private String currentCdragonVersion;

	@Column(name = "last_checked_at")
	private Instant lastCheckedAt;

	@Column(name = "last_synced_at")
	private Instant lastSyncedAt;

	@Column(name = "last_error", columnDefinition = "text")
	private String lastError;

	protected GameDataState() {
	}

	public static GameDataState empty() {
		GameDataState state = new GameDataState();
		state.id = SINGLETON_ID;
		return state;
	}

	public void markChecked(Instant now) {
		this.lastCheckedAt = now;
	}

	public void markSynced(String ddragonVersion, String gamePatch, String cdragonVersion, Instant now) {
		this.currentDdragonVersion = ddragonVersion;
		this.currentGamePatch = gamePatch;
		this.currentCdragonVersion = cdragonVersion;
		this.lastSyncedAt = now;
		this.lastError = null;
	}

	public void markFailed(String error) {
		this.lastError = error;
	}

	public Integer getId() {
		return id;
	}

	public String getCurrentDdragonVersion() {
		return currentDdragonVersion;
	}

	public String getCurrentGamePatch() {
		return currentGamePatch;
	}

	public String getCurrentCdragonVersion() {
		return currentCdragonVersion;
	}

	public Instant getLastCheckedAt() {
		return lastCheckedAt;
	}

	public Instant getLastSyncedAt() {
		return lastSyncedAt;
	}

	public String getLastError() {
		return lastError;
	}

}
