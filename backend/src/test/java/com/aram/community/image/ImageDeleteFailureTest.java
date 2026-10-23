package com.aram.community.image;

import static com.aram.community.post.PostContentValidatorTest.doc;
import static com.aram.community.post.PostContentValidatorTest.image;
import static com.aram.community.post.PostContentValidatorTest.paragraph;
import static com.aram.community.post.PostContentValidatorTest.text;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.user.User;
import com.jayway.jsonpath.JsonPath;
import java.io.UncheckedIOException;
import java.nio.file.FileSystemException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

/** 파일이 사용 중이라 지우지 못해도, 이미 끝난 삭제가 오류로 보이거나 나머지 정리가 멈추면 안 돼요. */
class ImageDeleteFailureTest extends ImageTestSupport {

	@MockitoSpyBean
	ImageStorage storage;

	@Autowired
	ImageCleanupJob job;

	User author;

	@BeforeEach
	void seed() {
		jdbc.update("insert into patches (ddragon_version, game_patch, released_order) values ('16.21.1','26.21',162101)");
		author = testUsers.create("양호");
	}

	private void failDeleting(UUID imageId) {
		String key = jdbc.queryForObject("select storage_key from images where id = ?", String.class, imageId);
		doThrow(new UncheckedIOException(new FileSystemException(key + ": in use"))).when(storage)
			.delete(argThat(k -> k.equals(key)));
	}

	@Test
	void postDeletionSucceedsAndContinuesWhenOneFileCannotBeDeleted() throws Exception {
		UUID locked = upload(author);
		UUID other = upload(author);
		String body = "{\"title\":\"사진 글\",\"content\":" + doc(paragraph(text("두 장")), image(locked), image(other))
				+ ",\"championIds\":[],\"augmentIds\":[],\"gamePatch\":\"26.21\"}";
		long postId = ((Number) JsonPath.read(mockMvc
			.perform(post("/api/posts").with(testUsers.as(author)).contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString(), "$.id")).longValue();
		Path otherFile = fileOf(other);
		failDeleting(locked);

		mockMvc.perform(delete("/api/posts/" + postId).with(testUsers.as(author))).andExpect(status().isNoContent());

		assertThat(Files.exists(otherFile)).isFalse();
	}

	@Test
	void cleanupContinuesWhenOneFileCannotBeDeleted() throws Exception {
		UUID locked = upload(author);
		UUID other = upload(author);
		jdbc.update("update images set created_at = now() - interval '25 hours'");
		Path otherFile = fileOf(other);
		failDeleting(locked);

		int removed = job.cleanup(Instant.now());

		assertThat(removed).isEqualTo(2);
		assertThat(Files.exists(otherFile)).isFalse();
	}

}
