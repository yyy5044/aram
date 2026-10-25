package com.aram.community.profile;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** 프로필 머리, 통계, 활동. locked(비공개이고 본인이 아님)이면 stats와 activity는 null이에요. */
public record ProfileResponse(long id, String nickname, String avatarUrl, Instant joinedAt, boolean profilePublic,
		boolean mine, boolean locked, Stats stats, Activity activity) {

	/** receivedLikeCount: 이 사람이 쓴 글들이 받은 추천 수의 합. */
	public record Stats(long postCount, long commentCount, long scrapCount, long receivedLikeCount) {
	}

	/** from: 53주 전 일요일, to: 오늘(한국 시간). days에는 활동이 있는 날만 날짜순으로 들어가요. */
	public record Activity(LocalDate from, LocalDate to, List<Day> days) {
	}

	public record Day(LocalDate date, int posts, int comments) {
	}

}
