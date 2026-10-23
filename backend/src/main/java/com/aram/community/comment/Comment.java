package com.aram.community.comment;

import com.aram.community.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;

@Entity
@Table(name = "comments")
public class Comment {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "post_id", nullable = false)
	private Long postId;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "author_id", nullable = false)
	private User author;

	@Column(nullable = false, length = 1000)
	private String content;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected Comment() {
	}

	public Comment(long postId, User author, String content, Instant now) {
		this.postId = postId;
		this.author = author;
		this.content = content;
		this.createdAt = now;
		this.updatedAt = now;
	}

	public void edit(String content, Instant now) {
		this.content = content;
		this.updatedAt = now;
	}

	public boolean isEdited() {
		return Duration.between(createdAt, updatedAt).compareTo(Duration.ofSeconds(1)) > 0;
	}

	public Long getId() {
		return id;
	}

	public Long getPostId() {
		return postId;
	}

	public User getAuthor() {
		return author;
	}

	public String getContent() {
		return content;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

}
