package com.aram.community.post;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Tiptap 본문 JSON 검사. 허용한 노드와 마크만 통과시키고, 이미지·영상은 우리 서버 주소만 받아요. 화면은 같은 규칙의 편집기로만 그리므로 스크립트가 끼어들 수 없어요.
 */
@Component
public class PostContentValidator {

	static final int MAX_TEXT = 10_000;

	static final int MAX_IMAGES = 10;

	static final int MAX_VIDEOS = 3;

	static final int MAX_MENTIONS = 30;

	private static final Set<String> NODES = Set.of("doc", "paragraph", "text", "hardBreak", "bulletList",
			"orderedList", "listItem", "blockquote", "image", "video", "tagMention");

	private static final Set<String> BLOCKS = Set.of("paragraph", "listItem", "blockquote");

	private static final Set<String> MARKS = Set.of("bold", "italic");

	private static final Pattern IMAGE_SRC = Pattern.compile("^/api/images/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$");

	private static final Pattern VIDEO_SRC = Pattern.compile("^/api/videos/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$");

	private static final Set<String> MENTION_KINDS = Set.of("champion", "augment", "item");

	private static final Pattern MENTION_ID = Pattern.compile("^[A-Za-z0-9_]{1,40}$");

	// 아이템 번호는 int에 들어가는 숫자(최대 9자리)만 받아요.
	private static final Pattern ITEM_MENTION_ID = Pattern.compile("^\\d{1,9}$");

	private static final String UNSUPPORTED = "지원하지 않는 본문 형식이에요";

	private final JsonMapper jsonMapper;

	public PostContentValidator(JsonMapper jsonMapper) {
		this.jsonMapper = jsonMapper;
	}

	public ValidatedContent validate(String contentJson) {
		JsonNode root;
		try {
			root = jsonMapper.readTree(contentJson);
		}
		catch (JacksonException | IllegalArgumentException e) {
			throw invalid(UNSUPPORTED);
		}
		if (root == null || !root.isObject() || !"doc".equals(root.path("type").asString(""))) {
			throw invalid(UNSUPPORTED);
		}
		StringBuilder text = new StringBuilder();
		List<UUID> images = new ArrayList<>();
		List<UUID> videos = new ArrayList<>();
		List<Mention> mentions = new ArrayList<>();
		walk(root, text, images, videos, mentions);

		String plain = text.toString().strip();
		// 제목과 클립(또는 사진)만 있는 글도 올릴 수 있어요. 글자·사진·영상이 모두 없을 때만 막아요.
		if (plain.isEmpty() && images.isEmpty() && videos.isEmpty()) {
			throw invalid("본문을 입력해주세요");
		}
		if (plain.length() > MAX_TEXT) {
			throw invalid("본문은 10,000자 이하로 써주세요");
		}
		if (images.size() > MAX_IMAGES) {
			throw invalid("이미지는 한 글에 10장까지 넣을 수 있어요");
		}
		// 영상 칸 수로 세요. 같은 클립을 복사해 여러 번 넣어도 칸마다 하나예요.
		if (videos.size() > MAX_VIDEOS) {
			throw invalid("영상은 한 글에 3개까지 넣을 수 있어요");
		}
		if (mentions.size() > MAX_MENTIONS) {
			throw invalid("본문 태그는 한 글에 30개까지 넣을 수 있어요");
		}
		return new ValidatedContent(jsonMapper.writeValueAsString(root), plain, List.copyOf(images),
				List.copyOf(new LinkedHashSet<>(videos)), List.copyOf(new LinkedHashSet<>(mentions)));
	}

	private void walk(JsonNode node, StringBuilder text, List<UUID> images, List<UUID> videos, List<Mention> mentions) {
		if (!node.isObject()) {
			throw invalid(UNSUPPORTED);
		}
		String type = node.path("type").asString("");
		if (!NODES.contains(type)) {
			throw invalid(UNSUPPORTED);
		}
		JsonNode marks = node.get("marks");
		if (marks != null) {
			if (!marks.isArray()) {
				throw invalid(UNSUPPORTED);
			}
			for (JsonNode mark : marks) {
				if (!MARKS.contains(mark.path("type").asString(""))) {
					throw invalid(UNSUPPORTED);
				}
			}
		}
		switch (type) {
			case "text" -> text.append(node.path("text").asString(""));
			case "hardBreak" -> text.append('\n');
			case "image" -> {
				Matcher m = IMAGE_SRC.matcher(node.path("attrs").path("src").asString(""));
				if (!m.matches()) {
					throw invalid(UNSUPPORTED);
				}
				images.add(UUID.fromString(m.group(1)));
			}
			case "video" -> {
				Matcher m = VIDEO_SRC.matcher(node.path("attrs").path("src").asString(""));
				if (!m.matches() || node.get("content") != null) {
					throw invalid(UNSUPPORTED);
				}
				videos.add(UUID.fromString(m.group(1)));
			}
			case "tagMention" -> {
				JsonNode attrs = node.path("attrs");
				String kind = attrs.path("kind").asString("");
				String id = attrs.path("id").asString("");
				String label = attrs.path("label").asString("");
				Pattern idPattern = "item".equals(kind) ? ITEM_MENTION_ID : MENTION_ID;
				if (!MENTION_KINDS.contains(kind) || !idPattern.matcher(id).matches() || label.isBlank()
						|| label.length() > 50 || node.get("content") != null) {
					throw invalid(UNSUPPORTED);
				}
				// 박스 이름도 본문 글자예요. 박스만 있는 글도 글자가 있는 글로 치고, 검색에도 걸려요.
				text.append(label);
				mentions.add(new Mention(kind, id));
			}
			default -> {
			}
		}
		JsonNode children = node.get("content");
		if (children != null) {
			if (!children.isArray()) {
				throw invalid(UNSUPPORTED);
			}
			for (JsonNode child : children) {
				walk(child, text, images, videos, mentions);
			}
		}
		if (BLOCKS.contains(type)) {
			text.append('\n');
		}
	}

	private static ApiException invalid(String message) {
		return new ApiException(ErrorCode.INVALID_INPUT, Map.of("content", message));
	}

}
