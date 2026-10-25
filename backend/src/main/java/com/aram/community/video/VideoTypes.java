package com.aram.community.video;

/** 파일 앞부분으로 영상 같은지 먼저 걸러요. 진짜 영상인지는 변환 전에 ffprobe가 다시 확인해요. */
public final class VideoTypes {

	public static final int HEADER_BYTES = 16;

	private VideoTypes() {
	}

	public static boolean looksLikeVideo(byte[] header) {
		if (header.length < 4) {
			return false;
		}
		boolean ebml = (header[0] & 0xFF) == 0x1A && (header[1] & 0xFF) == 0x45 && (header[2] & 0xFF) == 0xDF
				&& (header[3] & 0xFF) == 0xA3;
		boolean ftyp = header.length >= 8 && header[4] == 'f' && header[5] == 't' && header[6] == 'y' && header[7] == 'p';
		return ebml || ftyp;
	}

}
