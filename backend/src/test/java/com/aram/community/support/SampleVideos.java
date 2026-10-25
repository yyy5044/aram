package com.aram.community.support;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/** 테스트용 영상을 ffmpeg로 만들어요. 로컬과 CI 모두 ffmpeg가 PATH에 있어야 해요. */
public final class SampleVideos {

	private SampleVideos() {
	}

	/** 색 막대 화면(+선택적으로 삐 소리)의 MP4. */
	public static Path make(Path dir, int width, int height, int fps, int seconds, boolean audio) {
		Path out = dir.resolve("sample-%dx%d-%dfps-%ds%s.mp4".formatted(width, height, fps, seconds, audio ? "-a" : ""));
		List<String> cmd = new ArrayList<>(List.of("ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
				"testsrc2=size=%dx%d:rate=%d".formatted(width, height, fps)));
		if (audio) {
			cmd.addAll(List.of("-f", "lavfi", "-i", "sine=frequency=440"));
		}
		cmd.addAll(List.of("-t", String.valueOf(seconds), "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt",
				"yuv420p"));
		if (audio) {
			cmd.addAll(List.of("-c:a", "aac"));
		}
		cmd.add(out.toString());
		run(cmd);
		return out;
	}

	/** 길이 정보가 없는 영상(H.264 날 흐름, 소리 없음). ffprobe가 길이를 N/A로 알려줘요. */
	public static Path makeWithoutDuration(Path dir, int seconds) {
		Path out = dir.resolve("no-duration-%ds.h264".formatted(seconds));
		run(List.of("ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=320x240:rate=24", "-t",
				String.valueOf(seconds), "-c:v", "libx264", "-preset", "ultrafast", "-f", "h264", out.toString()));
		return out;
	}

	private static void run(List<String> cmd) {
		try {
			Process p = new ProcessBuilder(cmd).redirectError(ProcessBuilder.Redirect.DISCARD)
				.redirectOutput(ProcessBuilder.Redirect.DISCARD)
				.start();
			if (!p.waitFor(2, TimeUnit.MINUTES) || p.exitValue() != 0) {
				throw new IllegalStateException("ffmpeg failed: " + cmd);
			}
		}
		catch (IOException e) {
			throw new IllegalStateException("ffmpeg is required for video tests (install it and put it on PATH)", e);
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException(e);
		}
	}

}
