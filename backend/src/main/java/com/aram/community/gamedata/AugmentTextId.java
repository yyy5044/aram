package com.aram.community.gamedata;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

/** 증강 id + 언어 코드(en, ko). */
@Embeddable
public class AugmentTextId implements Serializable {

	@Column(name = "augment_id", length = 80)
	private String augmentId;

	@Column(length = 10)
	private String locale;

	protected AugmentTextId() {
	}

	public AugmentTextId(String augmentId, String locale) {
		this.augmentId = augmentId;
		this.locale = locale;
	}

	public String augmentId() {
		return augmentId;
	}

	public String locale() {
		return locale;
	}

	@Override
	public boolean equals(Object o) {
		return o instanceof AugmentTextId other && augmentId.equals(other.augmentId) && locale.equals(other.locale);
	}

	@Override
	public int hashCode() {
		return Objects.hash(augmentId, locale);
	}

}
