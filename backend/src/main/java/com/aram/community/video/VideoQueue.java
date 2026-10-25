package com.aram.community.video;

import jakarta.annotation.PreDestroy;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.stereotype.Component;

/** 영상 변환 줄. 서버가 작아서 한 번에 하나씩만 변환하고, 나머지는 차례를 기다려요. */
@Component
public class VideoQueue {

	private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
		Thread t = new Thread(r, "video-transcode");
		t.setDaemon(true);
		return t;
	});

	public void submit(Runnable job) {
		executor.submit(job);
	}

	@PreDestroy
	void shutdown() {
		executor.shutdownNow();
	}

}
