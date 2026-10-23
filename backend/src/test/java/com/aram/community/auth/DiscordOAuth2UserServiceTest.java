package com.aram.community.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.support.IntegrationTest;
import com.aram.community.user.User;
import com.aram.community.user.UserRepository;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class DiscordOAuth2UserServiceTest extends IntegrationTest {

	@Autowired
	DiscordOAuth2UserService service;

	@Autowired
	UserRepository users;

	@Test
	void createsUserOnFirstLogin() {
		AppUserPrincipal p = service.loadFromAttributes(
				Map.of("id", "111", "username", "yangho", "global_name", "양호", "avatar", "abc"));

		User u = users.findById(p.userId()).orElseThrow();
		assertThat(u.getDiscordId()).isEqualTo("111");
		assertThat(u.getAvatarUrl()).isEqualTo("https://cdn.discordapp.com/avatars/111/abc.png");
		assertThat(u.getNickname()).isNull();
		assertThat(p.discordDefaultName()).isEqualTo("양호");
	}

	@Test
	void secondLoginReusesUserAndRefreshesAvatar() {
		AppUserPrincipal first = service
			.loadFromAttributes(Map.of("id", "111", "username", "yangho", "avatar", "abc"));
		AppUserPrincipal second = service
			.loadFromAttributes(Map.of("id", "111", "username", "yangho", "avatar", "def"));

		assertThat(second.userId()).isEqualTo(first.userId());
		assertThat(users.count()).isEqualTo(1);
		assertThat(users.findById(second.userId()).orElseThrow().getAvatarUrl()).endsWith("/def.png");
	}

	@Test
	void missingAvatarAndGlobalNameStillLogsIn() {
		Map<String, Object> attrs = new HashMap<>();
		attrs.put("id", "222");
		attrs.put("username", "minsu");
		attrs.put("global_name", null);
		attrs.put("avatar", null);

		AppUserPrincipal p = service.loadFromAttributes(attrs);

		assertThat(users.findById(p.userId()).orElseThrow().getAvatarUrl()).isNull();
		assertThat(p.discordDefaultName()).isEqualTo("minsu");
	}

	@Test
	void adminIdsGetAdminRole() {
		// application-test.yml: app.admin-discord-ids=999
		AppUserPrincipal admin = service.loadFromAttributes(Map.of("id", "999", "username", "boss"));
		AppUserPrincipal user = service.loadFromAttributes(Map.of("id", "111", "username", "yangho"));

		assertThat(users.findById(admin.userId()).orElseThrow().isAdmin()).isTrue();
		assertThat(users.findById(user.userId()).orElseThrow().isAdmin()).isFalse();
	}

}
