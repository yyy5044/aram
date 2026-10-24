package com.aram.community.gamedata.text;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tools.jackson.databind.JsonNode;

/**
 * 설명 속 `@이름@` 식 하나를 글로 만들어요. 레벨에 따라 변하는 값은 `a~b`(1~18레벨), 스탯 계수는 `(+…)`로 붙여요.
 * 만들 수 없으면 비워 두고, 부르는 쪽이 자리표시자를 그대로 남겨요.
 */
public final class SpellValueResolver {

	private static final int MAX_LEVEL = 18;

	private static final Pattern TAIL = Pattern.compile("^(.+?)\\*(-?\\d+(?:\\.\\d+)?)$");

	/** 숫자 범위(같으면 하나) 또는 이미 만들어진 글. 스탯 부분은 항상 `(+…)`로 감싸요. percent면 뒤에 %를 붙여요. */
	private record Part(Double lo, Double hi, String text, boolean stat, boolean percent) {

		static Part number(double lo, double hi) {
			return new Part(lo, hi, null, false, false);
		}

		static Part text(String text, boolean stat) {
			return new Part(null, null, text, stat, false);
		}

		boolean numeric() {
			return lo != null;
		}

		Part times(double factor) {
			return numeric() ? new Part(lo * factor, hi * factor, null, false, percent) : this;
		}

		/** 백분율 표시: 숫자에 100을 곱하고 %를 붙여요. 스탯 부분은 이미 %라서 그대로예요. */
		Part asPercent() {
			return numeric() ? new Part(lo * 100, hi * 100, null, false, true) : this;
		}

		String render() {
			if (!numeric()) {
				return text;
			}
			return formatRange(lo, hi) + (percent ? "%" : "");
		}

	}

	private final AugmentLocale locale;

	public SpellValueResolver(AugmentLocale locale) {
		this.locale = locale;
	}

	public Optional<String> resolve(String expression, SpellValues values) {
		String name = expression.trim();
		double factor = 1;
		Matcher m = TAIL.matcher(name);
		if (m.matches()) {
			name = m.group(1).trim();
			factor = Double.parseDouble(m.group(2));
		}
		Optional<List<Part>> parts = parts(name, values, 0);
		if (parts.isEmpty()) {
			return Optional.empty();
		}
		// 글로 만들어진 부분(합·곱·스탯)이나 이미 백분율인 값에는 꼬리를 곱할 수 없어요. 틀린 숫자 대신 자리표시자를 남겨요.
		if (factor != 1 && parts.get().stream().anyMatch(p -> !p.numeric() || p.percent())) {
			return Optional.empty();
		}
		// 게임 툴팁처럼 숫자가 먼저, 스탯 계수 "(+…)"가 뒤에 오게 해요. 자료의 순서는 증강마다 달라요.
		List<Part> ordered = parts.get().stream().sorted(Comparator.comparing(Part::stat)).toList();
		StringBuilder sb = new StringBuilder();
		boolean first = true;
		for (Part part : ordered) {
			Part scaled = part.times(factor);
			if (!first) {
				sb.append(' ');
			}
			if (first && !scaled.stat()) {
				sb.append(scaled.render());
			}
			else if (scaled.stat()) {
				sb.append(scaled.render());
			}
			else {
				sb.append("(+").append(scaled.render()).append(')');
			}
			first = false;
		}
		return Optional.of(sb.toString());
	}

	private Optional<List<Part>> parts(String name, SpellValues values, int depth) {
		if (depth > 5) {
			return Optional.empty();
		}
		Optional<List<Double>> data = values.dataValue(name);
		if (data.isPresent()) {
			return Optional.of(List.of(range(data.get())));
		}
		Optional<JsonNode> calc = values.calculation(name);
		if (calc.isEmpty()) {
			return Optional.empty();
		}
		JsonNode c = calc.get();
		if ("GameCalculationModified".equals(c.path("__type").asString(""))) {
			Optional<List<Part>> base = parts(c.path("mModifiedGameCalculation").asString(""), values, depth + 1);
			Optional<Part> multiplier = part(c.path("mMultiplier"), values);
			if (base.isEmpty() || multiplier.isEmpty() || !multiplier.get().numeric()) {
				return Optional.empty();
			}
			double factor = multiplier.get().lo();
			return Optional.of(displayAsPercent(c, base.get().stream().map(p -> p.times(factor)).toList()));
		}
		List<Part> result = new ArrayList<>();
		for (JsonNode fp : c.path("mFormulaParts")) {
			Optional<Part> part = part(fp, values);
			if (part.isEmpty()) {
				return Optional.empty();
			}
			result.add(part.get());
		}
		return result.isEmpty() ? Optional.empty() : Optional.of(displayAsPercent(c, result));
	}

	private static List<Part> displayAsPercent(JsonNode calc, List<Part> parts) {
		if (!calc.path("mDisplayAsPercent").asBoolean(false)) {
			return parts;
		}
		return parts.stream().map(Part::asPercent).toList();
	}

	private Optional<Part> part(JsonNode fp, SpellValues values) {
		String type = fp.path("__type").asString("");
		// 이름이 해시로만 남은 종류 중, 두 수치 사이 범위는 모양으로 알아볼 수 있어요.
		if (fp.has("StartDataValue") && fp.has("EndDataValue")) {
			Optional<List<Double>> lo = values.dataValue(fp.path("StartDataValue").asString(""));
			Optional<List<Double>> hi = values.dataValue(fp.path("EndDataValue").asString(""));
			if (lo.isEmpty() || hi.isEmpty()) {
				return Optional.empty();
			}
			return Optional.of(Part.number(lo.get().get(0), hi.get().get(0)));
		}
		switch (type) {
			case "NumberCalculationPart": {
				double n = fp.path("mNumber").asDouble(0);
				return Optional.of(Part.number(n, n));
			}
			case "NamedDataValueCalculationPart":
				return values.dataValue(fp.path("mDataValue").asString("")).map(SpellValueResolver::range);
			case "ByCharLevelInterpolationCalculationPart":
				return Optional.of(Part.number(fp.path("mStartValue").asDouble(0), fp.path("mEndValue").asDouble(0)));
			case "ByCharLevelBreakpointsCalculationPart":
				return breakpointsAtMaxLevel(fp).map(max -> Part.number(fp.path("mLevel1Value").asDouble(0), max));
			case "StatByCoefficientCalculationPart":
				return statPart(fp, fp.path("mCoefficient").asDouble(0));
			case "StatByNamedDataValueCalculationPart": {
				Optional<List<Double>> data = values.dataValue(fp.path("mDataValue").asString(""));
				if (data.isEmpty() || !allSame(data.get())) {
					return Optional.empty();
				}
				return statPart(fp, data.get().get(0));
			}
			case "SumOfSubPartsCalculationPart":
				return joinSubparts(fp, values, " + ");
			case "ProductOfSubPartsCalculationPart":
				return joinSubparts(fp, values, " × ");
			default:
				return Optional.empty();
		}
	}

	private Optional<Part> statPart(JsonNode fp, double coefficient) {
		Optional<String> stat = locale.statName(fp.path("mStat").asInt(0));
		if (stat.isEmpty()) {
			return Optional.empty();
		}
		String label = locale.statPrefix(fp.path("mStatFormula").asInt(0)) + stat.get();
		return Optional.of(Part.text(locale.statScaling(formatNumber(coefficient * 100), label), true));
	}

	private Optional<Part> joinSubparts(JsonNode fp, SpellValues values, String separator) {
		List<JsonNode> subs = new ArrayList<>();
		fp.path("mSubparts").forEach(subs::add);
		// 곱은 mSubparts 대신 mPart1·mPart2로 올 때도 있어요.
		if (subs.isEmpty() && fp.has("mPart1") && fp.has("mPart2")) {
			subs.add(fp.get("mPart1"));
			subs.add(fp.get("mPart2"));
		}
		List<String> rendered = new ArrayList<>();
		for (JsonNode sub : subs) {
			Optional<Part> part = part(sub, values);
			if (part.isEmpty()) {
				return Optional.empty();
			}
			rendered.add(part.get().render());
		}
		return rendered.isEmpty() ? Optional.empty() : Optional.of(Part.text(String.join(separator, rendered), false));
	}

	/**
	 * 1레벨 값에서 시작해 2~18레벨마다 "레벨당 증가분"을 더해요. 증가분은 처음에 mInitialBonusPerLevel이고,
	 * 각 mBreakpoints의 mLevel 이후부터 mAdditionalBonusAtThisLevel만큼 누적해서 커져요.
	 * 모르는 모양의 구간(이 필드가 없는 것)은 값을 지어내지 않고 비워요.
	 */
	private static Optional<Double> breakpointsAtMaxLevel(JsonNode fp) {
		for (JsonNode bp : fp.path("mBreakpoints")) {
			if (!bp.has("mAdditionalBonusAtThisLevel")) {
				return Optional.empty();
			}
		}
		double value = fp.path("mLevel1Value").asDouble(0);
		double perLevel = fp.path("mInitialBonusPerLevel").asDouble(0);
		for (int level = 2; level <= MAX_LEVEL; level++) {
			for (JsonNode bp : fp.path("mBreakpoints")) {
				if (bp.path("mLevel").asInt(0) == level) {
					perLevel += bp.path("mAdditionalBonusAtThisLevel").asDouble(0);
				}
			}
			value += perLevel;
		}
		return Optional.of(value);
	}

	private static Part range(List<Double> values) {
		return Part.number(values.get(0), values.get(values.size() - 1));
	}

	private static boolean allSame(List<Double> values) {
		return values.stream().allMatch(v -> Math.abs(v - values.get(0)) < 1e-6);
	}

	private static String formatRange(double lo, double hi) {
		String a = formatNumber(lo);
		String b = formatNumber(hi);
		return a.equals(b) ? a : a + "~" + b;
	}

	/** 정수는 그대로, 소수는 한 자리까지(끝 0은 지움). */
	public static String formatNumber(double v) {
		double rounded = Math.round(v * 10) / 10.0;
		if (Math.abs(rounded - Math.rint(rounded)) < 1e-9) {
			return String.valueOf((long) Math.rint(rounded));
		}
		return String.format(Locale.ROOT, "%.1f", rounded);
	}

}
