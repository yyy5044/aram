package com.aram.community.video;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

import com.aram.community.support.SampleVideos;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** 실제 ffmpeg로 변환해서 규격을 확인해요. */
class FfmpegVideoTranscoderTest {

	@TempDir
	Path dir;

	private final FfmpegVideoTranscoder transcoder = new FfmpegVideoTranscoder(
			new VideoProperties("ffmpeg", "ffprobe", null, 0, 0));

	private VideoTranscoder.Result transcode(Path input, List<Integer> progress) throws TranscodeException {
		return transcoder.transcode(input, dir.resolve("out.mp4"), dir.resolve("poster.jpg"), progress::add);
	}

	private static String probe(Path file, String entries) throws IOException, InterruptedException {
		Process p = new ProcessBuilder("ffprobe", "-v", "error", "-show_entries", entries, "-of", "csv=p=0", file.toString())
			.redirectErrorStream(true)
			.start();
		String out = new String(p.getInputStream().readAllBytes()).strip();
		p.waitFor(30, TimeUnit.SECONDS);
		return out;
	}

	@Test
	void landscapeBecomes720p24WithoutAudio() throws Exception {
		Path input = SampleVideos.make(dir, 1920, 1080, 60, 3, true);

		VideoTranscoder.Result r = transcode(input, new ArrayList<>());

		assertThat(r.width()).isEqualTo(1280);
		assertThat(r.height()).isEqualTo(720);
		assertThat(r.truncated()).isFalse();
		Path out = dir.resolve("out.mp4");
		assertThat(probe(out, "stream=codec_type")).isEqualTo("video");
		assertThat(probe(out, "stream=r_frame_rate")).isEqualTo("24/1");
		byte[] poster = Files.readAllBytes(dir.resolve("poster.jpg"));
		assertThat(poster[0] & 0xFF).isEqualTo(0xFF);
		assertThat(poster[1] & 0xFF).isEqualTo(0xD8);
	}

	@Test
	void longSourceKeepsFirst30SecondsWithRisingProgress() throws Exception {
		Path input = SampleVideos.make(dir, 640, 360, 24, 32, false);
		List<Integer> progress = new ArrayList<>();

		VideoTranscoder.Result r = transcode(input, progress);

		assertThat(r.truncated()).isTrue();
		assertThat(r.durationMs()).isBetween(29_800, 30_200);
		assertThat(r.width()).isEqualTo(640);
		assertThat(progress).isNotEmpty().allSatisfy(p -> assertThat(p).isBetween(0, 99)).isSorted();
	}

	@Test
	void portraitKeepsItsAspect() throws Exception {
		Path input = SampleVideos.make(dir, 1080, 1920, 30, 2, false);

		VideoTranscoder.Result r = transcode(input, new ArrayList<>());

		assertThat(r.height()).isEqualTo(720);
		assertThat(r.width()).isBetween(404, 406);
	}

	@Test
	void smallSourceKeepsItsSize() throws Exception {
		Path input = SampleVideos.make(dir, 320, 240, 30, 2, false);

		VideoTranscoder.Result r = transcode(input, new ArrayList<>());

		assertThat(r.width()).isEqualTo(320);
		assertThat(r.height()).isEqualTo(240);
	}

	@Test
	void sourceWithoutDurationStillConverts() throws Exception {
		Path input = SampleVideos.makeWithoutDuration(dir, 2);
		List<Integer> progress = new ArrayList<>();

		VideoTranscoder.Result r = transcode(input, progress);

		assertThat(probe(input, "format=duration")).isEqualTo("N/A");
		assertThat(r.durationMs()).isBetween(1_800, 2_200);
		assertThat(r.truncated()).isFalse();
		assertThat(progress).isEmpty();
	}

	@Test
	void rejectsNonVideo() throws Exception {
		Path text = Files.writeString(dir.resolve("note.mp4"), "hello, not a video");

		assertThatThrownBy(() -> transcode(text, new ArrayList<>())).isInstanceOf(TranscodeException.class)
			.hasMessage("영상 파일만 넣을 수 있어요");
	}

	@Test
	void missingFfmpegFails() throws Exception {
		Path input = SampleVideos.make(dir, 320, 240, 24, 1, false);
		FfmpegVideoTranscoder missing = new FfmpegVideoTranscoder(
				new VideoProperties("no-such-ffmpeg", "no-such-ffprobe", null, 0, 0));

		assertThatThrownBy(() -> missing.transcode(input, dir.resolve("o.mp4"), dir.resolve("p.jpg"), p -> {
		})).isInstanceOf(TranscodeException.class).hasMessage("변환 프로그램이 없어요");
	}

	@Test
	void damagedVideoWithLotsOfErrorsDoesNotHang() {
		Path input = SampleVideos.corrupt(SampleVideos.make(dir, 1280, 720, 60, 25, false), 3000, 42);

		// ffmpeg가 오류 출력을 많이 내도 막히지 않고 금방 끝나야 해요(줄을 3분씩 막으면 안 돼요).
		VideoTranscoder.Result r = assertTimeoutPreemptively(Duration.ofSeconds(60), () -> transcode(input, new ArrayList<>()));

		assertThat(r.width()).isEqualTo(1280);
	}

	@Test
	void rejectsHugerThan4K() throws Exception {
		Path input = SampleVideos.make(dir, 4000, 2400, 24, 1, false);

		assertThatThrownBy(() -> transcode(input, new ArrayList<>())).isInstanceOf(TranscodeException.class)
			.hasMessage("4K보다 큰 영상은 넣을 수 없어요");
	}

}
