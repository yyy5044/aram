package com.aram.community.profile;

import com.aram.community.profile.ProfileResponse.Activity;
import com.aram.community.profile.ProfileResponse.Day;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** 활동 잔디: 한국 시간 날짜별로 글과 댓글 수를 세요. 기간은 53주(일요일 시작)예요. */
@Component
public class ActivityQuery {

	static final ZoneId KST = ZoneId.of("Asia/Seoul");

	private final JdbcTemplate jdbc;

	public ActivityQuery(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public Activity load(long userId, LocalDate todayKst) {
		LocalDate from = todayKst.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY)).minusWeeks(52);
		Timestamp since = Timestamp.from(from.atStartOfDay(KST).toInstant());
		Map<LocalDate, int[]> byDay = new TreeMap<>();
		count("posts", userId, since, byDay, 0);
		count("comments", userId, since, byDay, 1);
		List<Day> days = new ArrayList<>();
		byDay.forEach((date, c) -> {
			if (!date.isAfter(todayKst)) {
				days.add(new Day(date, c[0], c[1]));
			}
		});
		return new Activity(from, todayKst, days);
	}

	private void count(String table, long userId, Timestamp since, Map<LocalDate, int[]> byDay, int slot) {
		jdbc.query("select (created_at at time zone 'Asia/Seoul')::date as d, count(*) as n from " + table
				+ " where author_id = ? and created_at >= ? group by d", rs -> {
					LocalDate d = rs.getObject("d", LocalDate.class);
					byDay.computeIfAbsent(d, k -> new int[2])[slot] = rs.getInt("n");
				}, userId, since);
	}

}
