package com.aram.community.post;

/** 글 상세의 "내가 스크랩했는지" 조회. 구현은 scrap 패키지에 있어요. */
public interface ScrapLookup {

	boolean isScrapped(long postId, long userId);

}
