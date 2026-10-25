package com.aram.community.video;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.user.User;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class VideoCleanupJobTest extends VideoTestSupport {

	@Autowired
	VideoCleanupJob job;

	UUID saved(User owner, VideoStatus status) {
		UUID id = UUID.randomUUID();
		Video v = Video.queued(id, owner.getId(), Instant.now());
		if (status == VideoStatus.READY) {
			v.markReady("videos/" + id + ".mp4", "videos/" + id + ".jpg", new VideoTranscoder.Result(1, 1, 1, false), 1);
		}
		else if (status == VideoStatus.FAILED) {
			v.markFailed("x");
		}
		videos.save(v);
		return id;
	}

	@Test
	void removesOnlyOldUnlinkedVideos() {
		User u = testUsers.create("양호");
		UUID oldReady = saved(u, VideoStatus.READY);
		UUID oldFailed = saved(u, VideoStatus.FAILED);
		UUID fresh = saved(u, VideoStatus.READY);
		UUID oldLinked = saved(u, VideoStatus.READY);
		jdbc.update("update videos set created_at = now() - interval '25 hours' where id in (?, ?, ?)", oldReady, oldFailed,
				oldLinked);
		long postId = jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, created_at, updated_at) "
				+ "values (?, 't', '{}'::jsonb, 't', '26.21', now(), now()) returning id", Long.class, u.getId());
		jdbc.update("update videos set post_id = ? where id = ?", postId, oldLinked);
		jdbc.update("update videos set created_at = now() - interval '23 hours' where id = ?", fresh);

		int removed = job.cleanup(Instant.now());

		assertThat(removed).isEqualTo(2);
		assertThat(jdbc.queryForList("select id from videos", UUID.class)).containsExactlyInAnyOrder(fresh, oldLinked);
	}

}
