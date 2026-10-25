package com.aram.community.video;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "videos")
public class Video {

	@Id
	private UUID id;

	@Column(name = "uploader_id", nullable = false)
	private Long uploaderId;

	@Column(name = "post_id")
	private Long postId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private VideoStatus status;

	@Column(nullable = false)
	private short progress;

	@Column(name = "error_message", length = 200)
	private String errorMessage;

	@Column(nullable = false)
	private boolean truncated;

	@Column(name = "storage_key", length = 200)
	private String storageKey;

	@Column(name = "poster_key", length = 200)
	private String posterKey;

	private Integer width;

	private Integer height;

	@Column(name = "duration_ms")
	private Integer durationMs;

	@Column(name = "size_bytes")
	private Integer sizeBytes;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected Video() {
	}

	public static Video queued(UUID id, long uploaderId, Instant now) {
		Video v = new Video();
		v.id = id;
		v.uploaderId = uploaderId;
		v.status = VideoStatus.QUEUED;
		v.createdAt = now;
		return v;
	}

	public void markProcessing() {
		this.status = VideoStatus.PROCESSING;
	}

	public void markReady(String storageKey, String posterKey, VideoTranscoder.Result result, long size) {
		this.status = VideoStatus.READY;
		this.progress = 100;
		this.storageKey = storageKey;
		this.posterKey = posterKey;
		this.width = result.width();
		this.height = result.height();
		this.durationMs = result.durationMs();
		this.truncated = result.truncated();
		this.sizeBytes = (int) size;
	}

	public void markFailed(String message) {
		this.status = VideoStatus.FAILED;
		this.errorMessage = message;
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

	public VideoStatus getStatus() {
		return status;
	}

	public int getProgress() {
		return progress;
	}

	public String getErrorMessage() {
		return errorMessage;
	}

	public boolean isTruncated() {
		return truncated;
	}

	public String getStorageKey() {
		return storageKey;
	}

	public String getPosterKey() {
		return posterKey;
	}

	public Integer getWidth() {
		return width;
	}

	public Integer getHeight() {
		return height;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

}
