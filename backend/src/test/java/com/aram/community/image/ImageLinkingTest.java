package com.aram.community.image;

import static com.aram.community.post.PostContentValidatorTest.doc;
import static com.aram.community.post.PostContentValidatorTest.image;
import static com.aram.community.post.PostContentValidatorTest.paragraph;
import static com.aram.community.post.PostContentValidatorTest.text;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.user.User;
import com.jayway.jsonpath.JsonPath;
import java.nio.file.Files;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class ImageLinkingTest extends ImageTestSupport {

	User author;

	@BeforeEach
	void seed() {
		jdbc.update("insert into patches (ddragon_version, game_patch, released_order) values ('16.21.1','26.21',162101)");
		author = testUsers.create("양호");
	}

	static String body(String contentJson) {
		return "{\"title\":\"사진 글\",\"content\":" + contentJson + ",\"championIds\":[],\"augmentIds\":[],\"gamePatch\":\"26.21\"}";
	}

	ResultActions createPost(User user, String contentJson) throws Exception {
		return mockMvc.perform(post("/api/posts").with(testUsers.as(user))
			.contentType(MediaType.APPLICATION_JSON)
			.content(body(contentJson)));
	}

	long createdId(ResultActions result) throws Exception {
		return ((Number) JsonPath.read(result.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(),
				"$.id")).longValue();
	}

	Long postIdOf(UUID imageId) {
		return jdbc.queryForObject("select post_id from images where id = ?", Long.class, imageId);
	}

	@Test
	void postLinksOwnImages() throws Exception {
		UUID img = upload(author);

		long postId = createdId(createPost(author, doc(paragraph(text("스샷")), image(img))));

		assertThat(postIdOf(img)).isEqualTo(postId);
	}

	@Test
	void cannotUseSomeoneElsesImage() throws Exception {
		UUID othersImage = upload(testUsers.create("민수"));

		createPost(author, doc(paragraph(text("남의 사진")), image(othersImage))).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.content").value("올린 적 없는 이미지가 들어 있어요"));
	}

	@Test
	void cannotUseUnknownImageId() throws Exception {
		createPost(author, doc(paragraph(text("없는 사진")), image(UUID.randomUUID())))
			.andExpect(status().isBadRequest());
	}

	@Test
	void editUnlinksRemovedImages() throws Exception {
		UUID keep = upload(author);
		UUID drop = upload(author);
		long postId = createdId(createPost(author, doc(paragraph(text("두 장")), image(keep), image(drop))));

		mockMvc.perform(put("/api/posts/" + postId).with(testUsers.as(author))
			.contentType(MediaType.APPLICATION_JSON)
			.content(body(doc(paragraph(text("한 장")), image(keep))))).andExpect(status().isNoContent());

		assertThat(postIdOf(keep)).isEqualTo(postId);
		assertThat(postIdOf(drop)).isNull();
	}

	@Test
	void deletingPostDeletesImagesEvenIfFileMissing() throws Exception {
		UUID gone = upload(author);
		UUID present = upload(author);
		long postId = createdId(createPost(author, doc(paragraph(text("삭제될 글")), image(gone), image(present))));
		java.nio.file.Path presentFile = fileOf(present);
		deleteFileOnDisk(gone);

		mockMvc.perform(delete("/api/posts/" + postId).with(testUsers.as(author))).andExpect(status().isNoContent());

		assertThat(jdbc.queryForObject("select count(*) from images", Integer.class)).isZero();
		assertThat(Files.exists(presentFile)).isFalse();
	}

}
