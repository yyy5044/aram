package com.aram.community.gamedata.text;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class SpellValueResolverTest {

	static final JsonMapper MAPPER = JsonMapper.builder().build();

	SpellValueResolver ko = new SpellValueResolver(AugmentLocale.KO);

	SpellValueResolver en = new SpellValueResolver(AugmentLocale.EN);

	/** `{"mSpell": …}` 항목 하나로 SpellValues를 만들어요. */
	static SpellValues spell(String mSpellJson) {
		JsonNode node = MAPPER.readTree("{\"mSpell\": " + mSpellJson + "}");
		return SpellValues.from(List.of(node));
	}

	static String dataValue(String name, double... values) {
		StringBuilder sb = new StringBuilder();
		for (double v : values) {
			sb.append(sb.isEmpty() ? "" : ",").append(v);
		}
		return "{\"name\":\"" + name + "\",\"values\":[" + sb + "],\"__type\":\"SpellDataValue\"}";
	}

	static String same(String name, double v) {
		return dataValue(name, v, v, v, v, v, v, v);
	}

	@Test
	void constantDataValue() {
		SpellValues v = spell("{\"DataValues\":[" + same("MSMod", 0.5) + "]}");
		assertThat(ko.resolve("MSMod*100", v)).contains("50");
	}

	@Test
	void varyingDataValueIsRange() {
		SpellValues v = spell("{\"DataValues\":[" + dataValue("Bolt", 1, 1, 2, 2, 3, 3, 3) + "]}");
		assertThat(ko.resolve("Bolt", v)).contains("1~3");
	}

	@Test
	void negativeAndThousandTails() {
		SpellValues v = spell("{\"DataValues\":[" + same("X", 0.25) + "]}");
		assertThat(ko.resolve("X*-100", v)).contains("-25");
		assertThat(ko.resolve("X*1000", v)).contains("250");
	}

	@Test
	void levelInterpolation() {
		SpellValues v = spell("{\"mSpellCalculations\":{\"APPerLevel\":{\"mFormulaParts\":["
				+ "{\"mStartValue\":75.0,\"mEndValue\":150.0,\"__type\":\"ByCharLevelInterpolationCalculationPart\"}],"
				+ "\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("APPerLevel", v)).contains("75~150");
	}

	@Test
	void breakpointsAddPerLevel() {
		SpellValues linear = spell("{\"mSpellCalculations\":{\"Dmg\":{\"mFormulaParts\":["
				+ "{\"mLevel1Value\":70.0,\"mInitialBonusPerLevel\":10.0,\"__type\":\"ByCharLevelBreakpointsCalculationPart\"}],"
				+ "\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("Dmg", linear)).contains("70~240");

		SpellValues stepped = spell("{\"mSpellCalculations\":{\"Inc\":{\"mFormulaParts\":["
				+ "{\"mLevel1Value\":1.0,\"mBreakpoints\":[{\"mLevel\":7,\"mAdditionalBonusAtThisLevel\":1.0,\"__type\":\"Breakpoint\"},"
				+ "{\"mLevel\":11,\"mAdditionalBonusAtThisLevel\":1.0,\"__type\":\"Breakpoint\"}],"
				+ "\"__type\":\"ByCharLevelBreakpointsCalculationPart\"}],\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("Inc", stepped)).contains("1~21");
	}

	@Test
	void statByNamedDataValueKo() {
		SpellValues v = spell("{\"DataValues\":[" + same("HealthScalar", 0.04) + "],"
				+ "\"mSpellCalculations\":{\"TotalShield\":{\"mFormulaParts\":["
				+ "{\"mStartValue\":150.0,\"mEndValue\":450.0,\"__type\":\"ByCharLevelInterpolationCalculationPart\"},"
				+ "{\"mStat\":12,\"mDataValue\":\"HealthScalar\",\"__type\":\"StatByNamedDataValueCalculationPart\"}],"
				+ "\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("TotalShield", v)).contains("150~450 (+최대 체력의 4%)");
		assertThat(en.resolve("TotalShield", v)).contains("150~450 (+4% max Health)");
	}

	@Test
	void statByCoefficientWithFormula() {
		SpellValues v = spell("{\"mSpellCalculations\":{\"Bonus\":{\"mFormulaParts\":["
				+ "{\"mStat\":0,\"mCoefficient\":0.3,\"mStatFormula\":1,\"__type\":\"StatByCoefficientCalculationPart\"}],"
				+ "\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("Bonus", v)).contains("(+추가 주문력의 30%)");
		assertThat(en.resolve("Bonus", v)).contains("(+30% bonus AP)");
	}

	@Test
	void numberAndSumAndProduct() {
		SpellValues v = spell("{\"DataValues\":[" + same("A", 3) + "],\"mSpellCalculations\":{"
				+ "\"S\":{\"mFormulaParts\":[{\"mNumber\":2.0,\"__type\":\"NumberCalculationPart\"},"
				+ "{\"mSubparts\":[{\"mNumber\":1.0,\"__type\":\"NumberCalculationPart\"},{\"mDataValue\":\"A\",\"__type\":\"NamedDataValueCalculationPart\"}],"
				+ "\"__type\":\"SumOfSubPartsCalculationPart\"}],\"__type\":\"GameCalculation\"},"
				+ "\"P\":{\"mFormulaParts\":[{\"mSubparts\":[{\"mNumber\":2.0,\"__type\":\"NumberCalculationPart\"},{\"mNumber\":3.0,\"__type\":\"NumberCalculationPart\"}],"
				+ "\"__type\":\"ProductOfSubPartsCalculationPart\"}],\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("S", v)).contains("2 (+1 + 3)");
		assertThat(ko.resolve("P", v)).contains("2 × 3");
	}

	@Test
	void modifiedCalculationMultiplies() {
		SpellValues v = spell("{\"mSpellCalculations\":{"
				+ "\"Base\":{\"mFormulaParts\":[{\"mStartValue\":75.0,\"mEndValue\":150.0,\"__type\":\"ByCharLevelInterpolationCalculationPart\"}],\"__type\":\"GameCalculation\"},"
				+ "\"Double\":{\"mMultiplier\":{\"mNumber\":2.0,\"__type\":\"NumberCalculationPart\"},\"mModifiedGameCalculation\":\"Base\",\"__type\":\"GameCalculationModified\"}}}");
		assertThat(ko.resolve("Double", v)).contains("150~300");
	}

	@Test
	void unknownStatOrPartIsEmpty() {
		SpellValues v = spell("{\"mSpellCalculations\":{"
				+ "\"Odd\":{\"mFormulaParts\":[{\"mStat\":34,\"mCoefficient\":0.1,\"__type\":\"StatByCoefficientCalculationPart\"}],\"__type\":\"GameCalculation\"},"
				+ "\"Buff\":{\"mFormulaParts\":[{\"mCoefficient\":1.0,\"__type\":\"BuffCounterByCoefficientCalculationPart\"}],\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("Odd", v)).isEmpty();
		assertThat(ko.resolve("Buff", v)).isEmpty();
		assertThat(ko.resolve("Nope", v)).isEmpty();
	}

	@Test
	void knowsArmorMagicResistMoveSpeedAndHaste() {
		SpellValues v = spell("{\"DataValues\":[" + same("Conv", 0.25) + "],\"mSpellCalculations\":{"
				+ "\"Ar\":{\"mFormulaParts\":[{\"mStat\":1,\"mStatFormula\":2,\"mCoefficient\":1.25,\"__type\":\"StatByCoefficientCalculationPart\"}],\"__type\":\"GameCalculation\"},"
				+ "\"Mr\":{\"mFormulaParts\":[{\"mStat\":6,\"mStatFormula\":2,\"mCoefficient\":1.25,\"__type\":\"StatByCoefficientCalculationPart\"}],\"__type\":\"GameCalculation\"},"
				+ "\"Ms\":{\"mFormulaParts\":[{\"mStat\":7,\"mDataValue\":\"Conv\",\"__type\":\"StatByNamedDataValueCalculationPart\"}],\"__type\":\"GameCalculation\"},"
				+ "\"Ah\":{\"mFormulaParts\":[{\"mStat\":11,\"mDataValue\":\"Conv\",\"__type\":\"StatByNamedDataValueCalculationPart\"}],\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("Ar", v)).contains("(+전체 방어력의 125%)");
		assertThat(en.resolve("Mr", v)).contains("(+125% total Magic Resist)");
		assertThat(ko.resolve("Ms", v)).contains("(+이동 속도의 25%)");
		assertThat(en.resolve("Ah", v)).contains("(+25% Ability Haste)");
	}

	@Test
	void productWithPart1AndPart2() {
		SpellValues v = spell("{\"DataValues\":[" + same("A", 2) + "," + same("B", 5) + "],\"mSpellCalculations\":{"
				+ "\"P\":{\"mFormulaParts\":[{\"mPart1\":{\"mDataValue\":\"A\",\"__type\":\"NamedDataValueCalculationPart\"},"
				+ "\"mPart2\":{\"mDataValue\":\"B\",\"__type\":\"NamedDataValueCalculationPart\"},\"__type\":\"ProductOfSubPartsCalculationPart\"}],\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("P", v)).contains("2 × 5");
	}

	@Test
	void rangeBetweenTwoDataValues() {
		SpellValues v = spell("{\"DataValues\":[" + same("Lo", 10) + "," + same("Hi", 30) + "],\"mSpellCalculations\":{"
				+ "\"R\":{\"mFormulaParts\":[{\"StartDataValue\":\"Lo\",\"EndDataValue\":\"Hi\",\"__type\":\"{ee18a47b}\"}],\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("R", v)).contains("10~30");
	}

	@Test
	void displayAsPercentMultipliesNumbers() {
		SpellValues v = spell("{\"DataValues\":[" + same("X", 0.1) + "],\"mSpellCalculations\":{"
				+ "\"Pct\":{\"mFormulaParts\":[{\"mDataValue\":\"X\",\"__type\":\"NamedDataValueCalculationPart\"},"
				+ "{\"mStat\":7,\"mDataValue\":\"X\",\"__type\":\"StatByNamedDataValueCalculationPart\"}],\"mDisplayAsPercent\":true,\"__type\":\"GameCalculation\"}}}");
		assertThat(en.resolve("Pct", v)).contains("10% (+10% Move Speed)");
	}

	@Test
	void tailOnTextOrPercentPartIsEmpty() {
		SpellValues v = spell("{\"DataValues\":[" + same("A", 3) + "," + same("X", 0.1) + "],\"mSpellCalculations\":{"
				+ "\"S\":{\"mFormulaParts\":[{\"mSubparts\":[{\"mNumber\":1.0,\"__type\":\"NumberCalculationPart\"},{\"mDataValue\":\"A\",\"__type\":\"NamedDataValueCalculationPart\"}],"
				+ "\"__type\":\"SumOfSubPartsCalculationPart\"}],\"__type\":\"GameCalculation\"},"
				+ "\"Pct\":{\"mFormulaParts\":[{\"mDataValue\":\"X\",\"__type\":\"NamedDataValueCalculationPart\"}],\"mDisplayAsPercent\":true,\"__type\":\"GameCalculation\"}}}");
		// 합·곱은 글로 만들어져 곱할 수 없고, 백분율은 이미 100을 곱했어요. 틀린 숫자 대신 자리표시자를 남겨요.
		assertThat(ko.resolve("S*100", v)).isEmpty();
		assertThat(ko.resolve("Pct*100", v)).isEmpty();
		assertThat(ko.resolve("S", v)).contains("1 + 3");
	}

	@Test
	void breakpointWithUnknownFieldIsEmpty() {
		SpellValues v = spell("{\"mSpellCalculations\":{\"Inc\":{\"mFormulaParts\":["
				+ "{\"mLevel1Value\":1.0,\"mBreakpoints\":[{\"mLevel\":7,\"mBonusPerLevelAtAndAfter\":1.0,\"__type\":\"Breakpoint\"}],"
				+ "\"__type\":\"ByCharLevelBreakpointsCalculationPart\"}],\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("Inc", v)).isEmpty();
	}

	@Test
	void numbersComeBeforeStatScalingWhateverTheDataOrder() {
		SpellValues v = spell("{\"mSpellCalculations\":{\"Dmg\":{\"mFormulaParts\":["
				+ "{\"mStat\":1,\"mStatFormula\":2,\"mCoefficient\":2.5,\"__type\":\"StatByCoefficientCalculationPart\"},"
				+ "{\"mStartValue\":50.0,\"mEndValue\":125.0,\"__type\":\"ByCharLevelInterpolationCalculationPart\"}],"
				+ "\"__type\":\"GameCalculation\"}}}");
		assertThat(ko.resolve("Dmg", v)).contains("50~125 (+전체 방어력의 250%)");
	}

	@Test
	void formatsNumbers() {
		assertThat(SpellValueResolver.formatNumber(150)).isEqualTo("150");
		assertThat(SpellValueResolver.formatNumber(4.5)).isEqualTo("4.5");
		assertThat(SpellValueResolver.formatNumber(0.05 * 100)).isEqualTo("5");
		assertThat(SpellValueResolver.formatNumber(2.345)).isEqualTo("2.3");
	}

}
