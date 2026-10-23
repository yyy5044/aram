package com.aram.community.auth;

import com.aram.community.user.User;
import com.aram.community.user.UserService;
import java.util.HashMap;
import java.util.Map;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

/** 디스코드 사용자 정보로 우리 사용자를 만들거나 갱신해요. */
@Service
public class DiscordOAuth2UserService extends DefaultOAuth2UserService {

	private final UserService userService;

	public DiscordOAuth2UserService(UserService userService) {
		this.userService = userService;
	}

	@Override
	public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
		return loadFromAttributes(super.loadUser(userRequest).getAttributes());
	}

	public AppUserPrincipal loadFromAttributes(Map<String, Object> attributes) {
		String discordId = String.valueOf(attributes.get("id"));
		Object avatar = attributes.get("avatar");
		String avatarUrl = avatar == null ? null
				: "https://cdn.discordapp.com/avatars/" + discordId + "/" + avatar + ".png";
		Object globalName = attributes.get("global_name");
		String defaultName = globalName != null ? globalName.toString() : String.valueOf(attributes.get("username"));

		User user = userService.upsertFromDiscord(discordId, avatarUrl);

		Map<String, Object> kept = new HashMap<>();
		kept.put("id", discordId);
		return AppUserPrincipal.of(user.getId(), user.getRole(), defaultName, kept);
	}

}
