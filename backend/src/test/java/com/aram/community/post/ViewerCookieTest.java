package com.aram.community.post;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ViewerCookieTest {

	@Test
	void secureWhenConfigured() {
		MockHttpServletResponse response = new MockHttpServletResponse();
		new ViewerCookie(true).resolve(new MockHttpServletRequest(), response);
		assertThat(response.getHeader("Set-Cookie")).startsWith("ARAM_VIEWER=")
			.contains("Secure", "SameSite=Lax", "HttpOnly", "Max-Age=31536000", "Path=/");
	}

	@Test
	void notSecureByDefault() {
		MockHttpServletResponse response = new MockHttpServletResponse();
		new ViewerCookie(false).resolve(new MockHttpServletRequest(), response);
		assertThat(response.getHeader("Set-Cookie")).contains("SameSite=Lax").doesNotContain("Secure");
	}

}
