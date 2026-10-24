package com.aram.community.gamedata.text;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import net.openhft.hashing.LongHashFunction;

/**
 * CommunityDragon 문자열 표의 키 처리. 표는 이름을 아는 키는 소문자 이름으로, 모르는 키는 `{해시}`로 내보내요.
 * 해시는 소문자 키의 XXH3-64 하위 38비트를 10자리 16진수로 쓴 거예요(새 패치 증강의 글이 이렇게 들어 있어요).
 */
public final class StringTableKeys {

	private static final long MASK_38_BITS = (1L << 38) - 1;

	private StringTableKeys() {
	}

	public static String hashedKey(String key) {
		long hash = LongHashFunction.xx3().hashBytes(key.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
		return String.format("{%010x}", hash & MASK_38_BITS);
	}

}
