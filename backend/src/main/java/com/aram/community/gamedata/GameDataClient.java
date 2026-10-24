package com.aram.community.gamedata;

import com.aram.community.gamedata.text.AugmentDescriptionBuilder;
import com.aram.community.gamedata.text.AugmentLocale;
import com.aram.community.gamedata.text.SpellValues;
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
		}

		Map<String, String> ko = strings.get(AugmentLocale.KO);
		List<AugmentData> augments = new ArrayList<>();
		for (JsonNode v : raw) {
			String nameKey = v.path("NameTra").asString("").toLowerCase(Locale.ROOT);
			String tooltipKey = v.path("AugmentTooltipTra").asString("").toLowerCase(Locale.ROOT);
			String nameKo = ko.get(nameKey);
			String icon = v.path("AugmentSmallIconPath").asString("");
			if (nameKo == null || nameKo.isBlank() || icon.isBlank()) {
				continue;
			}
			String iconPath = toPng(icon);
			String largeIcon = v.path("AugmentLargeIconPath").asString("");
			String largeIconPath = largeIcon.isBlank() ? iconPath : toPng(largeIcon);

			SpellValues values = SpellValues.from(spellObjects(kiwi, v));
			Map<AugmentLocale, LocalizedText> texts = new EnumMap<>(AugmentLocale.class);
			int unresolved = 0;
			for (AugmentLocale locale : AugmentLocale.values()) {
				Map<String, String> table = strings.get(locale);
				String name = table.get(nameKey);
				String tooltip = table.get(tooltipKey);
				if (name == null || name.isBlank() || tooltip == null || tooltip.isBlank()) {
					continue;
				}
				AugmentDescriptionBuilder.Result result = new AugmentDescriptionBuilder(locale,
						key -> Optional.ofNullable(table.get(key.toLowerCase(Locale.ROOT))))
					.build(tooltip, values);
				texts.put(locale, new LocalizedText(name, result.description()));
				unresolved += result.unresolved().size();
			}
			augments.add(new AugmentData(v.path("AugmentNameId").asString(), nameKo, iconPath, largeIconPath,
					AugmentRarity.fromKiwi(v), texts, unresolved));
		}
		return augments;
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

	/** 3천만 바이트가 넘는 문자열 표에서 필요한 키만 스트리밍으로 골라내요. */
	Map<String, String> fetchStrings(AugmentLocale locale, Set<String> wantedLowerKeys) {
		String url = props.cdragonBaseUrl() + "/latest/game/" + locale.folder()
				+ "/data/menu/en_us/lol.stringtable.json";
		return builder.build().get().uri(url).exchange((request, response) -> {
			if (!response.getStatusCode().is2xxSuccessful()) {
				throw new IllegalStateException("GET " + url + " -> " + response.getStatusCode());
			}
			try (InputStream body = response.getBody()) {
				return readEntries(body, wantedLowerKeys);
			}
		});
	}

	private Map<String, String> readEntries(InputStream body, Set<String> wantedLowerKeys) throws IOException {
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
