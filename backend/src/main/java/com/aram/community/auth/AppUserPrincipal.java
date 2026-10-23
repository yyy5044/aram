package com.aram.community.auth;

import com.aram.community.user.Role;
import java.io.Serializable;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

/**
 * 로그인한 사용자. 세션에 저장되므로 우리 사용자 ID와 첫 닉네임 제안값만 들고 있어요. 권한 판단은 항상 DB의 사용자로 해요.
 */
public record AppUserPrincipal(long userId, String discordDefaultName, Map<String, Object> attributes,
		List<SimpleGrantedAuthority> authorities) implements OAuth2User, Serializable {

	public static AppUserPrincipal of(long userId, Role role, String discordDefaultName,
			Map<String, Object> attributes) {
		return new AppUserPrincipal(userId, discordDefaultName, Map.copyOf(attributes),
				List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
	}

	@Override
	public Map<String, Object> getAttributes() {
		return attributes;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return authorities;
	}

	@Override
	public String getName() {
		return String.valueOf(userId);
	}

}
