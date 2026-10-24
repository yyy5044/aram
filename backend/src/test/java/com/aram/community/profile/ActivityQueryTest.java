package com.aram.community.profile;

import static com.aram.community.profile.ProfileFixtures.KST;
import static com.aram.community.profile.ProfileFixtures.kst;
import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.profile.ProfileResponse.Activity;
import com.aram.community.profile.ProfileResponse.Day;
import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ActivityQueryTest extends IntegrationTest {

	@Autowired
	ActivityQuery query;

	@Autowired
	TestUsers testUsers;

	ProfileFixtures data;

	User me;

	@BeforeEach
	void seed() {
		data = new ProfileFixtures(jdbc);
		me = testUsers.create("하포");
	}

	@Test
	void groupsByKoreanDateAcrossMidnight() {
		LocalDate today = LocalDate.now(KST);
		LocalDate d = today.minusDays(3);
		long postId = data.post(me.getId(), "밤 11시 30분 글", kst(d, 23, 30));
		data.comment(me.getId(), postId, "자정 지나서 단 댓글", kst(d.plusDays(1), 0, 30));
		data.post(me.getId(), "다음 날 오전 글", kst(d.plusDays(1), 10, 0));

		Activity a = query.load(me.getId(), today);

		assertThat(a.days()).containsExactly(new Day(d, 1, 0), new Day(d.plusDays(1), 1, 1));
	}

	@Test
	void rangeIsFiftyThreeWeeksStartingSunday() {
		LocalDate today = LocalDate.now(KST);
		Activity a = query.load(me.getId(), today);

		LocalDate thisSunday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
		assertThat(a.to()).isEqualTo(today);
		assertThat(a.from().getDayOfWeek()).isEqualTo(DayOfWeek.SUNDAY);
		assertThat(ChronoUnit.WEEKS.between(a.from(), thisSunday)).isEqualTo(52);
	}

	@Test
	void excludesActivityBeforeTheRange() {
		LocalDate today = LocalDate.now(KST);
		Activity first = query.load(me.getId(), today);
		data.post(me.getId(), "범위 밖", kst(first.from().minusDays(1), 12, 0));
		data.post(me.getId(), "범위 첫날", kst(first.from(), 0, 5));

		assertThat(query.load(me.getId(), today).days()).containsExactly(new Day(first.from(), 1, 0));
	}

	@Test
	void countsOnlyThisUser() {
		LocalDate today = LocalDate.now(KST);
		User other = testUsers.create("민수");
		data.post(other.getId(), "남의 글", kst(today, 9, 0));

		assertThat(query.load(me.getId(), today).days()).isEmpty();
	}

}
