package com.aram.community.gamedata;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

/** 아이템 id + 언어 코드(en, ko). */
@Embeddable
public class ItemTextId implements Serializable {

	@Column(name = "item_id")
	private int itemId;

	@Column(length = 5)
	private String locale;

	protected ItemTextId() {
	}

	public ItemTextId(int itemId, String locale) {
		this.itemId = itemId;
		this.locale = locale;
	}

	public int itemId() {
		return itemId;
	}

	public String locale() {
		return locale;
	}

	@Override
	public boolean equals(Object o) {
		return o instanceof ItemTextId other && itemId == other.itemId && locale.equals(other.locale);
	}

	@Override
	public int hashCode() {
		return Objects.hash(itemId, locale);
	}

}
