package com.aram.community.video;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class VideoTypesTest {

	private static byte[] bytes(int... values) {
		byte[] b = new byte[values.length];
		for (int i = 0; i < values.length; i++) {
			b[i] = (byte) values[i];
		}
		return b;
	}

	@Test
	void mp4AndMovHaveFtypBox() {
		assertThat(VideoTypes.looksLikeVideo(bytes(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D)))
			.isTrue();
	}

	@Test
	void webmAndMkvHaveEbmlHeader() {
		assertThat(VideoTypes.looksLikeVideo(bytes(0x1A, 0x45, 0xDF, 0xA3, 0x01, 0x00))).isTrue();
	}

	@Test
	void pngIsNotVideo() {
		assertThat(VideoTypes.looksLikeVideo(bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A))).isFalse();
	}

	@Test
	void tooShortIsNotVideo() {
		assertThat(VideoTypes.looksLikeVideo(bytes(0x1A, 0x45, 0xDF))).isFalse();
	}

}
