package com.aram.community.post;

import static com.aram.community.post.PostContentValidatorTest.doc;
import static com.aram.community.post.PostContentValidatorTest.paragraph;
import static com.aram.community.post.PostContentValidatorTest.text;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

class PostApiTest extends IntegrationTest {

	@Autowired
	TestUsers testUsers;

	User author;

	@BeforeEach
	void seedGameData() {
		jdbc.update("insert into game_data_state (id, current_ddragon_version, current_game_patch) values (1, '16.21.1', '26.21')");
		jdbc.update("insert into patches (ddragon_version, game_patch, released_order) values ('16.21.1','26.21',162101), ('16.20.1','26.20',162001)");
		jdbc.update("insert into champions (id, name_ko, image_file) values ('Amumu', '아무무', 'Amumu.png'), ('Jinx', '징크스', 'Jinx.png')");
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at) values "
				+ "('A1', '무한 궁극기', 'a1.png', true, now()), ('OLD', '옛 증강', 'old.png', false, now())");
		author = testUsers.create("양호");
	}

	static String body(String title, List<String> champions, List<String> augments, String patch) {
		return "{\"title\":" + quote(title) + ",\"content\":" + doc(paragraph(text("아무무는 이 증강이 좋아요")))
				+ ",\"championIds\":" + list(champions) + ",\"augmentIds\":" + list(augments) + ",\"gamePatch\":"
				+ quote(patch) + "}";
	}

	private static String quote(String s) {
		return s == null ? "null" : "\"" + s + "\"";
	}

	private static String list(List<String> items) {
		return items.stream().map(PostApiTest::quote).collect(Collectors.joining(",", "[", "]"));
	}

	ResultActions create(RequestPostProcessor who, String json) throws Exception {
		return mockMvc.perform(post("/api/posts").with(who).contentType(MediaType.APPLICATION_JSON).content(json));
	}

	long createOk(User user, List<String> champions, List<String> augments) throws Exception {
		String response = create(testUsers.as(user), body("아무무 추천", champions, augments, "26.21"))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return ((Number) JsonPath.read(response, "$.id")).longValue();
	}

	@Test
	void createAndReadPost() throws Exception {
		long id = ((Number) JsonPath.read(create(testUsers.as(author),
				body("  아무무 추천 ", List.of("Amumu"), List.of("A1"), "26.21"))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString(), "$.id")).longValue();

		mockMvc.perform(get("/api/posts/" + id))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.title").value("아무무 추천"))
			.andExpect(jsonPath("$.content.type").value("doc"))
			.andExpect(jsonPath("$.champions[0].id").value("Amumu"))
			.andExpect(jsonPath("$.champions[0].imageUrl")
				.value("https://ddragon.leagueoflegends.com/cdn/16.21.1/img/champion/Amumu.png"))
			.andExpect(jsonPath("$.augments[0].nameKo").value("무한 궁극기"))
			.andExpect(jsonPath("$.gamePatch").value("26.21"))
			.andExpect(jsonPath("$.author.nickname").value("양호"))
			.andExpect(jsonPath("$.likeCount").value(0))
			.andExpect(jsonPath("$.commentCount").value(0))
			.andExpect(jsonPath("$.likedByMe").value(false))
			.andExpect(jsonPath("$.edited").value(false));
	}

	@Test
	void anonymousCannotCreate() throws Exception {
		create(csrf(), body("제목", List.of(), List.of(), "26.21")).andExpect(status().isUnauthorized());
	}

	@Test
	void userWithoutNicknameCannotCreate() throws Exception {
		create(testUsers.as(testUsers.createWithoutNickname()), body("제목", List.of(), List.of(), "26.21"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("NICKNAME_REQUIRED"));
	}

	@Test
	void blankTitleRejected() throws Exception {
		create(testUsers.as(author), body("   ", List.of(), List.of(), "26.21")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.title").value("제목을 입력해주세요"));
	}

	@Test
	void tooLongTitleRejected() throws Exception {
		create(testUsers.as(author), body("가".repeat(101), List.of(), List.of(), "26.21"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.title").value("제목은 100자 이하로 써주세요"));
	}

	@Test
	void titleLengthIsCheckedAfterTrimming() throws Exception {
		String title = "가".repeat(100);
		String response = create(testUsers.as(author), body(title + "  ", List.of(), List.of(), "26.21"))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		long id = ((Number) JsonPath.read(response, "$.id")).longValue();
		mockMvc.perform(get("/api/posts/" + id)).andExpect(jsonPath("$.title").value(title));
	}

	@Test
	void unknownPatchRejected() throws Exception {
		create(testUsers.as(author), body("제목", List.of(), List.of(), "99.1")).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.gamePatch").exists());
	}

	@Test
	void tooManyChampionsRejected() throws Exception {
		create(testUsers.as(author), body("제목", List.of("a", "b", "c", "d", "e", "f"), List.of(), "26.21"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.championIds").exists());
	}

	@Test
	void unknownChampionRejected() throws Exception {
		create(testUsers.as(author), body("제목", List.of("Nope"), List.of(), "26.21"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.championIds").exists());
	}

	@Test
	void duplicateTagsCollapse() throws Exception {
		long id = createOk(author, List.of("Amumu", "Amumu"), List.of());
		mockMvc.perform(get("/api/posts/" + id)).andExpect(jsonPath("$.champions.length()").value(1));
	}

	@Test
	void inactiveAugmentCannotBeNewlyAdded() throws Exception {
		create(testUsers.as(author), body("제목", List.of(), List.of("OLD"), "26.21"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.augmentIds").exists());
	}

	@Test
	void inactiveAugmentCanStayOnEdit() throws Exception {
		long id = createOk(author, List.of(), List.of());
		jdbc.update("insert into post_augments (post_id, augment_id) values (?, 'OLD')", id);

		mockMvc.perform(put("/api/posts/" + id).with(testUsers.as(author))
				.contentType(MediaType.APPLICATION_JSON)
				.content(body("수정", List.of(), List.of("OLD", "A1"), "26.20")))
			.andExpect(status().isNoContent());
		mockMvc.perform(get("/api/posts/" + id))
			.andExpect(jsonPath("$.augments.length()").value(2))
			.andExpect(jsonPath("$.gamePatch").value("26.20"));
	}

	@Test
	void onlyAuthorCanEdit() throws Exception {
		long id = createOk(author, List.of(), List.of());
		String json = body("남이 수정", List.of(), List.of(), "26.21");
		mockMvc.perform(put("/api/posts/" + id).with(testUsers.as(testUsers.create("민수")))
			.contentType(MediaType.APPLICATION_JSON)
			.content(json)).andExpect(status().isForbidden());
		mockMvc.perform(put("/api/posts/" + id).with(testUsers.as(testUsers.createAdmin("관리자")))
			.contentType(MediaType.APPLICATION_JSON)
			.content(json)).andExpect(status().isForbidden());
	}

	@Test
	void authorOrAdminCanDelete() throws Exception {
		long id = createOk(author, List.of("Amumu"), List.of("A1"));
		mockMvc.perform(delete("/api/posts/" + id).with(testUsers.as(testUsers.create("민수"))))
			.andExpect(status().isForbidden());
		mockMvc.perform(delete("/api/posts/" + id).with(testUsers.as(testUsers.createAdmin("관리자"))))
			.andExpect(status().isNoContent());
		mockMvc.perform(get("/api/posts/" + id))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("POST_NOT_FOUND"));
	}

	@Test
	void authorCanDeleteOwnPost() throws Exception {
		long id = createOk(author, List.of(), List.of());
		mockMvc.perform(delete("/api/posts/" + id).with(testUsers.as(author))).andExpect(status().isNoContent());
	}

	@Test
	void editMarksEdited() throws Exception {
		long id = createOk(author, List.of(), List.of());
		jdbc.update("update posts set created_at = created_at - interval '1 minute', updated_at = updated_at - interval '1 minute' where id = ?", id);
		mockMvc.perform(get("/api/posts/" + id)).andExpect(jsonPath("$.edited").value(false));

		mockMvc.perform(put("/api/posts/" + id).with(testUsers.as(author))
			.contentType(MediaType.APPLICATION_JSON)
			.content(body("수정함", List.of(), List.of(), "26.21"))).andExpect(status().isNoContent());

		mockMvc.perform(get("/api/posts/" + id))
			.andExpect(jsonPath("$.title").value("수정함"))
			.andExpect(jsonPath("$.edited").value(true));
	}

	@Test
	void missingPostIs404() throws Exception {
		mockMvc.perform(get("/api/posts/9999")).andExpect(status().isNotFound());
	}

}
