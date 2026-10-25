package com.aram.community.post;

import static com.aram.community.post.PostContentValidatorTest.doc;
import static com.aram.community.post.PostContentValidatorTest.paragraph;
import static com.aram.community.post.PostContentValidatorTest.text;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import com.aram.community.user.User;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/** 글에 아이템 태그를 붙이는 API: 저장, 한도, 없는·옛 아이템, 목록 필터, 태그별 글 수. */
class PostItemTagTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	User author;

	@BeforeEach
	void seed() {
		jdbc.update("insert into game_data_state (id, current_ddragon_version, current_game_patch) values (1, '16.21.1', '26.21')");
		jdbc.update("insert into patches (ddragon_version, game_patch, released_order) values ('16.21.1','26.21',162101)");
		jdbc.update("insert into items (id, name_ko, tier, price_total, icon_file, from_ids, active, updated_at) values "
				+ "(1011, '거인의 허리띠', 'BASIC', 900, '1011.png', '{}', true, now()), "
				+ "(3084, '굳건한 심장', 'LEGENDARY', 3000, '3084.png', '{1011,1011}', true, now()), "
				+ "(3083, '워모그의 갑옷', 'LEGENDARY', 3000, '3083.png', '{1011}', true, now()), "
				+ "(9999, '옛 아이템', 'EPIC', 2000, '9999.png', '{1011}', false, now())");
		author = testUsers.create("양호");
	}

	private static String quote(String s) {
		return "\"" + s + "\"";
	}

	static String body(List<String> itemIds) {
		return "{\"title\":\"아이템 글\",\"content\":" + doc(paragraph(text("이 아이템이 좋아요")))
				+ ",\"championIds\":[],\"augmentIds\":[],\"itemIds\":"
				+ itemIds.stream().map(PostItemTagTest::quote).collect(Collectors.joining(",", "[", "]"))
				+ ",\"gamePatch\":\"26.21\"}";
	}

	ResultActions create(List<String> itemIds) throws Exception {
		return mockMvc.perform(post("/api/posts").with(testUsers.as(author))
			.contentType(MediaType.APPLICATION_JSON)
			.content(body(itemIds)));
	}

	ResultActions edit(long id, List<String> itemIds) throws Exception {
		return mockMvc.perform(put("/api/posts/" + id).with(testUsers.as(author))
			.contentType(MediaType.APPLICATION_JSON)
			.content(body(itemIds)));
	}

	long createOk(List<String> itemIds) throws Exception {
		String response = create(itemIds).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
		return ((Number) JsonPath.read(response, "$.id")).longValue();
	}

	@Test
	void savesAndReturnsItems() throws Exception {
		long id = createOk(List.of("3084", "1011"));

		mockMvc.perform(get("/api/posts/" + id))
			.andExpect(status().isOk())
			// 이름순이라 "거인의 허리띠"가 "굳건한 심장"보다 앞이에요.
			.andExpect(jsonPath("$.items[0].id").value("1011"))
			.andExpect(jsonPath("$.items[1].id").value("3084"))
			.andExpect(jsonPath("$.items[1].nameKo").value("굳건한 심장"))
			.andExpect(jsonPath("$.items[1].fromIds[0]").value("1011"));
		mockMvc.perform(get("/api/posts"))
			.andExpect(jsonPath("$.items[0].items.length()").value(2))
			.andExpect(jsonPath("$.items[0].items[0].nameKo").value("거인의 허리띠"))
			.andExpect(jsonPath("$.items[0].items[1].iconUrl")
				.value("https://ddragon.leagueoflegends.com/cdn/16.21.1/img/item/3084.png"));
	}

	@Test
	void omittedItemIdsMeansNone() throws Exception {
		String json = "{\"title\":\"제목\",\"content\":" + doc(paragraph(text("본문"))) + ",\"gamePatch\":\"26.21\"}";
		String response = mockMvc
			.perform(post("/api/posts").with(testUsers.as(author)).contentType(MediaType.APPLICATION_JSON).content(json))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		long id = ((Number) JsonPath.read(response, "$.id")).longValue();

		mockMvc.perform(get("/api/posts/" + id)).andExpect(jsonPath("$.items.length()").value(0));
	}

	@Test
	void rejectsElevenItems() throws Exception {
		for (int i = 0; i < 11; i++) {
			jdbc.update("insert into items (id, name_ko, tier, price_total, icon_file, from_ids, active, updated_at) values (?, ?, 'BASIC', 100, 'x.png', '{}', true, now())",
					2000 + i, "아이템" + i);
		}
		List<String> ids = IntStream.range(0, 11).mapToObj(i -> String.valueOf(2000 + i)).toList();

		create(ids).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.itemIds").value("아이템은 10개까지 고를 수 있어요"));
	}

	@Test
	void rejectsUnknownOrNonNumericItem() throws Exception {
		create(List.of("4242")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.itemIds").value("없는 아이템이 들어 있어요"));
		create(List.of("abc")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.itemIds").value("없는 아이템이 들어 있어요"));
		create(List.of("99999999999")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.itemIds").value("없는 아이템이 들어 있어요"));
	}

	@Test
	void rejectsNewInactiveItem() throws Exception {
		create(List.of("9999")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.itemIds").value("현재 게임에 없는 아이템은 새로 붙일 수 없어요"));
	}

	@Test
	void keepsAlreadyAttachedInactiveItemOnEdit() throws Exception {
		long id = createOk(List.of("3084"));
		jdbc.update("insert into post_items (post_id, item_id) values (?, 9999)", id);

		edit(id, List.of("3084", "9999")).andExpect(status().isNoContent());
		mockMvc.perform(get("/api/posts/" + id)).andExpect(jsonPath("$.items.length()").value(2));

		// 빼고 나면 다시는 붙일 수 없어요.
		edit(id, List.of("3084")).andExpect(status().isNoContent());
		edit(id, List.of("9999")).andExpect(status().isBadRequest());
	}

	@Test
	void filtersPostsByItem() throws Exception {
		createOk(List.of("3084"));
		createOk(List.of("3083"));
		createOk(List.of());

		mockMvc.perform(get("/api/posts").param("item", "3084"))
			.andExpect(jsonPath("$.totalItems").value(1))
			.andExpect(jsonPath("$.items[0].items[0].id").value("3084"));
		mockMvc.perform(get("/api/posts").param("item", "1011")).andExpect(jsonPath("$.totalItems").value(0));
	}

	@Test
	void nonNumericItemFilterGivesEmptyPage() throws Exception {
		createOk(List.of("3084"));

		mockMvc.perform(get("/api/posts").param("item", "abc"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalItems").value(0));
		mockMvc.perform(get("/api/posts").param("item", "99999999999"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.totalItems").value(0));
	}

	@Test
	void tagCountsIncludeItems() throws Exception {
		createOk(List.of("3084", "1011"));
		createOk(List.of("3084"));
		createOk(List.of());

		mockMvc.perform(get("/api/tag-counts"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.items['3084']").value(2))
			.andExpect(jsonPath("$.items['1011']").value(1))
			.andExpect(jsonPath("$.items['3083']").doesNotExist());
	}

}
