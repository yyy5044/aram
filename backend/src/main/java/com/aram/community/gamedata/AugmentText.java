package com.aram.community.gamedata;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/** 증강의 언어별 이름과 수치가 채워진 설명. */
@Entity
@Table(name = "augment_texts")
public class AugmentText {

	@EmbeddedId
	private AugmentTextId id;

	@Column(nullable = false, length = 120)
	private String name;

	@Column(nullable = false, columnDefinition = "text")
	private String description;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected AugmentText() {
	}

	public AugmentText(AugmentTextId id, String name, String description, Instant now) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.updatedAt = now;
	}

	public void refresh(String name, String description, Instant now) {
		this.name = name;
		this.description = description;
		this.updatedAt = now;
	}

	public AugmentTextId getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getDescription() {
		return description;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

}
