package com.aram.community.video;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.function.IntConsumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * ffmpeg로 변환해요. 규격: 앞 30초, 1280×720 안쪽(비율 유지), 24fps, 소리 없음, H.264 MP4. 첫 장면은 JPEG로 따로 남겨요.
 */
@Component
public class FfmpegVideoTranscoder implements VideoTranscoder {

	static final int MAX_SECONDS = 30;

	static final String NOT_VIDEO = "영상 파일만 넣을 수 있어요";

	static final String NO_FFMPEG = "변환 프로그램이 없어요";

	static final String FAILED = "변환하지 못했어요. 다른 파일을 올려 주세요";

	private static final long TIMEOUT_MINUTES = 3;

	private static final String FILTER = "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease"
			+ ":force_divisible_by=2,fps=24";

	private static final Logger log = LoggerFactory.getLogger(FfmpegVideoTranscoder.class);

	private final VideoProperties props;

	private final JsonMapper json = JsonMapper.builder().build();

	public FfmpegVideoTranscoder(VideoProperties props) {
		this.props = props;
	}

	@Override
	public Result transcode(Path input, Path output, Path poster, IntConsumer progress) throws TranscodeException {
		Probe source = probe(input);
		if (!source.hasVideo()) {
			throw new TranscodeException(NOT_VIDEO);
		}
		double target = source.seconds() > 0 ? Math.min(source.seconds(), MAX_SECONDS) : 0;
		run(List.of(props.ffmpegPath(), "-v", "error", "-nostats", "-y", "-i", input.toString(), "-t",
				String.valueOf(MAX_SECONDS), "-vf", FILTER, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
				"-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", "-threads", "2", "-progress",
				"pipe:1", output.toString()), target, progress);
		run(List.of(props.ffmpegPath(), "-v", "error", "-y", "-i", output.toString(), "-frames:v", "1", "-q:v", "4",
				poster.toString()), 0, p -> {
				});

		Probe result = probe(output);
		if (!result.hasVideo() || result.width() <= 0) {
			throw new TranscodeException(FAILED);
		}
		int durationMs = (int) Math.round(result.seconds() * 1000);
		boolean truncated = source.seconds() > 0 ? source.seconds() > MAX_SECONDS + 0.05 : durationMs >= 29_900;
		return new Result(result.width(), result.height(), durationMs, truncated);
	}

	private record Probe(boolean hasVideo, int width, int height, double seconds) {
	}

	private Probe probe(Path file) throws TranscodeException {
		Process process = start(List.of(props.ffprobePath(), "-v", "error", "-show_entries",
				"format=duration:stream=codec_type,width,height", "-of", "json", file.toString()));
		String out;
		try {
			out = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
			if (!process.waitFor(30, TimeUnit.SECONDS) || process.exitValue() != 0) {
				process.destroyForcibly();
				throw new TranscodeException(NOT_VIDEO);
			}
		}
		catch (IOException e) {
			throw new TranscodeException(FAILED);
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new TranscodeException(FAILED);
		}
		JsonNode root = json.readTree(out);
		double seconds = parseDouble(root.path("format").path("duration").asString(""));
		for (JsonNode stream : root.path("streams")) {
			if ("video".equals(stream.path("codec_type").asString(""))) {
				return new Probe(true, stream.path("width").asInt(0), stream.path("height").asInt(0), seconds);
			}
		}
		return new Probe(false, 0, 0, seconds);
	}

	/** ffmpeg를 돌리며 -progress 출력의 out_time_us로 진행률을 계산해요. target이 0이면(길이 모름) 알리지 않아요. */
	private void run(List<String> cmd, double target, IntConsumer progress) throws TranscodeException {
		Process process = start(cmd);
		Thread reader = Thread.ofVirtual().start(() -> readProgress(process, target, progress));
		try {
			if (!process.waitFor(TIMEOUT_MINUTES, TimeUnit.MINUTES)) {
				process.destroyForcibly();
				throw new TranscodeException(FAILED);
			}
			reader.join(5_000);
			if (process.exitValue() != 0) {
				log.warn("ffmpeg exited with {}: {}", process.exitValue(), errorTail(process));
				throw new TranscodeException(FAILED);
			}
		}
		catch (InterruptedException e) {
			process.destroyForcibly();
			Thread.currentThread().interrupt();
			throw new TranscodeException(FAILED);
		}
	}

	private static void readProgress(Process process, double target, IntConsumer progress) {
		int last = -1;
		try (BufferedReader in = new BufferedReader(
				new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
			String line;
			while ((line = in.readLine()) != null) {
				if (target <= 0 || !line.startsWith("out_time_us=")) {
					continue;
				}
				double done = parseDouble(line.substring("out_time_us=".length())) / 1_000_000;
				int percent = (int) Math.min(99, Math.max(0, done / target * 100));
				if (percent > last) {
					last = percent;
					progress.accept(percent);
				}
			}
		}
		catch (IOException e) {
			// 프로세스가 끝나면 스트림이 닫혀요.
		}
	}

	private static String errorTail(Process process) {
		try {
			List<String> lines = new ArrayList<>(
					new String(process.getErrorStream().readAllBytes(), StandardCharsets.UTF_8).lines().toList());
			return String.join("\n", lines.subList(Math.max(0, lines.size() - 20), lines.size()));
		}
		catch (IOException e) {
			return "";
		}
	}

	private static Process start(List<String> cmd) throws TranscodeException {
		try {
			return new ProcessBuilder(cmd).start();
		}
		catch (IOException e) {
			throw new TranscodeException(NO_FFMPEG);
		}
	}

	private static double parseDouble(String value) {
		try {
			return Double.parseDouble(value.strip());
		}
		catch (NumberFormatException e) {
			return 0;
		}
	}

}
