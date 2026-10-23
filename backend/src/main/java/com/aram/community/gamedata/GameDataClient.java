package com.aram.community.gamedata;

import java.io.IOException;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
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

	public record AugmentData(String id, String nameKo, String iconPath) {
	}

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

	public List<AugmentData> fetchAugments() {
		JsonNode kiwi = getTree(props.cdragonBaseUrl() + "/latest/game/maps/modespecificdata/kiwi.bin.json");
		List<JsonNode> raw = new ArrayList<>();
		Set<String> nameKeys = new HashSet<>();
		kiwi.properties().forEach(e -> {
			JsonNode v = e.getValue();
			if ("AugmentData".equals(v.path("__type").asString(""))) {
				raw.add(v);
				nameKeys.add(v.path("NameTra").asString("").toLowerCase(Locale.ROOT));
			}
		});
		Map<String, String> names = fetchStrings(nameKeys);

		List<AugmentData> augments = new ArrayList<>();
		for (JsonNode v : raw) {
			String name = names.get(v.path("NameTra").asString("").toLowerCase(Locale.ROOT));
			String icon = v.path("AugmentSmallIconPath").asString("");
			if (name == null || name.isBlank() || icon.isBlank()) {
				continue;
			}
			String iconPath = icon.toLowerCase(Locale.ROOT).replaceAll("\\.tex$", ".png");
			augments.add(new AugmentData(v.path("AugmentNameId").asString(), name, iconPath));
		}
		return augments;
	}

	/** 3천만 바이트가 넘는 문자열 표에서 필요한 키만 스트리밍으로 골라내요. */
	private Map<String, String> fetchStrings(Set<String> wantedLowerKeys) {
		String url = props.cdragonBaseUrl() + "/latest/game/ko_kr/data/menu/en_us/lol.stringtable.json";
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
