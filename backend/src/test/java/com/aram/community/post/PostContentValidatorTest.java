package com.aram.community.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import java.util.UUID;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

public class PostContentValidatorTest {

	private final PostContentValidator validator = new PostContentValidator(JsonMapper.builder().build());

	public static String paragraph(String innerJson) {
		return "{\"type\":\"paragraph\",\"content\":[" + innerJson + "]}";
	}

	public static String text(String t) {
		return "{\"type\":\"text\",\"text\":\"" + t + "\"}";
	}

	public static String doc(String... blocks) {
		return "{\"type\":\"doc\",\"content\":[" + String.join(",", blocks) + "]}";
	}

	public static String image(UUID id) {
		return "{\"type\":\"image\",\"attrs\":{\"src\":\"/api/images/" + id + "\"}}";
	}

	public static String video(UUID id) {
		return videoSrc("/api/videos/" + id);
	}

	public static String mention(String kind, String id, String label) {
		return "{\"type\":\"tagMention\",\"attrs\":{\"kind\":\"" + kind + "\",\"id\":\"" + id + "\",\"label\":\"" + label
				+ "\"}}";
	}

	public static String videoSrc(String src) {
		return "{\"type\":\"video\",\"attrs\":{\"src\":\"" + src + "\"}}";
	}

	private void assertRejected(String json, String message) {
		ThrowingCallable call = () -> validator.validate(json);
		assertThatThrownBy(call).isInstanceOf(ApiException.class).satisfies(e -> {
			ApiException api = (ApiException) e;
			assertThat(api.code()).isEqualTo(ErrorCode.INVALID_INPUT);
			assertThat(api.fieldErrors()).containsEntry("content", message);
		});
	}

	@Test
	void acceptsAllowedNodesAndExtractsText() {
		String bold = "{\"type\":\"text\",\"text\":\"안녕\",\"marks\":[{\"type\":\"bold\"}]}";
		String list = "{\"type\":\"bulletList\",\"content\":[{\"type\":\"listItem\",\"content\":[" + paragraph(text("목록"))
				+ "]}]}";
		String quote = "{\"type\":\"blockquote\",\"content\":[" + paragraph(text("인용")) + "]}";

		ValidatedContent result = validator.validate(doc(paragraph(bold), list, quote));

		assertThat(result.plainText()).contains("안녕").contains("목록").contains("인용");
		assertThat(result.imageIds()).isEmpty();
		assertThat(result.normalizedJson()).contains("\"bulletList\"");
	}

	@Test
	void rejectsDisallowedNode() {
		assertRejected(doc("{\"type\":\"heading\",\"content\":[" + text("제목") + "]}"), "지원하지 않는 본문 형식이에요");
	}

	@Test
	void rejectsDisallowedMark() {
		assertRejected(doc(paragraph("{\"type\":\"text\",\"text\":\"링크\",\"marks\":[{\"type\":\"link\"}]}")),
				"지원하지 않는 본문 형식이에요");
	}

	@Test
	void rejectsNonDocRootAndGarbage() {
		assertRejected(paragraph(text("hi")), "지원하지 않는 본문 형식이에요");
		assertRejected("not json", "지원하지 않는 본문 형식이에요");
	}

	@Test
	void rejectsForeignImageSrc() {
		assertRejected(doc(paragraph(text("본문")), "{\"type\":\"image\",\"attrs\":{\"src\":\"https://evil.example/x.png\"}}"),
				"지원하지 않는 본문 형식이에요");
	}

	@Test
	void collectsImageIds() {
		UUID a = UUID.randomUUID();
		UUID b = UUID.randomUUID();

		ValidatedContent result = validator.validate(doc(paragraph(text("사진")), image(a), image(b)));

		assertThat(result.imageIds()).containsExactly(a, b);
	}

	@Test
	void rejectsElevenImages() {
		String[] blocks = new String[12];
		blocks[0] = paragraph(text("사진 많음"));
		for (int i = 1; i <= 11; i++) {
			blocks[i] = image(UUID.randomUUID());
		}
		assertRejected(doc(blocks), "이미지는 한 글에 10장까지 넣을 수 있어요");
	}

	@Test
	void rejectsWhitespaceOnlyBody() {
		assertRejected(doc(paragraph(text("   "))), "본문을 입력해주세요");
	}

	@Test
	void acceptsClipWithoutText() {
		UUID id = UUID.randomUUID();
		ValidatedContent result = validator.validate(doc(video(id)));
		assertThat(result.plainText()).isEmpty();
		assertThat(result.videoIds()).containsExactly(id);
	}

	@Test
	void acceptsPhotoWithoutText() {
		UUID id = UUID.randomUUID();
		assertThat(validator.validate(doc(paragraph(text("  ")), image(id))).imageIds()).containsExactly(id);
	}

	@Test
	void rejectsEmptyParagraphsOnly() {
		assertRejected(doc("{\"type\":\"paragraph\"}"), "본문을 입력해주세요");
	}

	@Test
	void rejectsTooLongBody() {
		assertRejected(doc(paragraph(text("가".repeat(10_001)))), "본문은 10,000자 이하로 써주세요");
	}

	@Test
	void acceptsBodyOfExactlyTenThousandChars() {
		assertThat(validator.validate(doc(paragraph(text("가".repeat(10_000))))).plainText()).hasSize(10_000);
	}

	@Test
	void acceptsVideoNode() {
		UUID id = UUID.randomUUID();
		assertThat(validator.validate(doc(paragraph(text("펜타킬")), video(id))).videoIds()).containsExactly(id);
	}

	@Test
	void rejectsForeignVideoSrc() {
		assertRejected(doc(paragraph(text("a")), videoSrc("https://x.com/a.mp4")), "지원하지 않는 본문 형식이에요");
		assertRejected(doc(paragraph(text("a")), videoSrc("/api/images/" + UUID.randomUUID())), "지원하지 않는 본문 형식이에요");
	}

	@Test
	void rejectsVideoWithoutSrc() {
		assertRejected(doc(paragraph(text("a")), "{\"type\":\"video\",\"attrs\":{\"src\":null}}"), "지원하지 않는 본문 형식이에요");
	}

	@Test
	void rejectsMoreThanThreeVideoNodesEvenIfSameClip() {
		UUID id = UUID.randomUUID();
		assertRejected(doc(paragraph(text("a")), video(id), video(id), video(id), video(id)),
				"영상은 한 글에 3개까지 넣을 수 있어요");
	}

	@Test
	void sameClipTwiceCountsOnceInIds() {
		UUID id = UUID.randomUUID();
		assertThat(validator.validate(doc(paragraph(text("a")), video(id), video(id))).videoIds()).containsExactly(id);
	}

	@Test
	void acceptsMentionAndCountsItsLabelAsText() {
		ValidatedContent result = validator
			.validate(doc(paragraph(text("오늘은 ") + "," + mention("champion", "XinZhao", "신짜오"))));
		assertThat(result.mentions()).containsExactly(new Mention("champion", "XinZhao"));
		assertThat(result.plainText()).contains("신짜오");
	}

	@Test
	void acceptsMentionOnlyBody() {
		assertThat(validator.validate(doc(paragraph(mention("augment", "StoneGuts", "거석상의 용기")))).mentions())
			.containsExactly(new Mention("augment", "StoneGuts"));
	}

	@Test
	void acceptsMentionInsideBlockquote() {
		String quote = "{\"type\":\"blockquote\",\"content\":[" + paragraph(mention("champion", "Jinx", "징크스")) + "]}";
		assertThat(validator.validate(doc(quote)).mentions()).hasSize(1);
	}

	@Test
	void rejectsBadMentionAttributes() {
		assertRejected(doc(paragraph(mention("monster", "Jinx", "징크스"))), "지원하지 않는 본문 형식이에요");
		assertRejected(doc(paragraph(mention("champion", "a-b", "징크스"))), "지원하지 않는 본문 형식이에요");
		assertRejected(doc(paragraph(mention("champion", "A".repeat(41), "징크스"))), "지원하지 않는 본문 형식이에요");
		assertRejected(doc(paragraph(mention("champion", "Jinx", ""))), "지원하지 않는 본문 형식이에요");
		assertRejected(doc(paragraph(mention("champion", "Jinx", "가".repeat(51)))), "지원하지 않는 본문 형식이에요");
	}

	@Test
	void rejectsMentionWithContent() {
		assertRejected(doc(paragraph("{\"type\":\"tagMention\",\"attrs\":{\"kind\":\"champion\",\"id\":\"Jinx\",\"label\":\"징크스\"},\"content\":["
				+ text("x") + "]}")), "지원하지 않는 본문 형식이에요");
	}

	@Test
	void rejectsMoreThanThirtyMentions() {
		String many = String.join(",", java.util.Collections.nCopies(31, mention("champion", "Jinx", "징크스")));
		assertRejected(doc(paragraph(many)), "본문 태그는 한 글에 30개까지 넣을 수 있어요");
	}

	@Test
	void sameMentionTwiceListedOnce() {
		String two = mention("champion", "Jinx", "징크스") + "," + mention("champion", "Jinx", "징크스");
		assertThat(validator.validate(doc(paragraph(two))).mentions()).containsExactly(new Mention("champion", "Jinx"));
	}

}
