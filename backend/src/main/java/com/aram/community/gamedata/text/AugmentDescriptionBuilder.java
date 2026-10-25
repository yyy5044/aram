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
			"keyword", "keywordMajor", "active", "passive", "attackSpeed", "gold", "rules", "rule",
			// 아이템 설명의 능력치 줄과 효과에 쓰여요.
			"attention", "scaleMana", "scaleHPRegen", "scaleArmor", "scaleMR", "unique", "buffedStat");

	private static final Pattern REFERENCE = Pattern.compile("\\{\\{\\s*([^}]+?)\\s*\\}\\}");

	private static final Pattern TRACKING = Pattern.compile("@f\\d+(?:\\.\\d+)?(?:\\*-?\\d+)?@");

	private static final Pattern STAT_TRACKING = Pattern.compile("<statTracking>.*?</statTracking>", Pattern.DOTALL);

	private static final Pattern VARIABLE = Pattern.compile("@([^@]+)@");

	private static final Pattern TAG = Pattern.compile("<(/?)([A-Za-z]+)[^>]*>");

	private static final Pattern ICON = Pattern.compile("%i:[^%]+%");

	private static final Pattern BR = Pattern.compile("<br\\s*/?>", Pattern.CASE_INSENSITIVE);

	private static final int MAX_REFERENCE_PASSES = 5;

	private final AugmentLocale locale;

	private final Function<String, Optional<String>> strings;

	private final SpellValueResolver resolver;

	/** 챔피언 스킬 자리에 넣을 글: 칸이 고정이면 "[W]", 아니면 "[스킬]"/"[Ability]". */
	private final String spellPlaceholder;

	public AugmentDescriptionBuilder(AugmentLocale locale, Function<String, Optional<String>> strings) {
		this(locale, strings, Optional.empty());
	}

	public AugmentDescriptionBuilder(AugmentLocale locale, Function<String, Optional<String>> strings,
			Optional<String> abilitySlot) {
		this.locale = locale;
		this.strings = strings;
		this.resolver = new SpellValueResolver(locale);
		this.spellPlaceholder = abilitySlot.map(slot -> "[" + slot + "]").orElse(locale.spellPlaceholder());
	}

	public Result build(String tooltip, SpellValues values) {
		String text = inlineReferences(tooltip == null ? "" : tooltip);
		text = removeTrackingLines(text);
		List<String> unresolved = new ArrayList<>();
		text = fillVariables(text, values, unresolved);
		text = cleanTags(text);
		String description = tidyLines(text);
		// 끝까지 남은 {{참조}}도 못 채운 것으로 기록해요(동기화 로그에 수가 찍혀요).
		Matcher leftover = REFERENCE.matcher(description);
		while (leftover.find()) {
			unresolved.add(leftover.group(1));
		}
		return new Result(description, unresolved);
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
					replacement = spellPlaceholder;
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

	/**
	 * 게임 중 누적치 줄("입힌 피해량: @f3@")을 지워요. 누적치를 빼고 나면 이름표(끝이 ':')만 남거나 아무것도 안 남는 줄만
	 * 지우고, 문장 안에 섞인 누적치는 그대로 둬요(화면에서는 ?로 보여요). 그래야 본문 문장이 통째로 사라지지 않아요.
	 */
	private static String removeTrackingLines(String text) {
		text = STAT_TRACKING.matcher(text).replaceAll("");
		List<String> kept = new ArrayList<>();
		for (String line : BR.split(text, -1)) {
			if (!TRACKING.matcher(line).find() || !isLabelOnly(line)) {
				kept.add(line);
			}
		}
		return String.join("<br>", kept);
	}

	private static boolean isLabelOnly(String line) {
		String rest = TAG.matcher(line).replaceAll("");
		rest = REFERENCE.matcher(rest).replaceAll("");
		rest = TRACKING.matcher(rest).replaceAll("").strip();
		// "추가 공격 속도: @f1.1*100@%"처럼 값 뒤에 단위가 붙어도 이름표 줄로 봐요.
		rest = rest.replaceAll("[%\\s]+$", "");
		return rest.isEmpty() || rest.endsWith(":");
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
