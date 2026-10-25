package com.aram.community.video;

/** 변환 실패. 메시지는 화면에 그대로 보여줄 문장이에요. */
public class TranscodeException extends Exception {

	public TranscodeException(String userMessage) {
		super(userMessage);
	}

}
