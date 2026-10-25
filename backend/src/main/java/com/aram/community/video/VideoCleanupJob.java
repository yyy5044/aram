package com.aram.community.video;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** 글에 쓰이지 않은 영상은 하루 뒤에 지워요(사진과 같은 규칙). 실패한 영상도 같아요. */
@Component
public class VideoCleanupJob {

	private static final Logger log = LoggerFactory.getLogger(VideoCleanupJob.class);

	private final VideoRepository videos;

	private final VideoService videoService;

	public VideoCleanupJob(VideoRepository videos, VideoService videoService) {
		this.videos = videos;
		this.videoService = videoService;
	}

	@Scheduled(cron = "0 0 4 * * *")
	public void run() {
		int removed = cleanup(Instant.now());
		if (removed > 0) {
			log.info("Removed {} unused videos", removed);
		}
	}

	@Transactional
	public int cleanup(Instant now) {
		List<Video> stale = videos.findUnlinkedBefore(now.minus(Duration.ofHours(24)));
		videoService.deleteAll(stale);
		return stale.size();
	}

}
