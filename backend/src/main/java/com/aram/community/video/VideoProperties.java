package com.aram.community.video;

import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 영상 변환 설정. ffmpeg·ffprobe는 PATH에서 찾고, 원본은 tmpDir에 잠깐 둬요.
 * minFreeBytes: 원본을 받은 뒤에도 이만큼 디스크가 남아야 올리기를 받아요(DB와 같은 디스크라서). 기본 5GB.
 */
@ConfigurationProperties("app.videos")
public record VideoProperties(String ffmpegPath, String ffprobePath, Path tmpDir, long maxBytes, long minFreeBytes) {

	public VideoProperties {
		if (ffmpegPath == null) {
			ffmpegPath = "ffmpeg";
		}
		if (ffprobePath == null) {
			ffprobePath = "ffprobe";
		}
		if (tmpDir == null) {
			tmpDir = Path.of("data/video-tmp");
		}
		if (maxBytes <= 0) {
			maxBytes = 200L * 1024 * 1024;
		}
		if (minFreeBytes <= 0) {
			minFreeBytes = 5L * 1024 * 1024 * 1024;
		}
	}

}
