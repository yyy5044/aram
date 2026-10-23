package com.aram.community.gamedata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "patches")
public class Patch {

	@Id
	@Column(name = "ddragon_version", length = 20)
	private String ddragonVersion;

	@Column(name = "game_patch", nullable = false, length = 10)
	private String gamePatch;

	@Column(name = "released_order", nullable = false)
	private int releasedOrder;

	protected Patch() {
	}

	public Patch(String ddragonVersion, String gamePatch, int releasedOrder) {
		this.ddragonVersion = ddragonVersion;
		this.gamePatch = gamePatch;
		this.releasedOrder = releasedOrder;
	}

	public String getDdragonVersion() {
		return ddragonVersion;
	}

	public String getGamePatch() {
		return gamePatch;
	}

	public int getReleasedOrder() {
		return releasedOrder;
	}

}
