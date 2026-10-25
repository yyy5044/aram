package com.aram.community.gamedata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "items")
public class Item {

	/** 게임 아이템 번호. */
	@Id
	private Integer id;

	@Column(name = "name_ko", nullable = false, length = 80)
	private String nameKo;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private ItemTier tier;

	@Column(name = "price_total", nullable = false)
	private int priceTotal;

	@Column(name = "icon_file", nullable = false, length = 40)
	private String iconFile;

	/** 재료. 순서와 중복을 그대로 둬요. */
	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "from_ids", nullable = false)
	private List<Integer> fromIds;

	@Column(nullable = false)
	private boolean active;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected Item() {
	}

	public Item(int id, String nameKo, ItemTier tier, int priceTotal, String iconFile, List<Integer> fromIds,
			Instant now) {
		this.id = id;
		this.nameKo = nameKo;
		this.tier = tier;
		this.priceTotal = priceTotal;
		this.iconFile = iconFile;
		this.fromIds = List.copyOf(fromIds);
		this.active = true;
		this.updatedAt = now;
	}

	public void refresh(String nameKo, ItemTier tier, int priceTotal, String iconFile, List<Integer> fromIds,
			Instant now) {
		this.nameKo = nameKo;
		this.tier = tier;
		this.priceTotal = priceTotal;
		this.iconFile = iconFile;
		this.fromIds = List.copyOf(fromIds);
		this.active = true;
		this.updatedAt = now;
	}

	public void deactivate(Instant now) {
		if (active) {
			this.active = false;
			this.updatedAt = now;
		}
	}

	public Integer getId() {
		return id;
	}

	public String getNameKo() {
		return nameKo;
	}

	public ItemTier getTier() {
		return tier;
	}

	public int getPriceTotal() {
		return priceTotal;
	}

	public String getIconFile() {
		return iconFile;
	}

	public List<Integer> getFromIds() {
		return fromIds;
	}

	public boolean isActive() {
		return active;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

}
