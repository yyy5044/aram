package com.aram.community.gamedata;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/** 아이템의 언어별 이름과 수치가 채워진 설명. */
@Entity
@Table(name = "item_texts")
public class ItemText {

	@EmbeddedId
	private ItemTextId id;

	@Column(nullable = false, length = 80)
	private String name;

	@Column(nullable = false, columnDefinition = "text")
	private String description;

	protected ItemText() {
	}

	// item_texts에는 갱신 시각 칸이 없어서 now는 쓰지 않아요(설계 3.4). 증강 글과 호출 모양을 맞추려고 받아요.
	public ItemText(ItemTextId id, String name, String description, Instant now) {
		this.id = id;
		this.name = name;
		this.description = description;
	}

	public void refresh(String name, String description, Instant now) {
		this.name = name;
		this.description = description;
	}

	public ItemTextId getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getDescription() {
		return description;
	}

}
