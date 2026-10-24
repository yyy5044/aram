package com.aram.community.scrap;

import java.io.Serializable;
import java.util.Objects;

public class ScrapId implements Serializable {

	private Long userId;

	private Long postId;

	protected ScrapId() {
	}

	public ScrapId(Long userId, Long postId) {
		this.userId = userId;
		this.postId = postId;
	}

	@Override
	public boolean equals(Object o) {
		return o instanceof ScrapId other && Objects.equals(userId, other.userId) && Objects.equals(postId, other.postId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(userId, postId);
	}

}
