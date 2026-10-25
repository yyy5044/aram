package com.aram.community.gamedata.item;

import com.aram.community.gamedata.text.AugmentDescriptionBuilder;
import com.aram.community.gamedata.text.AugmentLocale;
import com.aram.community.gamedata.text.SpellValues;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 아이템 설명 틀(`generatedtip_item_{id}_description`)을 화면에 보일 설명으로 만들어요. 틀은 `<section>` 여러 개라서
 * 내용 있는 section만 `<br>`로 이어 붙이고(빈 section과 `<flavorText>` 이야기 글은 버려요), 나머지는 증강 설명과 같은
 * 방법({@link AugmentDescriptionBuilder})으로 채워요.
 */
public final class ItemDescriptionBuilder {

	/** unresolved는 못 채운 자리표시자와 못 찾은 참조의 수예요(동기화 로그용). */
	public record Result(String description, int unresolved) {
	}

	private static final Pattern SECTION = Pattern.compile("<section>(.*?)</section>", Pattern.DOTALL);

	private static final Pattern FLAVOR = Pattern.compile("<flavorText>.*?</flavorText>", Pattern.DOTALL);

	private static final Pattern REFERENCE = Pattern.compile("\\{\\{[^}]*\\}\\}");

	/** 능력치 줄의 아이콘(`<attention>%i:scaleHealth% 900</attention>`). 뒤 공백까지 지워야 색 글이 공백으로 시작하지 않아요. */
	private static final Pattern ICON = Pattern.compile("%i:[^%]+%\\s*");

	private final AugmentLocale locale;

	private final Function<String, Optional<String>> strings;

	public ItemDescriptionBuilder(AugmentLocale locale, Function<String, Optional<String>> strings) {
		this.locale = locale;
		this.strings = strings;
	}

	public Result build(String template, SpellValues values) {
		String joined = joinSections(template == null ? "" : template);
		// 못 찾은 {{참조}}는 화면에 ?로 남기기보다 지워요(대부분 "(30초)" 같은 덧붙임 글이에요). 빈 글로 채워서
		// 증강 설명과 같은 줄 다듬기를 거치게 하고, 수는 따로 세요.
		int[] missing = { 0 };
		Function<String, Optional<String>> orBlank = key -> {
			Optional<String> found = strings.apply(key);
			if (found.isEmpty()) {
				missing[0]++;
				return Optional.of("");
			}
			return found;
		};
		AugmentDescriptionBuilder.Result result = new AugmentDescriptionBuilder(locale, orBlank).build(joined, values);
		// 참조를 다섯 번 넘게 따라가도 남은 것까지 혹시 모르니 지워요(그 수는 이미 result.unresolved에 있어요).
		String description = REFERENCE.matcher(result.description()).replaceAll("").strip();
		return new Result(description, result.unresolved().size() + missing[0]);
	}

	private static String joinSections(String template) {
		String text = FLAVOR.matcher(template).replaceAll("");
		text = ICON.matcher(text).replaceAll("");
		Matcher m = SECTION.matcher(text);
		List<String> sections = new ArrayList<>();
		boolean found = false;
		while (m.find()) {
			found = true;
			String body = m.group(1).strip();
			if (!body.isEmpty()) {
				sections.add(body);
			}
		}
		// section이 없는 틀은 그대로 써요.
		return found ? String.join("<br>", sections) : text;
	}

}
