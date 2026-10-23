package com.aram.community.image;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.user.User;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImageService {

	public static final long MAX_BYTES = 10L * 1024 * 1024;

	private static final Logger log = LoggerFactory.getLogger(ImageService.class);

	public record Uploaded(UUID id, String url) {
	}

	public record Served(String contentType, InputStream data) {
	}

	private final ImageRepository images;

	private final ImageStorage storage;

	public ImageService(ImageRepository images, ImageStorage storage) {
		this.images = images;
		this.storage = storage;
	}

	@Transactional
	public Uploaded upload(User uploader, MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new ApiException(ErrorCode.UNSUPPORTED_IMAGE);
		}
		if (file.getSize() > MAX_BYTES) {
			throw new ApiException(ErrorCode.IMAGE_TOO_LARGE);
		}
		byte[] bytes;
		try {
			bytes = file.getBytes();
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
		String contentType = ImageTypes.detect(Arrays.copyOf(bytes, Math.min(bytes.length, ImageTypes.HEADER_BYTES)))
			.orElseThrow(() -> new ApiException(ErrorCode.UNSUPPORTED_IMAGE));
		UUID id = UUID.randomUUID();
		String key = id + "." + ImageTypes.EXTENSIONS.get(contentType);
		storage.save(key, new ByteArrayInputStream(bytes));
		afterRollback(() -> storage.delete(key));
		images.save(new Image(id, uploader.getId(), key, contentType, bytes.length, Instant.now()));
		return new Uploaded(id, "/api/images/" + id);
	}

	@Transactional(readOnly = true)
	public Served open(UUID id) {
		Image image = images.findById(id).orElseThrow(() -> new ApiException(ErrorCode.IMAGE_NOT_FOUND));
		InputStream data = storage.open(image.getStorageKey())
			.orElseThrow(() -> new ApiException(ErrorCode.IMAGE_NOT_FOUND));
		return new Served(image.getContentType(), data);
	}

	/** DB 행은 지금 지우고, 파일은 트랜잭션이 커밋된 뒤에 지워요. 파일이 이미 없어도 괜찮아요. */
	@Transactional
	public void deleteAll(List<Image> targets) {
		if (targets.isEmpty()) {
			return;
		}
		List<String> keys = targets.stream().map(Image::getStorageKey).toList();
		images.deleteAllInBatch(targets);
		afterCommit(() -> keys.forEach(this::deleteFileQuietly));
	}

	/** 파일이 사용 중이라 못 지워도 이미 끝난 삭제를 실패로 만들지 않고, 나머지 파일은 계속 지워요. */
	private void deleteFileQuietly(String key) {
		try {
			storage.delete(key);
		}
		catch (RuntimeException e) {
			log.warn("Could not delete image file {}: {}", key, e.toString());
		}
	}

	private static void afterCommit(Runnable action) {
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					action.run();
				}
			});
		}
		else {
			action.run();
		}
	}

	private static void afterRollback(Runnable action) {
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCompletion(int status) {
					if (status == STATUS_ROLLED_BACK) {
						action.run();
					}
				}
			});
		}
	}

}
