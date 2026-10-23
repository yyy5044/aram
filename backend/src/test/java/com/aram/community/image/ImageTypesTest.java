package com.aram.community.image;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ImageTypesTest {

	static byte[] bytes(int... values) {
		byte[] b = new byte[values.length];
		for (int i = 0; i < values.length; i++) {
			b[i] = (byte) values[i];
		}
		return b;
	}

	@Test
	void detectsJpeg() {
		assertThat(ImageTypes.detect(bytes(0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0))).contains("image/jpeg");
	}

	@Test
	void detectsPng() {
		assertThat(ImageTypes.detect(bytes(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0)))
			.contains("image/png");
	}

	@Test
	void detectsGif() {
		assertThat(ImageTypes.detect("GIF89a......".getBytes(StandardCharsets.US_ASCII))).contains("image/gif");
		assertThat(ImageTypes.detect("GIF87a......".getBytes(StandardCharsets.US_ASCII))).contains("image/gif");
	}

	@Test
	void detectsWebp() {
		assertThat(ImageTypes.detect("RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.US_ASCII)))
			.contains("image/webp");
	}

	@Test
	void rejectsOtherBytes() {
		assertThat(ImageTypes.detect("hello world!".getBytes(StandardCharsets.US_ASCII))).isEmpty();
		assertThat(ImageTypes.detect(new byte[2])).isEmpty();
		assertThat(ImageTypes.detect("RIFF\0\0\0\0WAVEfmt ".getBytes(StandardCharsets.US_ASCII))).isEmpty();
	}

}
