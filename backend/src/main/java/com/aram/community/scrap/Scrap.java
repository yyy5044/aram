package com.aram.community.scrap;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.time.Instant;

/** 사용자가 저장해 둔 글. 글이 지워지면 함께 지워져요(DB on delete cascade). */
@Entity
@Table(name = "scraps")
@IdClass(ScrapId.class)
public class Scrap {

	@Id
	@Column(name = "user_id")
	private Long userId;

	@Id
	@Column(name = "post_id")
	private Long postId;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected Scrap() {
	}

	public Long getUserId() {
		return userId;
	}

	public Long getPostId() {
		return postId;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

}
