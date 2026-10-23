package com.aram.community.support;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import com.aram.community.auth.AppUserPrincipal;
import com.aram.community.user.Role;
import com.aram.community.user.User;
import com.aram.community.user.UserRepository;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** 테스트용 사용자 생성과 로그인 흉내. */
@Component
public class TestUsers {

	private static final AtomicLong SEQ = new AtomicLong(1000);

	private final UserRepository users;

	TestUsers(UserRepository users) {
		this.users = users;
	}

	public User create(String nickname) {
		return save(nickname, Role.USER);
	}

	public User createAdmin(String nickname) {
		return save(nickname, Role.ADMIN);
	}

	public User createWithoutNickname() {
		return save(null, Role.USER);
	}

	public RequestPostProcessor as(User user) {
		AppUserPrincipal principal = AppUserPrincipal.of(user.getId(), user.getRole(),
				user.getNickname() != null ? user.getNickname() : "discord-" + user.getDiscordId(),
				Map.of("id", user.getDiscordId()));
		OAuth2AuthenticationToken token = new OAuth2AuthenticationToken(principal, principal.getAuthorities(),
				"discord");
		RequestPostProcessor auth = authentication(token);
		RequestPostProcessor csrf = csrf();
		return request -> csrf.postProcessRequest(auth.postProcessRequest(request));
	}

	private User save(String nickname, Role role) {
		User user = User.create("test-" + SEQ.incrementAndGet(), null, role, Instant.now());
		user.changeNickname(nickname);
		return users.save(user);
	}

}
