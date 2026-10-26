package com.aram.community.post;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * 로그인하지 않은 사람의 조회수를 브라우저 단위로 세려고 붙이는 이름표 쿠키. 값은 무작위 UUID라 누구인지 알 수 없어요. 운영에서는 로그인 쿠키처럼
 * https에서만 오가요(server.servlet.session.cookie.secure).
 */
@Component
public class ViewerCookie {

	public static final String NAME = "ARAM_VIEWER";

	private static final Duration MAX_AGE = Duration.ofDays(365);

	private final boolean secure;

	public ViewerCookie(@Value("${server.servlet.session.cookie.secure:false}") boolean secure) {
		this.secure = secure;
	}

	/** 쓸 수 있는 이름표가 있으면 그 값을, 없거나 모양이 이상하면 새로 만들어 응답에 붙이고 그 값을 줘요. */
	public String resolve(HttpServletRequest request, HttpServletResponse response) {
		Cookie[] cookies = request.getCookies();
		if (cookies != null) {
			for (Cookie c : cookies) {
				if (NAME.equals(c.getName()) && isUuid(c.getValue())) {
					return c.getValue();
				}
			}
		}
		String id = UUID.randomUUID().toString();
		ResponseCookie cookie = ResponseCookie.from(NAME, id)
			.maxAge(MAX_AGE)
			.path("/")
			.httpOnly(true)
			.secure(secure)
			.sameSite("Lax")
			.build();
		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
		return id;
	}

	private static boolean isUuid(String value) {
		try {
			return value != null && UUID.fromString(value).toString().equals(value);
		}
		catch (IllegalArgumentException e) {
			return false;
		}
	}

}
