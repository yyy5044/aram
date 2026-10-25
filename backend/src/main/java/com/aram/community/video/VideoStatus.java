package com.aram.community.video;

/** 영상 변환 단계. 올리면 QUEUED, 줄에서 꺼내면 PROCESSING, 끝나면 READY 또는 FAILED. */
public enum VideoStatus {

	QUEUED, PROCESSING, READY, FAILED

}
