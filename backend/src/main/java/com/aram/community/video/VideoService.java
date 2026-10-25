package com.aram.community.video;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.image.ImageStorage;
import com.aram.community.user.User;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

/**
 * 영상 올리기 → 변환 줄 → 변환 → 저장. 원본은 tmpDir에 잠깐 두고, 변환이 끝나면(성공·실패 모두) 지워요.
 * 저장은 이미지 저장소의 videos/{id}.mp4, videos/{id}.jpg 키를 써요.
 */
@Service
public class VideoService {

	static final String RESTARTED = "서버가 다시 켜져서 변환이 멈췄어요. 다시 올려 주세요";

	/** 한 사람이 동시에 변환을 기다리게 할 수 있는 영상 수. 큰 원본이 쌓여 디스크가 차지 않게 해요. */
	static final int MAX_PENDING_PER_USER = 3;

	private static final EnumSet<VideoStatus> PENDING = EnumSet.of(VideoStatus.QUEUED, VideoStatus.PROCESSING);

	private static final Logger log = LoggerFactory.getLogger(VideoService.class);

	private final VideoRepository videos;

	private final ImageStorage storage;

	private final VideoTranscoder transcoder;

	private final VideoQueue queue;

	private final VideoProperties props;

	/** 이 서버가 켜진 시각. 그 전에 남은 변환·임시 파일만 정리해요(켜지는 사이에 들어온 올리기는 건드리지 않아요). */
	private final Instant startedAt = Instant.now();

	public VideoService(VideoRepository videos, ImageStorage storage, VideoTranscoder transcoder, VideoQueue queue,
			VideoProperties props) {
		this.videos = videos;
		this.storage = storage;
		this.transcoder = transcoder;
		this.queue = queue;
		this.props = props;
	}

	@Transactional
	public VideoStatusResponse upload(User uploader, MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new ApiException(ErrorCode.VIDEO_UNSUPPORTED);
		}
		if (file.getSize() > props.maxBytes()) {
			throw new ApiException(ErrorCode.VIDEO_TOO_LARGE);
		}
		byte[] header;
		try (InputStream in = file.getInputStream()) {
			header = in.readNBytes(VideoTypes.HEADER_BYTES);
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
		if (!VideoTypes.looksLikeVideo(header)) {
			throw new ApiException(ErrorCode.VIDEO_UNSUPPORTED);
		}
		if (videos.countByUploaderIdAndStatusIn(uploader.getId(), PENDING) >= MAX_PENDING_PER_USER) {
			throw new ApiException(ErrorCode.VIDEO_BUSY);
		}
		UUID id = UUID.randomUUID();
		Path source = source(id);
		Video video;
		try {
			Files.createDirectories(source.getParent());
			if (Files.getFileStore(source.getParent()).getUsableSpace() - file.getSize() < props.minFreeBytes()) {
				throw new ApiException(ErrorCode.VIDEO_NO_SPACE);
			}
			file.transferTo(source);
			video = videos.save(Video.queued(id, uploader.getId(), Instant.now()));
		}
		catch (IOException e) {
			deleteQuietly(source);
			throw new UncheckedIOException(e);
		}
		catch (RuntimeException e) {
			deleteQuietly(source);
			throw e;
		}
		afterCompletion(committed -> {
			if (committed) {
				queue.submit(() -> process(id));
			}
			else {
				deleteQuietly(source);
			}
		});
		return VideoStatusResponse.of(video);
	}

	@Transactional(readOnly = true)
	public VideoStatusResponse status(UUID id, long viewerId) {
		Video video = videos.findById(id)
			.filter(v -> v.getUploaderId() == viewerId)
			.orElseThrow(() -> new ApiException(ErrorCode.VIDEO_NOT_FOUND));
		return VideoStatusResponse.of(video);
	}

	/** 변환 줄이 불러요. 한 번에 하나만 돌아요. */
	void process(UUID id) {
		Path source = source(id);
		Path output = props.tmpDir().toAbsolutePath().resolve(id + ".mp4");
		Path poster = props.tmpDir().toAbsolutePath().resolve(id + ".jpg");
		try {
			Video video = videos.findById(id).orElse(null);
			if (video == null || video.getStatus() != VideoStatus.QUEUED) {
				return;
			}
			video.markProcessing();
			videos.save(video);
			long[] lastWrite = { 0 };
			VideoTranscoder.Result result = transcoder.transcode(source, output, poster, percent -> {
				long now = System.currentTimeMillis();
				if (now - lastWrite[0] >= 1000) {
					lastWrite[0] = now;
					videos.updateProgress(id, (short) percent);
				}
			});
			String videoKey = "videos/" + id + ".mp4";
			String posterKey = "videos/" + id + ".jpg";
			try (InputStream in = Files.newInputStream(output)) {
				storage.save(videoKey, in);
			}
			try (InputStream in = Files.newInputStream(poster)) {
				storage.save(posterKey, in);
			}
			long size = Files.size(output);
			finish(id, v -> v.markReady(videoKey, posterKey, result, size));
		}
		catch (TranscodeException e) {
			finish(id, v -> v.markFailed(e.getMessage()));
		}
		catch (RuntimeException | IOException e) {
			log.error("Video {} failed to process", id, e);
			finish(id, v -> v.markFailed(FfmpegVideoTranscoder.FAILED));
		}
		finally {
			deleteQuietly(source);
			deleteQuietly(output);
			deleteQuietly(poster);
		}
	}

	private void finish(UUID id, java.util.function.Consumer<Video> change) {
		videos.findById(id).ifPresent(v -> {
			change.accept(v);
			videos.save(v);
		});
	}

	@Transactional(readOnly = true)
	public Path servedFile(UUID id) {
		return readyPath(id, Video::getStorageKey);
	}

	@Transactional(readOnly = true)
	public Path posterFile(UUID id) {
		return readyPath(id, Video::getPosterKey);
	}

	private Path readyPath(UUID id, java.util.function.Function<Video, String> key) {
		Video video = videos.findById(id)
			.filter(v -> v.getStatus() == VideoStatus.READY)
			.orElseThrow(() -> new ApiException(ErrorCode.VIDEO_NOT_FOUND));
		return storage.path(key.apply(video)).orElseThrow(() -> new ApiException(ErrorCode.VIDEO_NOT_FOUND));
	}

	/** 행과 파일을 함께 지워요. 파일은 DB가 커밋된 뒤에 지워서, 되돌려진 삭제가 파일만 잃는 일이 없게 해요. */
	@Transactional
	public void deleteAll(List<Video> targets) {
		if (targets.isEmpty()) {
			return;
		}
		videos.deleteAll(targets);
		List<String> keys = targets.stream()
			.flatMap(v -> Stream.of(v.getStorageKey(), v.getPosterKey()))
			.filter(k -> k != null)
			.toList();
		afterCompletion(committed -> {
			if (committed) {
				keys.forEach(storage::delete);
			}
		});
	}

	/**
	 * 서버가 켜질 때, 이전 실행에서 멈춘 변환을 실패로 바꾸고 임시 폴더에 남은 파일(원본·만들다 만 결과)을 지워요.
	 * 이번 실행이 시작된 뒤에 들어온 올리기와 그 파일은 건드리지 않아요.
	 */
	@EventListener(ApplicationReadyEvent.class)
	public void failInterrupted() {
		List<Video> stuck = videos.findByStatusInAndCreatedAtBefore(PENDING, startedAt);
		for (Video v : stuck) {
			v.markFailed(RESTARTED);
		}
		videos.saveAll(stuck);
		Path dir = props.tmpDir().toAbsolutePath();
		if (!Files.isDirectory(dir)) {
			return;
		}
		try (Stream<Path> files = Files.list(dir)) {
			files.filter(Files::isRegularFile).filter(this::leftFromBefore).forEach(VideoService::deleteQuietly);
		}
		catch (IOException e) {
			log.warn("Could not clean {}", dir, e);
		}
	}

	private boolean leftFromBefore(Path file) {
		try {
			return Files.getLastModifiedTime(file).toInstant().isBefore(startedAt);
		}
		catch (IOException e) {
			return false;
		}
	}

	private Path source(UUID id) {
		return props.tmpDir().toAbsolutePath().resolve(id + ".src");
	}

	private static void deleteQuietly(Path file) {
		try {
			Files.deleteIfExists(file);
		}
		catch (IOException e) {
			log.warn("Could not delete {}", file, e);
		}
	}

	private static void afterCompletion(java.util.function.Consumer<Boolean> action) {
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCompletion(int status) {
					action.accept(status == STATUS_COMMITTED);
				}
			});
		}
		else {
			action.accept(true);
		}
	}

}
