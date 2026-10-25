package com.aram.community.post;

import static com.aram.community.post.PostContentValidatorTest.doc;
import static com.aram.community.post.PostContentValidatorTest.mention;
import static com.aram.community.post.PostContentValidatorTest.paragraph;
import static com.aram.community.post.PostContentValidatorTest.text;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/** 본문 속 챔피언·증강 박스는 실제로 있는 것만 저장돼요. */
class PostMentionTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	User author;

	@BeforeEach
	void seed() {
		jdbc.update("insert into patches (ddragon_version, game_patch, released_order) values ('16.21.1','26.21',162101)");
		jdbc.update("insert into champions (id, name_ko, image_file) values ('XinZhao', '신짜오', 'XinZhao.png')");
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at) values "
				+ "('StoneGuts', '거석상의 용기', 'a.png', true, now()), ('OldOne', '옛 증강', 'b.png', false, now())");
		author = testUsers.create("양호");
	}

	ResultActions create(String contentJson) throws Exception {
		return mockMvc.perform(post("/api/posts").with(testUsers.as(author))
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"title\":\"멘션\",\"content\":" + contentJson
					+ ",\"championIds\":[],\"augmentIds\":[],\"gamePatch\":\"26.21\"}"));
	}

	@Test
	void savesExistingChampionAndAugmentMentions() throws Exception {
		create(doc(paragraph(mention("champion", "XinZhao", "신짜오") + "," + text(" 는 ") + ","
				+ mention("augment", "StoneGuts", "거석상의 용기")))).andExpect(status().isCreated());
	}

	@Test
	void rejectsUnknownMention() throws Exception {
		create(doc(paragraph(mention("champion", "Nobody", "없는 챔피언")))).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.content").value("없는 챔피언·증강이 들어 있어요"));
	}

	@Test
	void acceptsInactiveAugmentMention() throws Exception {
		create(doc(paragraph(mention("augment", "OldOne", "옛 증강")))).andExpect(status().isCreated());
	}

}
