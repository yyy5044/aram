package com.aram.community.gamedata;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Data Dragon 버전(16.21.1)과 게임 화면 패치 표기(26.21) 사이의 변환. */
public final class GamePatches {

	private static final Pattern VERSION = Pattern.compile("^(\\d+)\\.(\\d+)\\.(\\d+)$");

	private GamePatches() {
	}

	public static String toGamePatch(String ddragonVersion) {
		Matcher m = parse(ddragonVersion);
		return (Integer.parseInt(m.group(1)) + 10) + "." + Integer.parseInt(m.group(2));
	}

	/** 클수록 최신. */
	public static int releasedOrder(String ddragonVersion) {
		Matcher m = parse(ddragonVersion);
		return Integer.parseInt(m.group(1)) * 10_000 + Integer.parseInt(m.group(2)) * 100
				+ Math.min(Integer.parseInt(m.group(3)), 99);
	}

	private static Matcher parse(String ddragonVersion) {
		Matcher m = VERSION.matcher(ddragonVersion == null ? "" : ddragonVersion);
		if (!m.matches()) {
			throw new IllegalArgumentException("Not a Data Dragon version: " + ddragonVersion);
		}
		return m;
	}

}
