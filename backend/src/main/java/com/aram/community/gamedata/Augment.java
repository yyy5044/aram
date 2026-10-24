package com.aram.community.gamedata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "augments")
public class Augment {

	@Id
	@Column(length = 80)
	private String id;

	@Column(name = "name_ko", nullable = false, length = 80)
	private String nameKo;

	@Column(name = "icon_path", nullable = false, length = 200)
	private String iconPath;

	@Column(nullable = false)
	private boolean active;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private AugmentRarity rarity;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected Augment() {
	}

	public Augment(String id, String nameKo, String iconPath, AugmentRarity rarity, Instant now) {
		this.id = id;
		this.nameKo = nameKo;
		this.iconPath = iconPath;
		this.rarity = rarity;
		this.active = true;
		this.updatedAt = now;
	}

	public void refresh(String nameKo, String iconPath, AugmentRarity rarity, Instant now) {
		this.nameKo = nameKo;
		this.iconPath = iconPath;
		this.rarity = rarity;
		this.active = true;
		this.updatedAt = now;
	}

	public void deactivate(Instant now) {
		if (active) {
			this.active = false;
			this.updatedAt = now;
		}
	}

	public String getId() {
		return id;
	}

	public String getNameKo() {
		return nameKo;
	}

	public String getIconPath() {
		return iconPath;
	}

	public boolean isActive() {
		return active;
	}

	public AugmentRarity getRarity() {
		return rarity;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

}
