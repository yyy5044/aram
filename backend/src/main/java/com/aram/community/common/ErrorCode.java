package com.aram.community.common;

/** API 오류 코드. 메시지는 화면에 그대로 보여줄 수 있는 한국어 문장이에요. */
public enum ErrorCode {

	UNAUTHORIZED(401, "로그인이 필요해요"),
	FORBIDDEN(403, "권한이 없어요"),
	NICKNAME_REQUIRED(403, "닉네임을 먼저 정해주세요"),
	INVALID_INPUT(400, "입력값을 확인해주세요"),
	POST_NOT_FOUND(404, "글을 찾을 수 없어요"),
	COMMENT_NOT_FOUND(404, "댓글을 찾을 수 없어요"),
	IMAGE_NOT_FOUND(404, "이미지를 찾을 수 없어요"),
	NICKNAME_TAKEN(409, "이미 쓰고 있는 닉네임이에요"),
	NOT_FOUND(404, "찾을 수 없어요"),
	USER_NOT_FOUND(404, "사용자를 찾을 수 없어요"),
	PROFILE_PRIVATE(403, "비공개 프로필이에요"),
	IMAGE_TOO_LARGE(413, "이미지는 10MB 이하만 올릴 수 있어요"),
	UNSUPPORTED_IMAGE(400, "jpg, png, webp, gif 이미지만 올릴 수 있어요"),
	INTERNAL_ERROR(500, "잠시 후 다시 시도해주세요");

	private final int status;

	private final String message;

	ErrorCode(int status, String message) {
		this.status = status;
		this.message = message;
	}

	public int status() {
		return status;
	}

	public String message() {
		return message;
	}

}
