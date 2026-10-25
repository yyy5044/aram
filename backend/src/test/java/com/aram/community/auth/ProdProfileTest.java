package com.aram.community.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.TestcontainersConfiguration;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/** 운영(prod) 설정: Caddy 뒤에서 https 주소를 만들고, 쿠키는 https 전용이고, 개발 로그인은 절대 켜지지 않아요. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = { "app.dev-login.enabled=true", "POSTGRES_PASSWORD=unused" })
@ActiveProfiles({ "test", "prod" })
@Import(TestcontainersConfiguration.class)
class ProdProfileTest {

	private final HttpClient client = HttpClient.newHttpClient();

	@LocalServerPort
	int port;

	@Test
	void devLoginIsNeverAvailableInProd(@Autowired ApplicationContext context) {
		assertThat(context.getBeanNamesForType(DevLoginController.class)).isEmpty();
	}

	@Test
	void discordRedirectUsesHttpsBehindTheProxy() throws Exception {
		HttpResponse<Void> res = client.send(
				HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/oauth2/authorization/discord"))
					.header("X-Forwarded-Proto", "https")
					.build(),
				BodyHandlers.discarding());

		String location = res.headers().firstValue("Location").orElseThrow();
		assertThat(location).contains("redirect_uri=https://localhost/login/oauth2/code/discord");
		assertThat(res.headers().allValues("Set-Cookie"))
			.anySatisfy(c -> assertThat(c).startsWith("SESSION=").contains("Secure"));
	}

}
