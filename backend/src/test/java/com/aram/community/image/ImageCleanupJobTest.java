package com.aram.community.image;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.user.User;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class ImageCleanupJobTest extends ImageTestSupport {

	@Autowired
	ImageCleanupJob job;

	@Test
	void removesOnlyOldUnlinkedImages() throws Exception {
		User u = testUsers.create("양호");
		UUID oldUnlinked = upload(u);
		UUID freshUnlinked = upload(u);
		UUID oldLinked = upload(u);
		jdbc.update("update images set created_at = now() - interval '25 hours' where id in (?, ?)", oldUnlinked,
				oldLinked);
		long postId = jdbc.queryForObject("insert into posts (author_id, title, content, content_text, game_patch, created_at, updated_at) "
				+ "values (?, 't', '{}'::jsonb, 't', '26.21', now(), now()) returning id", Long.class, u.getId());
		jdbc.update("update images set post_id = ? where id = ?", postId, oldLinked);
		java.nio.file.Path oldFile = fileOf(oldUnlinked);

		int removed = job.cleanup(Instant.now());

		assertThat(removed).isEqualTo(1);
		assertThat(jdbc.queryForList("select id from images", UUID.class)).containsExactlyInAnyOrder(freshUnlinked,
				oldLinked);
		assertThat(java.nio.file.Files.exists(oldFile)).isFalse();
	}

}
