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

	private static final String CDRAGON_META = "https://raw.communitydragon.org/latest/content-metadata.json";

	private static final String KIWI = "https://raw.communitydragon.org/latest/game/maps/modespecificdata/kiwi.bin.json";

	private static final String STRINGS_KO = "https://raw.communitydragon.org/latest/game/ko_kr/data/menu/en_us/lol.stringtable.json";

	private static final String STRINGS_EN = "https://raw.communitydragon.org/latest/game/en_us/data/menu/en_us/lol.stringtable.json";

	private static final String CLIENT_KO = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/ko_kr/v1/cherry-augments.json";

	private static final String CLIENT_EN = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/cherry-augments.json";

	private static final String MAP12 = "https://raw.communitydragon.org/latest/game/data/maps/shipping/map12/map12.bin.json";

	private static final String ITEMS = "https://raw.communitydragon.org/latest/game/items.cdtb.bin.json";

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
	ItemRepository items;

	@Autowired
	ItemTextRepository itemTexts;

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

	/** 6시간마다 하는 확인: 라이엇 패치 번호와 CommunityDragon 자료 버전. */
	private void expectVersions(String metadataFixture) throws IOException {
		server.expect(requestTo(VERSIONS)).andRespond(withSuccess(fixture("versions.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CDRAGON_META))
			.andRespond(withSuccess(fixture(metadataFixture), MediaType.APPLICATION_JSON));
	}

	/** 버전 확인 뒤 무거운 자료(챔피언, 증강, 문자열 표)를 받아요. */
	private void expectHeavyDownloads(String kiwiFixture) throws IOException {
		server.expect(requestTo(CHAMPIONS))
			.andRespond(withSuccess(fixture("champion.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(KIWI)).andRespond(withSuccess(fixture(kiwiFixture), MediaType.APPLICATION_JSON));
		expectStrings();
		expectItems();
	}

	private void expectFullSync(String kiwiFixture) throws IOException {
		expectVersions("content-metadata.json");
		server.expect(requestTo(CHAMPIONS))
			.andRespond(withSuccess(fixture("champion.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(KIWI)).andRespond(withSuccess(fixture(kiwiFixture), MediaType.APPLICATION_JSON));
		expectStrings();
		expectItems();
	}

	/**
	 * 언어마다 문자열 표를 두 번 받고(이름·툴팁 키, 툴팁 안 {{참조}} 키), 이어서 클라이언트 증강 목록(문자열 표에 없는 새 증강의 이름)을 받아요.
	 * 영어 먼저, 한국어 다음.
	 */
	private void expectStrings() throws IOException {
		server.expect(requestTo(STRINGS_EN))
			.andRespond(withSuccess(fixture("stringtable-en.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_EN))
			.andRespond(withSuccess(fixture("stringtable-en.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CLIENT_EN))
			.andRespond(withSuccess(fixture("client-augments-en.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_KO))
			.andRespond(withSuccess(fixture("stringtable.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_KO))
			.andRespond(withSuccess(fixture("stringtable.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CLIENT_KO))
			.andRespond(withSuccess(fixture("client-augments.json"), MediaType.APPLICATION_JSON));
	}

	/**
	 * 증강 다음에 아이템: 칼바람 맵, 아이템 자료, 그리고 언어마다 문자열 표를 두 번(이름·설명 키, 설명 안 {{참조}} 키) 받아요.
	 * 영어 먼저, 한국어 다음.
	 */
	private void expectItems() throws IOException {
		server.expect(requestTo(MAP12))
			.andRespond(withSuccess(fixture("map12-small.bin.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(ITEMS))
			.andRespond(withSuccess(fixture("items-small.cdtb.bin.json"), MediaType.APPLICATION_JSON));
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
		assertThat(augments.count()).isEqualTo(24);
		Augment legDay = augments.findById("ARAM_LegDay").orElseThrow();
		assertThat(legDay.getNameKo()).isEqualTo("하체 운동의 날");
		assertThat(legDay.getIconPath()).isEqualTo("assets/ux/cherry/augments/icons/legday_small.png");
		assertThat(state().getCurrentDdragonVersion()).isEqualTo("16.21.1");
		assertThat(state().getCurrentGamePatch()).isEqualTo("26.21");
		assertThat(state().getLastSyncedAt()).isNotNull();
		assertThat(patchRepo.count()).isEqualTo(8);
		assertThat(state().getCurrentCdragonVersion())
			.isEqualTo("16.21.8298620+branch.releases-16-21.content.release");
	}

	@Test
	void communityDragonUpdateOnSamePatchResyncs() throws IOException {
		expectFullSync("kiwi.bin.json");
		sync.sync();
		server.verify();
		server.reset();
		// 라이엇 패치 번호는 그대로인데 CommunityDragon이 늦게 갱신된 경우예요.
		expectVersions("content-metadata-newer.json");
		expectHeavyDownloads("kiwi.bin.json");

		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.UPDATED);

		server.verify();
		assertThat(state().getCurrentCdragonVersion())
			.isEqualTo("16.21.8312345+branch.releases-16-21.content.release");
	}

	@Test
	void unreadableCommunityDragonVersionFallsBackToPatchNumber() throws IOException {
		expectFullSync("kiwi.bin.json");
		sync.sync();
		server.verify();
		server.reset();
		server.expect(requestTo(VERSIONS)).andRespond(withSuccess(fixture("versions.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CDRAGON_META)).andRespond(withServerError());

		// 버전 파일을 못 읽어도 동기화를 망가뜨리지 않고, 예전처럼 패치 번호만 봐요.
		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.UNCHANGED);

		server.verify();
		assertThat(state().getCurrentCdragonVersion())
			.isEqualTo("16.21.8298620+branch.releases-16-21.content.release");
		assertThat(state().getLastError()).isNull();
	}

	@Test
	void sameVersionSkipsHeavyDownloads() throws IOException {
		expectFullSync("kiwi.bin.json");
		sync.sync();
		server.verify();
		server.reset();
		expectVersions("content-metadata.json");

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
		expectVersions("content-metadata.json");
		server.expect(requestTo(CHAMPIONS))
			.andRespond(withSuccess(fixture("champion.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(KIWI)).andRespond(withSuccess(fixture("kiwi-small.bin.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_EN))
			.andRespond(withSuccess(fixture("stringtable-en.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CLIENT_EN))
			.andRespond(withSuccess(fixture("client-augments-en.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_KO))
			.andRespond(withSuccess(fixture("stringtable.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CLIENT_KO))
			.andRespond(withSuccess(fixture("client-augments.json"), MediaType.APPLICATION_JSON));

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
		expectVersions("content-metadata.json");
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
		assertThat(augments.count()).isEqualTo(24);
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
		expectVersions("content-metadata.json");
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
	void skipsLocaleWhoseDescriptionIsBlank() throws IOException {
		expectFullSync("kiwi.bin.json");

		sync.sync();

		// 소나타의 한국어 툴팁은 집계 줄뿐이라 빈 설명이 되고, 그 언어 행은 저장하지 않아요.
		assertThat(texts.findById(new AugmentTextId("Sonata", "ko"))).isEmpty();
		assertThat(texts.findById(new AugmentTextId("Sonata", "en")).orElseThrow().getDescription()).isEqualTo("Plays a song.");
	}

	@Test
	void readsStringsStoredUnderHashedKeys() throws IOException {
		expectFullSync("kiwi.bin.json");

		sync.sync();

		// 새 증강의 글은 표에 {해시} 키로만 있어요. 키를 같은 방식으로 해시해 찾아요.
		Augment armored = augments.findById("ArmoredImpact").orElseThrow();
		assertThat(armored.getNameKo()).isEqualTo("장갑 충격");
		assertThat(armored.getRarity()).isEqualTo(AugmentRarity.GOLD);
		AugmentText ko = texts.findById(new AugmentTextId("ArmoredImpact", "ko")).orElseThrow();
		assertThat(ko.getDescription())
			.isEqualTo("스킬 사용 후 다음 기본 공격 시 주변 적에게 <physicalDamage>40~120의 추가 물리 피해</physicalDamage>를 입힙니다.");
		assertThat(texts.findById(new AugmentTextId("ArmoredImpact", "en")).orElseThrow().getName()).isEqualTo("Armored Impact");
		// 큰 아이콘 경로가 파일 이름 대신 {해시}로만 있으면 작은 아이콘을 써요(그 주소는 열리지 않아요).
		assertThat(armored.getLargeIconPath()).isEqualTo("assets/ux/kiwi/augments/icons/armoredimpact_small.png");
	}

	@Test
	void namesNewAugmentsFromClientList() throws IOException {
		expectFullSync("kiwi.bin.json");

		sync.sync();

		// 표에 글이 전혀 없는 증강은 클라이언트 목록의 이름으로 들어가고, 설명은 없어서 글 행이 없어요.
		Augment still = augments.findById("StillHere").orElseThrow();
		assertThat(still.getNameKo()).isEqualTo("아직 여기 있어");
		assertThat(texts.findByIdAugmentId("StillHere")).isEmpty();
		// 문자열 표에 있는 이름이 우선이에요.
		assertThat(augments.findById("ARAM_LegDay").orElseThrow().getNameKo()).isEqualTo("하체 운동의 날");
	}

	@Test
	void skipsPlaceholderWhoseNameIsItsOwnStringKey() throws IOException {
		expectFullSync("kiwi.bin.json");

		sync.sync();

		// 게임 자료에 이름이 없어 클라이언트 목록도 키("GoH_PentakillAug_Generic_BlankName")를 그대로 주는 자리표시 증강이에요.
		// 이름 없는 증강처럼 받지 않아요(펜타킬 Q/W/E/R은 제 이름이 있어요).
		assertThat(augments.findById("GoH_PentakillAug_Generic")).isEmpty();
	}

	@Test
	void clientListFailureKeepsStringTableNames() throws IOException {
		expectVersions("content-metadata.json");
		server.expect(requestTo(CHAMPIONS))
			.andRespond(withSuccess(fixture("champion.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(KIWI)).andRespond(withSuccess(fixture("kiwi.bin.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_EN))
			.andRespond(withSuccess(fixture("stringtable-en.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_EN))
			.andRespond(withSuccess(fixture("stringtable-en.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CLIENT_EN)).andRespond(withServerError());
		server.expect(requestTo(STRINGS_KO))
			.andRespond(withSuccess(fixture("stringtable.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_KO))
			.andRespond(withSuccess(fixture("stringtable.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(CLIENT_KO)).andRespond(withServerError());
		expectItems();

		// 클라이언트 목록은 보조 자료라 실패해도 동기화는 성공하고, 그 이름만 있는 증강은 빠져요.
		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.UPDATED);

		assertThat(augments.findById("StillHere")).isEmpty();
		assertThat(augments.findById("ArmoredImpact")).isPresent();
		assertThat(augments.findById("ARAM_LegDay")).isPresent();
	}

	@Test
	void successClearsPreviousError() throws IOException {
		jdbc.update("update game_data_state set last_error = 'x' where id = 1");
		expectFullSync("kiwi.bin.json");

		sync.sync();

		assertThat(state().getLastError()).isNull();
	}

	@Test
	void savesItemsWithTexts() throws IOException {
		expectFullSync("kiwi.bin.json");

		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.UPDATED);

		server.verify();
		Item heartsteel = items.findById(3084).orElseThrow();
		assertThat(heartsteel.getNameKo()).isEqualTo("강철심장");
		assertThat(heartsteel.getTier()).isEqualTo(ItemTier.LEGENDARY);
		assertThat(heartsteel.getPriceTotal()).isEqualTo(3000);
		assertThat(heartsteel.getIconFile()).isEqualTo("3084.png");
		assertThat(heartsteel.getFromIds()).containsExactly(1011, 3801, 1011);
		assertThat(heartsteel.getCategories()).containsExactly("Health", "HealthRegen");
		assertThat(heartsteel.isActive()).isTrue();
		ItemText ko = itemTexts.findById(new ItemTextId(3084, "ko")).orElseThrow();
		assertThat(ko.getName()).isEqualTo("강철심장");
		// 증강 칼바람(ARAM 덮어쓰기) 값 5%가 들어가고, {{ Item_Cooldown }} 참조도 채워져요.
		assertThat(ko.getDescription()).contains("5%").contains("(30초)").doesNotContain("{{");
		assertThat(itemTexts.findById(new ItemTextId(3084, "en")).orElseThrow().getName()).isEqualTo("Heartsteel");
		// 살 수 없는 아이템(상점 밖)은 받지 않아요.
		assertThat(items.findById(220008)).isEmpty();
	}

	@Test
	void itemWithoutKoreanNameUsesEnglish() throws IOException {
		expectFullSync("kiwi.bin.json");

		sync.sync();

		// 한국어 이름이 표에 없으면 영어 이름으로라도 저장하고, 설명이 없으면 글 행은 없어요.
		assertThat(items.findById(1001).orElseThrow().getNameKo()).isEqualTo("Boots");
		assertThat(itemTexts.findByIdItemId(1001)).isEmpty();
		// 이름이 어느 언어에도 없으면 받지 않아요.
		assertThat(items.findById(2003)).isEmpty();
		assertThat(items.count()).isEqualTo(13);
	}

	@Test
	void missingItemDeactivated() throws IOException {
		jdbc.update("insert into items (id, name_ko, tier, price_total, icon_file, from_ids, active, updated_at) "
				+ "values (9999, '사라진 아이템', 'BASIC', 100, '9999.png', '{}', true, now())");
		expectFullSync("kiwi.bin.json");

		sync.sync();

		Item gone = items.findById(9999).orElseThrow();
		assertThat(gone.isActive()).isFalse();
		assertThat(gone.getNameKo()).isEqualTo("사라진 아이템");
	}

	@Test
	void emptyItemsForceFullSync() throws IOException {
		expectFullSync("kiwi.bin.json");
		sync.sync();
		server.verify();
		server.reset();
		jdbc.update("delete from item_texts");
		jdbc.update("delete from items");
		// 아이템 기능을 처음 켠 서버처럼: 패치도 자료 버전도 최신 그대로(버전을 비우지 않아요)지만 아이템이 하나도 없으면
		// 전체를 다시 받아요. 그동안 챔피언 그림 주소는 그대로예요.
		assertThat(state().getCurrentDdragonVersion()).isEqualTo("16.21.1");
		assertThat(state().getCurrentCdragonVersion()).isNotNull();
		expectVersions("content-metadata.json");
		expectHeavyDownloads("kiwi.bin.json");

		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.UPDATED);

		server.verify();
		assertThat(items.findById(3084)).isPresent();
		assertThat(state().getCurrentDdragonVersion()).isEqualTo("16.21.1");
	}

	@Test
	void itemStageFailureKeepsAugmentsAndReturnsFailed() throws IOException {
		jdbc.update("update game_data_state set current_ddragon_version = '16.20.1', current_game_patch = '26.20' where id = 1");
		jdbc.update("insert into items (id, name_ko, tier, price_total, icon_file, from_ids, active, updated_at) "
				+ "values (3084, '옛 강철심장', 'LEGENDARY', 2900, '3084.png', '{1011}', true, now())");
		expectVersions("content-metadata.json");
		server.expect(requestTo(CHAMPIONS))
			.andRespond(withSuccess(fixture("champion.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(KIWI)).andRespond(withSuccess(fixture("kiwi.bin.json"), MediaType.APPLICATION_JSON));
		expectStrings();
		server.expect(requestTo(MAP12)).andRespond(withServerError());

		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.FAILED);

		server.verify();
		// 챔피언·증강은 저장되고, 아이템은 예전 그대로예요. 버전을 올리지 않아서 다음 확인 때 전체를 다시 받아요.
		assertThat(champions.count()).isEqualTo(3);
		assertThat(augments.count()).isEqualTo(24);
		Item old = items.findById(3084).orElseThrow();
		assertThat(old.getNameKo()).isEqualTo("옛 강철심장");
		assertThat(old.getPriceTotal()).isEqualTo(2900);
		assertThat(old.isActive()).isTrue();
		assertThat(items.count()).isEqualTo(1);
		assertThat(state().getCurrentDdragonVersion()).isEqualTo("16.20.1");
		assertThat(state().getLastError()).isNotBlank();
	}

	@Test
	void tooFewItemsFailsItemStage() throws IOException {
		jdbc.update("insert into items (id, name_ko, tier, price_total, icon_file, from_ids, active, updated_at) "
				+ "values (3084, '강철심장', 'LEGENDARY', 3000, '3084.png', '{}', true, now())");
		expectVersions("content-metadata.json");
		server.expect(requestTo(CHAMPIONS))
			.andRespond(withSuccess(fixture("champion.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(KIWI)).andRespond(withSuccess(fixture("kiwi.bin.json"), MediaType.APPLICATION_JSON));
		expectStrings();
		// 맵의 상점 목록이 비면(자료 형식이 바뀐 경우) 아이템을 하나도 못 찾아요. 찾을 키가 없으니 문자열 표는 언어마다 한 번이에요.
		server.expect(requestTo(MAP12)).andRespond(withSuccess(
				"{\"Maps/Shipping/Map12/Modes/KIWI\": {\"__type\": \"GameModeMapData\", \"itemLists\": []}}",
				MediaType.APPLICATION_JSON));
		server.expect(requestTo(ITEMS))
			.andRespond(withSuccess(fixture("items-small.cdtb.bin.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_EN))
			.andRespond(withSuccess(fixture("stringtable-en.json"), MediaType.APPLICATION_JSON));
		server.expect(requestTo(STRINGS_KO))
			.andRespond(withSuccess(fixture("stringtable.json"), MediaType.APPLICATION_JSON));

		assertThat(sync.sync()).isEqualTo(GameDataSyncService.SyncResult.FAILED);

		server.verify();
		assertThat(items.findById(3084).orElseThrow().isActive()).isTrue();
		assertThat(state().getLastError()).contains("items found");
	}

}
