package com.aram.community.image;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "images")
public class Image {

	@Id
	private UUID id;

	@Column(name = "uploader_id", nullable = false)
	private Long uploaderId;

	@Column(name = "post_id")
	private Long postId;

	@Column(name = "storage_key", nullable = false, length = 200)
	private String storageKey;

	@Column(name = "content_type", nullable = false, length = 40)
	private String contentType;

	@Column(name = "size_bytes", nullable = false)
	private int sizeBytes;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected Image() {
	}

	public Image(UUID id, long uploaderId, String storageKey, String contentType, int sizeBytes, Instant createdAt) {
		this.id = id;
		this.uploaderId = uploaderId;
		this.storageKey = storageKey;
		this.contentType = contentType;
		this.sizeBytes = sizeBytes;
		this.createdAt = createdAt;
	}

	public UUID getId() {
		return id;
	}

	public Long getUploaderId() {
		return uploaderId;
	}

	public Long getPostId() {
		return postId;
	}

	public String getStorageKey() {
		return storageKey;
	}

	public String getContentType() {
		return contentType;
	}

	public int getSizeBytes() {
		return sizeBytes;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

}
