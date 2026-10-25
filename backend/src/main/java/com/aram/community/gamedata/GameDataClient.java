package com.aram.community.gamedata;

import com.aram.community.gamedata.text.AbilitySlot;
import com.aram.community.gamedata.text.AugmentDescriptionBuilder;
import com.aram.community.gamedata.text.AugmentLocale;
import com.aram.community.gamedata.text.SpellValues;
import com.aram.community.gamedata.text.StringTableKeys;
import java.io.IOException;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Data Dragon(라이엇 공식)과 CommunityDragon에서 게임 데이터를 받아요. */
@Component
public class GameDataClient {

	public record ChampionData(String id, String nameKo, String imageFile) {
	}

	/** 언어별 이름과 수치가 채워진 설명. */
	public record LocalizedText(String name, String description) {
	}

	public record AugmentData(String id, String nameKo, String iconPath, String largeIconPath, AugmentRarity rarity,
			Map<AugmentLocale, LocalizedText> texts, int unresolvedCount) {
	}

	private static final Pattern REFERENCE = Pattern.compile("\\{\\{\\s*([^}]+?)\\s*\\}\\}");

	private static final Logger log = LoggerFactory.getLogger(GameDataClient.class);

	private final RestClient.Builder builder;

	private final GameDataProperties props;

	private final JsonMapper jsonMapper;

	public GameDataClient(GameDataProperties props, JsonMapper jsonMapper) {
		HttpClient httpClient = HttpClient.newBuilder()
			.connectTimeout(props.timeout())
			.followRedirects(HttpClient.Redirect.NORMAL)
			.build();
		JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
		factory.setReadTimeout(props.timeout());
		this.builder = RestClient.builder().requestFactory(factory);
		this.props = props;
		this.jsonMapper = jsonMapper;
	}

	public List<String> fetchVersions() {
		JsonNode root = getTree(props.ddragonBaseUrl() + "/api/versions.json");
		List<String> versions = new ArrayList<>();
		root.forEach(v -> versions.add(v.asString()));
		if (versions.isEmpty()) {
			throw new IllegalStateException("Data Dragon versions list is empty");
		}
		return versions;
	}

	/** CommunityDragon 자료 버전. 패치 중간에 자료가 고쳐지거나 늦게 올라와도 이 값이 바뀌어요. */
	public String fetchCdragonVersion() {
		String version = getTree(props.cdragonBaseUrl() + "/latest/content-metadata.json").path("version").asString("");
		if (version.isBlank()) {
			throw new IllegalStateException("CommunityDragon content-metadata has no version");
		}
		return version;
	}

	public List<ChampionData> fetchChampions(String ddragonVersion) {
		JsonNode data = getTree(props.ddragonBaseUrl() + "/cdn/" + ddragonVersion + "/data/ko_KR/champion.json")
			.path("data");
		List<ChampionData> champions = new ArrayList<>();
		data.properties().forEach(e -> {
			JsonNode c = e.getValue();
			champions.add(new ChampionData(c.path("id").asString(), c.path("name").asString(),
					c.path("image").path("full").asString()));
		});
		return champions;
	}

	/**
	 * 증강 목록과 언어별 이름·설명. 문자열 표는 언어마다 두 번 받아요: 이름·툴팁 키, 그리고 툴팁 안의 {{참조}} 키(있을 때만).
	 * 한국어 이름이 없는 증강은 받지 않아요(아직 출시되지 않았거나 남은 자료예요).
	 */
	public List<AugmentData> fetchAugments() {
		JsonNode kiwi = getTree(props.cdragonBaseUrl() + "/latest/game/maps/modespecificdata/kiwi.bin.json");
		List<JsonNode> raw = new ArrayList<>();
		Set<String> keys = new HashSet<>();
		kiwi.properties().forEach(e -> {
			JsonNode v = e.getValue();
			// 게임에서 꺼 둔 증강(Enabled: false)은 받지 않아요.
			if ("AugmentData".equals(v.path("__type").asString("")) && v.path("Enabled").asBoolean(true)) {
				raw.add(v);
				keys.add(v.path("NameTra").asString("").toLowerCase(Locale.ROOT));
				keys.add(v.path("AugmentTooltipTra").asString("").toLowerCase(Locale.ROOT));
			}
		});
		keys.remove("");

		Map<AugmentLocale, Map<String, String>> strings = new EnumMap<>(AugmentLocale.class);
		Map<AugmentLocale, Map<String, String>> clientNames = new EnumMap<>(AugmentLocale.class);
		for (AugmentLocale locale : AugmentLocale.values()) {
			Map<String, String> table = new HashMap<>(fetchStrings(locale, keys));
			Set<String> refs = new HashSet<>();
			for (JsonNode v : raw) {
				String tooltip = table.get(v.path("AugmentTooltipTra").asString("").toLowerCase(Locale.ROOT));
				if (tooltip != null) {
					Matcher m = REFERENCE.matcher(tooltip);
					while (m.find()) {
						refs.add(m.group(1).toLowerCase(Locale.ROOT));
					}
				}
			}
			refs.removeAll(table.keySet());
			if (!refs.isEmpty()) {
				table.putAll(fetchStrings(locale, refs));
			}
			strings.put(locale, table);
			clientNames.put(locale, fetchClientNames(locale));
		}

		Map<String, String> ko = strings.get(AugmentLocale.KO);
		List<AugmentData> augments = new ArrayList<>();
		for (JsonNode v : raw) {
			String nameKey = v.path("NameTra").asString("").toLowerCase(Locale.ROOT);
			String tooltipKey = v.path("AugmentTooltipTra").asString("").toLowerCase(Locale.ROOT);
			String augmentId = v.path("AugmentNameId").asString();
			String nameKo = nameOf(ko, nameKey, clientNames.get(AugmentLocale.KO), augmentId);
			String icon = v.path("AugmentSmallIconPath").asString("");
			if (nameKo == null || nameKo.isBlank() || icon.isBlank()) {
				continue;
			}
			String iconPath = toPng(icon);
			String largeIcon = v.path("AugmentLargeIconPath").asString("");
			// 새 증강은 큰 아이콘 경로가 파일 이름 대신 {해시}로만 있어요. 그 주소는 열리지 않으니 작은 아이콘을 써요.
			String largeIconPath = largeIcon.isBlank() || largeIcon.startsWith("{") ? iconPath : toPng(largeIcon);

			List<JsonNode> spells = spellObjects(kiwi, v);
			SpellValues values = SpellValues.from(spells);
			Optional<String> abilitySlot = AbilitySlot.of(augmentId, spells);
			Map<AugmentLocale, LocalizedText> texts = new EnumMap<>(AugmentLocale.class);
			int unresolved = 0;
			for (AugmentLocale locale : AugmentLocale.values()) {
				Map<String, String> table = strings.get(locale);
				String name = nameOf(table, nameKey, clientNames.get(locale), augmentId);
				String tooltip = table.get(tooltipKey);
				if (name == null || name.isBlank() || tooltip == null || tooltip.isBlank()) {
					continue;
				}
				AugmentDescriptionBuilder.Result result = new AugmentDescriptionBuilder(locale,
						key -> Optional.ofNullable(table.get(key.toLowerCase(Locale.ROOT))), abilitySlot)
					.build(tooltip, values);
				unresolved += result.unresolved().size();
				// 집계 줄뿐이거나 참조를 못 찾아 빈 설명이 되면 그 언어 행을 두지 않아요(화면은 "아직 설명이 없어요").
				if (result.description().isBlank()) {
					continue;
				}
				texts.put(locale, new LocalizedText(name, result.description()));
			}
			augments.add(new AugmentData(augmentId, nameKo, iconPath, largeIconPath, AugmentRarity.fromKiwi(v), texts,
					unresolved));
		}
		return augments;
	}

	/**
	 * 문자열 표의 이름이 우선이고, 없으면(새 증강은 표에 아직 없어요) 클라이언트 목록의 이름을 써요.
	 * 게임 자료에 이름이 없는 자리표시 증강(예: GoH_PentakillAug_Generic)은 이름 칸에 키 자체
	 * ("GoH_PentakillAug_Generic_BlankName")가 들어 있어서, 키와 같은 이름은 없는 것으로 봐요.
	 */
	private static String nameOf(Map<String, String> table, String nameKey, Map<String, String> clientNames,
			String augmentId) {
		String name = table.get(nameKey);
		if (isRealName(name, nameKey)) {
			return name;
		}
		String clientName = clientNames.get(augmentId);
		return isRealName(clientName, nameKey) ? clientName : null;
	}

	private static boolean isRealName(String name, String nameKey) {
		return name != null && !name.isBlank() && !name.toLowerCase(Locale.ROOT).equals(nameKey);
	}

	/**
	 * 클라이언트가 쓰는 증강 목록(cherry-augments.json, 이름은 옛것이지만 칼바람 증강도 들어 있어요)에서 id → 이름.
	 * 보조 자료라 못 받으면 비워 두고 경고만 남겨요.
	 */
	Map<String, String> fetchClientNames(AugmentLocale locale) {
		String url = props.cdragonBaseUrl() + "/latest/plugins/rcp-be-lol-game-data/global/" + locale.clientFolder()
				+ "/v1/cherry-augments.json";
		Map<String, String> names = new HashMap<>();
		try {
			for (JsonNode item : getTree(url)) {
				String id = item.path("augmentNameId").asString("");
				String name = item.path("nameTRA").asString("");
				if (!id.isEmpty() && !name.isBlank()) {
					names.put(id, name);
				}
			}
		}
		catch (RuntimeException e) {
			log.warn("Client augment list unavailable for {}: {}", locale.code(), e.toString());
		}
		return names;
	}

	private static String toPng(String texPath) {
		return texPath.toLowerCase(Locale.ROOT).replaceAll("\\.tex$", ".png");
	}

	/** RootSpell과 AdditionalSpells가 가리키는 항목 중 같은 파일 안에 있는 것들. */
	private static List<JsonNode> spellObjects(JsonNode kiwi, JsonNode augment) {
		List<JsonNode> spells = new ArrayList<>();
		String root = augment.path("RootSpell").asString("");
		if (kiwi.has(root)) {
			spells.add(kiwi.get(root));
		}
		for (JsonNode extra : augment.path("AdditionalSpells")) {
			if (kiwi.has(extra.asString(""))) {
				spells.add(kiwi.get(extra.asString()));
			}
		}
		return spells;
	}

	/**
	 * 3천만 바이트가 넘는 문자열 표에서 필요한 키만 스트리밍으로 골라내요. 표가 이름을 모르는 키는 `{해시}`로 두니까,
	 * 같은 해시도 함께 찾아 원래 키 이름으로 돌려줘요.
	 */
	Map<String, String> fetchStrings(AugmentLocale locale, Set<String> wantedLowerKeys) {
		String url = props.cdragonBaseUrl() + "/latest/game/" + locale.folder()
				+ "/data/menu/en_us/lol.stringtable.json";
		Map<String, String> aliases = new HashMap<>();
		for (String key : wantedLowerKeys) {
			aliases.put(StringTableKeys.hashedKey(key), key);
		}
		return builder.build().get().uri(url).exchange((request, response) -> {
			if (!response.getStatusCode().is2xxSuccessful()) {
				throw new IllegalStateException("GET " + url + " -> " + response.getStatusCode());
			}
			try (InputStream body = response.getBody()) {
				return readEntries(body, wantedLowerKeys, aliases);
			}
		});
	}

	private Map<String, String> readEntries(InputStream body, Set<String> wantedLowerKeys,
			Map<String, String> aliases) throws IOException {
		Map<String, String> found = new HashMap<>();
		try (JsonParser p = jsonMapper.createParser(body)) {
			if (p.nextToken() != JsonToken.START_OBJECT) {
				throw new IllegalStateException("String table is not an object");
			}
			while (p.nextToken() == JsonToken.PROPERTY_NAME) {
				String field = p.currentName();
				p.nextToken();
				if (!"entries".equals(field)) {
					p.skipChildren();
					continue;
				}
				while (p.nextToken() == JsonToken.PROPERTY_NAME) {
					String key = p.currentName().toLowerCase(Locale.ROOT);
					JsonToken value = p.nextToken();
					if (value == JsonToken.VALUE_STRING && wantedLowerKeys.contains(key)) {
						found.put(key, p.getString());
					}
					else if (value == JsonToken.VALUE_STRING && aliases.containsKey(key)) {
						found.putIfAbsent(aliases.get(key), p.getString());
					}
					else {
						p.skipChildren();
					}
				}
			}
		}
		return found;
	}

	private JsonNode getTree(String url) {
		return builder.build().get().uri(url).exchange((request, response) -> {
			if (!response.getStatusCode().is2xxSuccessful()) {
				throw new IllegalStateException("GET " + url + " -> " + response.getStatusCode());
			}
			try (InputStream body = response.getBody()) {
				return jsonMapper.readTree(body);
			}
		});
	}

}
