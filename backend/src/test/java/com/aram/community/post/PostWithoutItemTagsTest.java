package com.aram.community.post;

import static com.aram.community.post.PostContentValidatorTest.doc;
import static com.aram.community.post.PostContentValidatorTest.paragraph;
import static com.aram.community.post.PostContentValidatorTest.text;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

/** 아이템은 글 태그가 아니에요(설계 docs/superpowers/specs/2026-10-26-item-shop-design.md 7장). 본문 @ 아이템만 남아요. */
class PostWithoutItemTagsTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	User author;

	@BeforeEach
	void seed() {
		jdbc.update("insert into patches (ddragon_version, game_patch, released_order) values ('16.21.1','26.21',162101)");
		jdbc.update("insert into items (id, name_ko, tier, price_total, icon_file, from_ids, active, updated_at) values "
				+ "(3084, '굳건한 심장', 'LEGENDARY', 3000, '3084.png', '{}', true, now())");
		author = testUsers.create("양호");
	}

	long createWithItemIds() throws Exception {
		String response = mockMvc
			.perform(post("/api/posts").with(testUsers.as(author))
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"title\":\"아이템 글\",\"content\":" + doc(paragraph(text("강철심장 좋아요")))
						+ ",\"championIds\":[],\"augmentIds\":[],\"itemIds\":[\"3084\"],\"gamePatch\":\"26.21\"}"))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return ((Number) JsonPath.read(response, "$.id")).longValue();
	}

	@Test
	void itemIdsInRequestAreIgnored() throws Exception {
		createWithItemIds();
	}

	@Test
	void detailHasNoItems() throws Exception {
		long id = createWithItemIds();
		mockMvc.perform(get("/api/posts/" + id)).andExpect(status().isOk()).andExpect(jsonPath("$.items").doesNotExist());
	}

	@Test
	void listHasNoItems() throws Exception {
		createWithItemIds();
		mockMvc.perform(get("/api/posts"))
			.andExpect(jsonPath("$.items[0].title").value("아이템 글"))
			.andExpect(jsonPath("$.items[0].items").doesNotExist());
	}

	@Test
	void itemQueryParamIsIgnored() throws Exception {
		createWithItemIds();
		createWithItemIds();
		mockMvc.perform(get("/api/posts?item=3084")).andExpect(jsonPath("$.totalItems").value(2));
		mockMvc.perform(get("/api/posts?item=1")).andExpect(jsonPath("$.totalItems").value(2));
	}

	@Test
	void tagCountsHaveNoItems() throws Exception {
		createWithItemIds();
		mockMvc.perform(get("/api/tag-counts")).andExpect(status().isOk()).andExpect(jsonPath("$.items").doesNotExist());
	}

}
