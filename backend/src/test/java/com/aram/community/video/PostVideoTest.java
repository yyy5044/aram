package com.aram.community.video;

import static com.aram.community.post.PostContentValidatorTest.doc;
import static com.aram.community.post.PostContentValidatorTest.paragraph;
import static com.aram.community.post.PostContentValidatorTest.text;
import static com.aram.community.post.PostContentValidatorTest.video;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.image.ImageStorage;
import com.aram.community.user.User;
import com.jayway.jsonpath.JsonPath;
import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class PostVideoTest extends VideoTestSupport {

	@Autowired
	ImageStorage storage;

	User author;

	@BeforeEach
	void seed() {
		jdbc.update("insert into patches (ddragon_version, game_patch, released_order) values ('16.21.1','26.21',162101)");
		author = testUsers.create("양호");
	}

	/** 변환이 끝난 영상(파일 포함)을 바로 만들어요. */
	UUID readyVideo(User owner) {
		UUID id = UUID.randomUUID();
		storage.save("videos/" + id + ".mp4", new ByteArrayInputStream(new byte[] { 1, 2, 3 }));
		storage.save("videos/" + id + ".jpg", new ByteArrayInputStream(new byte[] { 4 }));
		Video v = Video.queued(id, owner.getId(), Instant.now());
		v.markReady("videos/" + id + ".mp4", "videos/" + id + ".jpg", new VideoTranscoder.Result(320, 240, 2000, false), 3);
		videos.save(v);
		return id;
	}

	static String body(String contentJson) {
		return "{\"title\":\"영상 글\",\"content\":" + contentJson + ",\"championIds\":[],\"augmentIds\":[],\"gamePatch\":\"26.21\"}";
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

	Long postIdOf(UUID videoId) {
		return jdbc.queryForObject("select post_id from videos where id = ?", Long.class, videoId);
	}

	@Test
	void postWithMyReadyVideoSaves() throws Exception {
		UUID clip = readyVideo(author);

		long postId = createdId(createPost(author, doc(paragraph(text("펜타킬")), video(clip))));

		assertThat(postIdOf(clip)).isEqualTo(postId);
		mockMvc.perform(get("/api/posts/" + postId))
			.andExpect(jsonPath("$.content.content[1].type").value("video"))
			.andExpect(jsonPath("$.content.content[1].attrs.src").value("/api/videos/" + clip));
	}

	@Test
	void clipOnlyPostSaves() throws Exception {
		UUID clip = readyVideo(author);

		long postId = createdId(createPost(author, doc(video(clip))));

		assertThat(postIdOf(clip)).isEqualTo(postId);
		mockMvc.perform(get("/api/posts/" + postId)).andExpect(jsonPath("$.content.content[0].type").value("video"));
	}

	@Test
	void othersVideoRejected() throws Exception {
		UUID clip = readyVideo(testUsers.create("민수"));

		createPost(author, doc(paragraph(text("남의 영상")), video(clip))).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.content").value("올린 적 없는 영상이 들어 있어요"));
	}

	@Test
	void processingVideoRejected() throws Exception {
		UUID clip = UUID.randomUUID();
		Video v = Video.queued(clip, author.getId(), Instant.now());
		v.markProcessing();
		videos.save(v);

		createPost(author, doc(paragraph(text("아직")), video(clip))).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.content").value("영상 변환이 끝나지 않았어요"));
	}

	@Test
	void removingVideoFromBodyUnlinks() throws Exception {
		UUID keep = readyVideo(author);
		UUID drop = readyVideo(author);
		long postId = createdId(createPost(author, doc(paragraph(text("둘")), video(keep), video(drop))));

		mockMvc.perform(put("/api/posts/" + postId).with(testUsers.as(author))
			.contentType(MediaType.APPLICATION_JSON)
			.content(body(doc(paragraph(text("하나")), video(keep))))).andExpect(status().is2xxSuccessful());

		assertThat(postIdOf(keep)).isEqualTo(postId);
		assertThat(postIdOf(drop)).isNull();
	}

	@Test
	void deletingPostDeletesVideoFiles() throws Exception {
		UUID clip = readyVideo(author);
		long postId = createdId(createPost(author, doc(paragraph(text("지울 글")), video(clip))));

		mockMvc.perform(delete("/api/posts/" + postId).with(testUsers.as(author))).andExpect(status().is2xxSuccessful());

		assertThat(videos.findById(clip)).isEmpty();
		assertThat(storage.path("videos/" + clip + ".mp4")).isEmpty();
		assertThat(storage.path("videos/" + clip + ".jpg")).isEmpty();
	}

}
