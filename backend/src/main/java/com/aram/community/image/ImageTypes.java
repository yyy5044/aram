package com.aram.community.image;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

/** 파일 앞부분 바이트로 실제 이미지 형식을 판별해요. 확장자나 브라우저가 보낸 형식은 믿지 않아요. */
public final class ImageTypes {

	public static final int HEADER_BYTES = 12;

	static final Map<String, String> EXTENSIONS = Map.of("image/jpeg", "jpg", "image/png", "png", "image/gif",
			"gif", "image/webp", "webp");

	private ImageTypes() {
	}

	public static Optional<String> detect(byte[] head) {
		if (head == null || head.length < 3) {
			return Optional.empty();
		}
		if (u(head, 0) == 0xFF && u(head, 1) == 0xD8 && u(head, 2) == 0xFF) {
			return Optional.of("image/jpeg");
		}
		if (startsWith(head, new int[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })) {
			return Optional.of("image/png");
		}
		if (ascii(head, 0, "GIF87a") || ascii(head, 0, "GIF89a")) {
			return Optional.of("image/gif");
		}
		if (ascii(head, 0, "RIFF") && ascii(head, 8, "WEBP")) {
			return Optional.of("image/webp");
		}
		return Optional.empty();
	}

	private static int u(byte[] b, int i) {
		return b[i] & 0xFF;
	}

	private static boolean startsWith(byte[] b, int[] sig) {
		if (b.length < sig.length) {
			return false;
		}
		for (int i = 0; i < sig.length; i++) {
			if (u(b, i) != sig[i]) {
				return false;
			}
		}
		return true;
	}

	private static boolean ascii(byte[] b, int offset, String s) {
		byte[] sig = s.getBytes(StandardCharsets.US_ASCII);
		if (b.length < offset + sig.length) {
			return false;
		}
		for (int i = 0; i < sig.length; i++) {
			if (b[offset + i] != sig[i]) {
				return false;
			}
		}
		return true;
	}

}
