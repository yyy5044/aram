package com.aram.community.post;

import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** 하루 한 번 규칙에는 오늘·어제 조회 기록만 있으면 돼서, 그보다 오래된 기록을 매일 새벽 4시 30분에 지워요. 조회수 숫자는 그대로예요. */
@Component
public class PostViewCleanupJob {

	private static final Logger log = LoggerFactory.getLogger(PostViewCleanupJob.class);

	private final JdbcTemplate jdbc;

	public PostViewCleanupJob(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Scheduled(cron = "0 30 4 * * *", zone = "Asia/Seoul")
	public void run() {
		int removed = cleanup(PostViewCounter.kstDate(Instant.now()));
		if (removed > 0) {
			log.info("Removed {} old post view records", removed);
		}
	}

	@Transactional
	public int cleanup(LocalDate today) {
		return jdbc.update("delete from post_views where view_date < ?", Date.valueOf(today.minusDays(1)));
	}

}
