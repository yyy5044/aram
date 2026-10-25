package com.aram.community.video;

import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** 영상 변환 설정. ffmpeg·ffprobe는 PATH에서 찾고, 원본은 tmpDir에 잠깐 둬요. */
@ConfigurationProperties("app.videos")
public record VideoProperties(String ffmpegPath, String ffprobePath, Path tmpDir, long maxBytes) {

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
	}

}
