package com.aram.community.gamedata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.aram.community.support.IntegrationTest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class GameDataSyncServiceTest extends IntegrationTest {

	private static final String VERSIONS = "https://ddragon.leagueoflegends.com/api/versions.json";

	private static final String CHAMPIONS = "https://ddragon.leagueoflegends.com/cdn/16.21.1/data/ko_KR/champion.json";

	private static final String KIWI = "https://raw.communitydragon.org/latest/game/maps/modespecificdata/kiwi.bin.json";

	private static final String STRINGS_KO = "https://raw.communitydragon.org/latest/game/ko_kr/data/menu/en_us/lol.stringtable.json";

	private static final String STRINGS_EN = "https://raw.communitydragon.org/latest/game/en_us/data/menu/en_us/lol.stringtable.json";

	@Autowired
	GameDataSyncService sync;

	@Autowired
	GameDataClient client;

	@Autowired
	ChampionRepository champions;

	@Autowired
	AugmentRepository augments;

	@Autowired
	AugmentTextRepository texts;

	@Autowired
	PatchRepository patchRepo;

	@Autowired
	GameDataStateRepository states;

	MockRestServiceServer server;

	@BeforeEach
	void bindServer() {
		RestClient.Builder builder = (RestClient.Builder) ReflectionTestUtils.getField(client, "builder");
		server = MockRestServiceServer.bindTo(builder).build();
		jdbc.update("insert into game_data_state (id) values (1)");
	}

	private static String fixture(String name) throws IOException {
		return new ClassPathResource("gamedata/" + name).getContentAsString(StandardCharsets.UTF_8);
	}

	private void expectFullSync(String kiwiFixture) throws IOException {
		server.expect(requestTo(VERSIONS)).andRespond(withSuccess(fixture("versions.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CHAMPIONS))
			.andRespond(withSuccess(fixture("champion.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(KIWI)).andRespond(withSuccess(fixture(kiwiFixture), MediaType.APPLICATION_JSON));
		expectStrings();
	}

	/** 언어마다 문자열 표를 두 번 받아요: 이름·툴팁 키, 그리고 툴팁 안 {{참조}} 키. 영어 먼저, 한국어 다음. */
	private void expectStrings() throws IOException {
		server.expect(requestTo(STRINGS_EN))
			.andRespond(withSuccess(fixture("stringtable-en.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_EN))
			.andRespond(withSuccess(fixture("stringtable-en.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_KO))
			.andRespond(withSuccess(fixture("stringtable.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_KO))
			.andRespond(withSuccess(fixture("stringtable.json"), MediaType.APPLICATION_JSON));
	}

	private GameDataState state() {
		return states.findById(1).orElseThrow();
	}

	@Test
	void firstSyncFillsEverything() throws IOException {
		expectFullSync("kiwi.bin.json");

		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.UPDATED);

		server.verify();
		assertThat(champions.count()).isEqualTo(3);
		assertThat(champions.findById("Amumu").orElseThrow().getNameKo()).isEqualTo("아무무");
		assertThat(augments.count()).isEqualTo(22);
		Augment legDay = augments.findById("ARAM_LegDay").orElseThrow();
		assertThat(legDay.getNameKo()).isEqualTo("하체 운동의 날");
		assertThat(legDay.getIconPath()).isEqualTo("assets/ux/cherry/augments/icons/legday_small.png");
		assertThat(state().getCurrentDdragonVersion()).isEqualTo("16.21.1");
		assertThat(state().getCurrentGamePatch()).isEqualTo("26.21");
		assertThat(state().getLastSyncedAt()).isNotNull();
		assertThat(patchRepo.count()).isEqualTo(8);
	}

	@Test
	void sameVersionSkipsHeavyDownloads() throws IOException {
		expectFullSync("kiwi.bin.json");
		sync.sync();
		server.verify();
		server.reset();
		server.expect(requestTo(VERSIONS)).andRespond(withSuccess(fixture("versions.json"), MediaType.APPLICATION_JSON));

		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.UNCHANGED);

		server.verify();
		assertThat(state().getLastCheckedAt()).isNotNull();
	}

	@Test
	void missingAugmentBecomesInactiveNotDeleted() throws IOException {
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at) values ('Gone', '사라진 증강', 'x.png', true, now())");
		expectFullSync("kiwi.bin.json");

		sync.sync();

		Augment gone = augments.findById("Gone").orElseThrow();
		assertThat(gone.isActive()).isFalse();
	}

	@Test
	void tooFewAugmentsFailsAndKeepsOldData() throws IOException {
		jdbc.update("update game_data_state set current_ddragon_version = '16.20.1', current_game_patch = '26.20' where id = 1");
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at) values ('Keep', '남을 증강', 'x.png', true, now())");
		jdbc.update("insert into champions (id, name_ko, image_file) values ('Ahri', '아리', 'Ahri.png')");
		// 작은 자료에는 툴팁이 없어서 {{참조}} 2차 요청이 없고, 언어마다 한 번씩만 받아요.
		server.expect(requestTo(VERSIONS)).andRespond(withSuccess(fixture("versions.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CHAMPIONS))
			.andRespond(withSuccess(fixture("champion.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(KIWI)).andRespond(withSuccess(fixture("kiwi-small.bin.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_EN))
			.andRespond(withSuccess(fixture("stringtable-en.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_KO))
			.andRespond(withSuccess(fixture("stringtable.json"), MediaType.APPLICATION_JSON));

		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.FAILED);

		assertThat(augments.count()).isEqualTo(1);
		assertThat(augments.findById("Keep").orElseThrow().isActive()).isTrue();
		assertThat(state().getCurrentDdragonVersion()).isEqualTo("16.20.1");
		assertThat(state().getLastError()).isNotBlank();
	}

	@Test
	void championFailureDoesNotAdvanceVersion() throws IOException {
		jdbc.update("update game_data_state set current_ddragon_version = '16.20.1', current_game_patch = '26.20' where id = 1");
		jdbc.update("insert into champions (id, name_ko, image_file) values ('Ahri', '아리', 'Ahri.png')");
		server.expect(requestTo(VERSIONS)).andRespond(withSuccess(fixture("versions.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CHAMPIONS)).andRespond(withServerError());

		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.FAILED);

		assertThat(state().getCurrentDdragonVersion()).isEqualTo("16.20.1");
		assertThat(champions.count()).isEqualTo(1);
		assertThat(state().getLastError()).isNotBlank();
	}

	@Test
	void storesRarityFromKiwi() throws IOException {
		expectFullSync("kiwi.bin.json");

		sync.sync();

		assertThat(augments.findById("SurgeField").orElseThrow().getRarity()).isEqualTo(AugmentRarity.PRISMATIC);
		assertThat(augments.findById("Sonata").orElseThrow().getRarity()).isEqualTo(AugmentRarity.GOLD);
		assertThat(augments.findById("ARAM_LegDay").orElseThrow().getRarity()).isEqualTo(AugmentRarity.SILVER);
		// 알 수 없는 값(7)은 실버로 둬요.
		assertThat(augments.findById("ARAM_Firefox").orElseThrow().getRarity()).isEqualTo(AugmentRarity.SILVER);
	}

	@Test
	void skipsDisabledAugments() throws IOException {
		expectFullSync("kiwi.bin.json");

		sync.sync();

		assertThat(augments.findById("Disabled_Test")).isEmpty();
		assertThat(augments.count()).isEqualTo(22);
	}

	@Test
	void disabledLaterDeactivatesExisting() throws IOException {
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at, rarity) values ('Disabled_Test', '꺼진 증강', 'x.png', true, now(), 'GOLD')");
		expectFullSync("kiwi.bin.json");

		sync.sync();

		assertThat(augments.findById("Disabled_Test").orElseThrow().isActive()).isFalse();
	}

	@Test
	void refreshUpdatesRarity() throws IOException {
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at, rarity) values ('Sonata', '소나타', 'x.png', true, now(), 'SILVER')");
		expectFullSync("kiwi.bin.json");

		sync.sync();

		assertThat(augments.findById("Sonata").orElseThrow().getRarity()).isEqualTo(AugmentRarity.GOLD);
	}

	@Test
	void storesTextsForBothLocales() throws IOException {
		expectFullSync("kiwi.bin.json");

		sync.sync();

		List<AugmentText> legDay = texts.findByIdAugmentId("ARAM_LegDay");
		assertThat(legDay).extracting(x -> x.getId().locale()).containsExactlyInAnyOrder("en", "ko");
		assertThat(legDay.stream().filter(x -> x.getId().locale().equals("ko")).findFirst().orElseThrow().getDescription())
			.isEqualTo("<speed>이동 속도가 20%</speed> 오릅니다.");
		assertThat(legDay.stream().filter(x -> x.getId().locale().equals("en")).findFirst().orElseThrow().getName())
			.isEqualTo("Leg Day");
		assertThat(augments.findById("ARAM_LegDay").orElseThrow().getLargeIconPath())
			.isEqualTo("assets/ux/cherry/augments/icons/legday_large.png");
	}

	@Test
	void keepsPlaceholderWhenValueMissing() throws IOException {
		expectFullSync("kiwi.bin.json");

		sync.sync();

		assertThat(texts.findById(new AugmentTextId("SurgeField", "ko")).orElseThrow().getDescription())
			.isEqualTo("@Damage@의 피해");
	}

	@Test
	void refreshOverwritesExistingText() throws IOException {
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at) values ('ARAM_LegDay', '옛 이름', 'x.png', true, now())");
		jdbc.update("insert into augment_texts (augment_id, locale, name, description, updated_at) values ('ARAM_LegDay', 'ko', '옛 이름', '옛 설명', now())");
		expectFullSync("kiwi.bin.json");

		sync.sync();

		AugmentText ko = texts.findById(new AugmentTextId("ARAM_LegDay", "ko")).orElseThrow();
		assertThat(ko.getName()).isEqualTo("하체 운동의 날");
		assertThat(ko.getDescription()).isEqualTo("<speed>이동 속도가 20%</speed> 오릅니다.");
	}

	@Test
	void englishStringsFailureFailsWholeSync() throws IOException {
		jdbc.update("update game_data_state set current_ddragon_version = '16.20.1', current_game_patch = '26.20' where id = 1");
		jdbc.update("insert into augments (id, name_ko, icon_path, active, updated_at) values ('Keep', '남을 증강', 'x.png', true, now())");
		server.expect(requestTo(VERSIONS)).andRespond(withSuccess(fixture("versions.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CHAMPIONS))
			.andRespond(withSuccess(fixture("champion.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(KIWI)).andRespond(withSuccess(fixture("kiwi.bin.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_EN)).andRespond(withServerError());

		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.FAILED);

		assertThat(state().getCurrentDdragonVersion()).isEqualTo("16.20.1");
		assertThat(augments.count()).isEqualTo(1);
		assertThat(texts.count()).isZero();
		assertThat(state().getLastError()).isNotBlank();
	}

	@Test
	void successClearsPreviousError() throws IOException {
		jdbc.update("update game_data_state set last_error = 'x' where id = 1");
		expectFullSync("kiwi.bin.json");

		sync.sync();

		assertThat(state().getLastError()).isNull();
	}

}
