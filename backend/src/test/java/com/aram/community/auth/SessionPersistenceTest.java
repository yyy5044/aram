package com.aram.community.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.TestcontainersConfiguration;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * 로그인 정보가 DB에 저장되어 서버를 다시 켜도 30일 동안 유지되는지 확인해요. 쿠키 설정은 실제 서버에서만 적용되어서 실제 포트로 띄워요.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = "app.dev-login.enabled=true")
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class SessionPersistenceTest {

	private final HttpClient client = HttpClient.newHttpClient();

	@LocalServerPort
	int port;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void loginIsStoredInDatabaseFor30Days() throws Exception {
		String xsrf = cookieValue(send(HttpRequest.newBuilder(url("/api/me")).GET()), "XSRF-TOKEN");

		HttpResponse<String> login = send(HttpRequest.newBuilder(url("/api/dev/login"))
			.header("Content-Type", "application/json")
			.header("Cookie", "XSRF-TOKEN=" + xsrf)
			.header("X-XSRF-TOKEN", xsrf)
			.POST(HttpRequest.BodyPublishers.ofString("{\"discordId\":\"session-1\",\"nickname\":\"세션테스터\"}")));
		assertThat(login.statusCode()).isEqualTo(200);
		String setCookie = setCookie(login, "SESSION");
		assertThat(setCookie).contains("Max-Age=2592000").contains("HttpOnly");

		String session = cookieValue(login, "SESSION");
		String sessionId = new String(Base64.getDecoder().decode(session), StandardCharsets.UTF_8);
		assertThat(jdbc.queryForObject("select max_inactive_interval from spring_session where session_id = ?",
				Integer.class, sessionId))
			.isEqualTo(2592000);

		HttpResponse<String> me = send(HttpRequest.newBuilder(url("/api/me")).header("Cookie", "SESSION=" + session).GET());
		assertThat(me.body()).contains("세션테스터");
	}

	private URI url(String path) {
		return URI.create("http://localhost:" + port + path);
	}

	private HttpResponse<String> send(HttpRequest.Builder request) throws Exception {
		return client.send(request.build(), BodyHandlers.ofString());
	}

	private static String setCookie(HttpResponse<?> response, String name) {
		List<String> cookies = response.headers().allValues("Set-Cookie");
		return cookies.stream().filter(c -> c.startsWith(name + "=")).findFirst().orElseThrow();
	}

	private static String cookieValue(HttpResponse<?> response, String name) {
		String cookie = setCookie(response, name);
		return cookie.substring(name.length() + 1, cookie.indexOf(';'));
	}

}
