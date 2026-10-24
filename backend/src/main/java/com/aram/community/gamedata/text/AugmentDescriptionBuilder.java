package com.aram.community.gamedata.text;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 게임 툴팁 문자열을 화면에 보일 설명으로 만들어요. 순서: 문자열 참조 치환 → 집계 줄 제거 → 수치 채우기 → 표식 정리 →
 * 빈 줄 다듬기. 못 채운 자리표시자는 그대로 두고 {@link Result#unresolved()}에 남겨요.
 */
public final class AugmentDescriptionBuilder {

	public record Result(String description, List<String> unresolved) {
	}

	/** 화면이 색으로 바꾸는 표식. 이것과 br만 남겨요. */
	static final Set<String> COLOR_TAGS = Set.of("magicDamage", "scaleAP", "physicalDamage", "scaleAD", "trueDamage",
			"health", "scaleHealth", "healing", "shield", "speed", "omnivamp", "lifeSteal", "lifesteal", "status",
			"keyword", "keywordMajor", "active", "passive", "attackSpeed", "gold", "rules", "rule");

	private static final Pattern REFERENCE = Pattern.compile("\\{\\{\\s*([^}]+?)\\s*\\}\\}");

	private static final Pattern TRACKING = Pattern.compile("@f\\d+(?:\\.\\d+)?@");

	private static final Pattern STAT_TRACKING = Pattern.compile("<statTracking>.*?</statTracking>", Pattern.DOTALL);

	private static final Pattern VARIABLE = Pattern.compile("@([^@]+)@");

	private static final Pattern TAG = Pattern.compile("<(/?)([A-Za-z]+)[^>]*>");

	private static final Pattern ICON = Pattern.compile("%i:[^%]+%");

	private static final Pattern BR = Pattern.compile("<br\\s*/?>", Pattern.CASE_INSENSITIVE);

	private static final int MAX_REFERENCE_PASSES = 5;

	private final AugmentLocale locale;

	private final Function<String, Optional<String>> strings;

	private final SpellValueResolver resolver;

	public AugmentDescriptionBuilder(AugmentLocale locale, Function<String, Optional<String>> strings) {
		this.locale = locale;
		this.strings = strings;
		this.resolver = new SpellValueResolver(locale);
	}

	public Result build(String tooltip, SpellValues values) {
		String text = inlineReferences(tooltip == null ? "" : tooltip);
		text = removeTrackingLines(text);
		List<String> unresolved = new ArrayList<>();
		text = fillVariables(text, values, unresolved);
		text = cleanTags(text);
		return new Result(tidyLines(text), unresolved);
	}

	private String inlineReferences(String text) {
		for (int pass = 0; pass < MAX_REFERENCE_PASSES; pass++) {
			Matcher m = REFERENCE.matcher(text);
			StringBuilder sb = new StringBuilder();
			boolean changed = false;
			while (m.find()) {
				String key = m.group(1);
				String replacement;
				if (key.equalsIgnoreCase("SpellName") || key.equalsIgnoreCase("SpellNameOnly")) {
					replacement = locale.spellPlaceholder();
				}
				else {
					replacement = strings.apply(key).orElse(null);
				}
				if (replacement == null) {
					m.appendReplacement(sb, Matcher.quoteReplacement(m.group()));
				}
				else {
					m.appendReplacement(sb, Matcher.quoteReplacement(replacement));
					changed = true;
				}
			}
			m.appendTail(sb);
			text = sb.toString();
			if (!changed) {
				break;
			}
		}
		return text;
	}

	private static String removeTrackingLines(String text) {
		text = STAT_TRACKING.matcher(text).replaceAll("");
		List<String> kept = new ArrayList<>();
		for (String line : BR.split(text, -1)) {
			if (!TRACKING.matcher(line).find()) {
				kept.add(line);
			}
		}
		return String.join("<br>", kept);
	}

	private String fillVariables(String text, SpellValues values, List<String> unresolved) {
		Matcher m = VARIABLE.matcher(text);
		StringBuilder sb = new StringBuilder();
		while (m.find()) {
			String expression = m.group(1);
			Optional<String> value = resolver.resolve(expression, values);
			if (value.isPresent()) {
				m.appendReplacement(sb, Matcher.quoteReplacement(value.get()));
			}
			else {
				unresolved.add(expression);
				m.appendReplacement(sb, Matcher.quoteReplacement(m.group()));
			}
		}
		m.appendTail(sb);
		return sb.toString();
	}

	private static String cleanTags(String text) {
		text = ICON.matcher(text).replaceAll("");
		Matcher m = TAG.matcher(text);
		StringBuilder sb = new StringBuilder();
		while (m.find()) {
			String name = m.group(2);
			if (name.equalsIgnoreCase("br")) {
				m.appendReplacement(sb, "<br>");
			}
			else if (COLOR_TAGS.contains(name)) {
				m.appendReplacement(sb, Matcher.quoteReplacement("<" + m.group(1) + name + ">"));
			}
			else {
				m.appendReplacement(sb, "");
			}
		}
		m.appendTail(sb);
		return sb.toString().replaceAll(" {2,}", " ");
	}

	/** 줄마다 앞뒤 공백을 지우고, 앞뒤 빈 줄을 없애고, 연속 빈 줄은 하나로 줄여요. */
	private static String tidyLines(String text) {
		List<String> lines = new ArrayList<>();
		for (String line : text.split("<br>", -1)) {
			String trimmed = line.strip();
			if (trimmed.isEmpty() && (lines.isEmpty() || lines.get(lines.size() - 1).isEmpty())) {
				continue;
			}
			lines.add(trimmed);
		}
		while (!lines.isEmpty() && lines.get(lines.size() - 1).isEmpty()) {
			lines.remove(lines.size() - 1);
		}
		return String.join("<br>", lines);
	}

}
