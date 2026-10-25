package com.aram.community.video;

/** 화면이 1초마다 묻는 변환 상태. url·posterUrl·width·height는 READY일 때만 있어요. */
public record VideoStatusResponse(String id, String status, int progress, boolean truncated, String url,
		String posterUrl, Integer width, Integer height, String errorMessage) {

	static VideoStatusResponse of(Video v) {
		boolean ready = v.getStatus() == VideoStatus.READY;
		String url = "/api/videos/" + v.getId();
		return new VideoStatusResponse(v.getId().toString(), v.getStatus().name(), v.getProgress(), v.isTruncated(),
				ready ? url : null, ready ? url + "/poster" : null, ready ? v.getWidth() : null,
				ready ? v.getHeight() : null, v.getErrorMessage());
	}

}
