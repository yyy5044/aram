package com.aram.community.image;

import static com.aram.community.post.PostContentValidatorTest.doc;
import static com.aram.community.post.PostContentValidatorTest.image;
import static com.aram.community.post.PostContentValidatorTest.paragraph;
import static com.aram.community.post.PostContentValidatorTest.text;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.user.User;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

/** 프로필 사진은 정리 작업이나 글 삭제로 사라지면 안 돼요. */
class ProfileImageProtectionTest extends ImageTestSupport {

	@Autowired
	ImageCleanupJob job;

	User me;

	@BeforeEach
	void seed() {
		jdbc.update("insert into patches (ddragon_version, game_patch, released_order) values ('16.21.1','26.21',162101)");
		me = testUsers.create("하포");
	}

	void useAsProfile(UUID imageId) {
		jdbc.update("update users set profile_image_id = ? where id = ?", imageId, me.getId());
	}

	@Test
	void cleanupSkipsProfileImages() throws Exception {
		UUID photo = upload(me);
		useAsProfile(photo);
		jdbc.update("update images set created_at = now() - interval '25 hours'");
		Path file = fileOf(photo);

		int removed = job.cleanup(Instant.now());

		assertThat(removed).isZero();
		assertThat(Files.exists(file)).isTrue();
	}

	@Test
	void replacedProfileImageIsCleanedUp() throws Exception {
		UUID oldPhoto = upload(me);
		UUID newPhoto = upload(me);
		useAsProfile(newPhoto);
		jdbc.update("update images set created_at = now() - interval '25 hours'");

		int removed = job.cleanup(Instant.now());

		assertThat(removed).isEqualTo(1);
		assertThat(jdbc.queryForList("select id from images", UUID.class)).containsExactly(newPhoto);
		assertThat(oldPhoto).isNotEqualTo(newPhoto);
	}

	@Test
	void profileImageCannotGoIntoPostBody() throws Exception {
		UUID photo = upload(me);
		useAsProfile(photo);
		String body = "{\"title\":\"사진 글\",\"content\":" + doc(paragraph(text("내 사진")), image(photo))
				+ ",\"championIds\":[],\"augmentIds\":[],\"gamePatch\":\"26.21\"}";

		mockMvc.perform(post("/api/posts").with(testUsers.as(me)).contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.content").value("프로필 사진은 본문에 넣을 수 없어요"));
	}

}
