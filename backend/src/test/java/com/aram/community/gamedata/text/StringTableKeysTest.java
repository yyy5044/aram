package com.aram.community.gamedata.text;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** CommunityDragon 문자열 표에서 이름을 아직 모르는 키는 `{xxh3-64 하위 38비트}` 꼴로 나와요. 실제 값으로 맞춰요. */
class StringTableKeysTest {

	@Test
	void hashesLowercaseKeyWithXxh3To38Bits() {
		// 39번째 비트가 1인 키. 39비트로 자르면 {4ec642f386}이 되어 표에서 못 찾아요.
		assertThat(StringTableKeys.hashedKey("Kiwi_Augment_JeweledBracelet_Name")).isEqualTo("{0ec642f386}");
		assertThat(StringTableKeys.hashedKey("Kiwi_Augment_JeweledBracelet_Tooltip")).isEqualTo("{024ba82c76}");
		assertThat(StringTableKeys.hashedKey("Kiwi_Augment_ArmoredImpact_Name")).isEqualTo("{045c3c0e79}");
		assertThat(StringTableKeys.hashedKey("Kiwi_Augment_ArmoredImpact_Tooltip")).isEqualTo("{166854c780}");
		assertThat(StringTableKeys.hashedKey("kiwi_augment_armoredimpact_description")).isEqualTo("{0ae9f2e881}");
	}

}
