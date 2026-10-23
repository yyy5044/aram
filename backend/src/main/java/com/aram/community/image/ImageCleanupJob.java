package com.aram.community.image;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** 올렸지만 글에 쓰이지 않은 채 24시간이 지난 이미지를 매일 새벽 4시에 지워요. */
@Component
public class ImageCleanupJob {

	private static final Logger log = LoggerFactory.getLogger(ImageCleanupJob.class);

	private final ImageRepository images;

	private final ImageService imageService;

	public ImageCleanupJob(ImageRepository images, ImageService imageService) {
		this.images = images;
		this.imageService = imageService;
	}

	@Scheduled(cron = "0 0 4 * * *")
	public void run() {
		int removed = cleanup(Instant.now());
		if (removed > 0) {
			log.info("Removed {} unused images", removed);
		}
	}

	@Transactional
	public int cleanup(Instant now) {
		List<Image> stale = images.findUnlinkedBefore(now.minus(Duration.ofHours(24)));
		imageService.deleteAll(stale);
		return stale.size();
	}

}
