package com.aram.community.video;

import java.nio.file.Path;
import java.util.function.IntConsumer;

/** 올린 영상을 글에 넣을 짧은 클립(MP4)과 첫 장면(JPEG)으로 바꿔요. */
public interface VideoTranscoder {

	/** progress에는 0~99가 늘어나는 순서로 들어와요. 끝(100)은 부르는 쪽이 정해요. */
	Result transcode(Path input, Path output, Path poster, IntConsumer progress) throws TranscodeException;

	record Result(int width, int height, int durationMs, boolean truncated) {
	}

}
