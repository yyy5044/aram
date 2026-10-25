package com.aram.community.auth;

import com.aram.community.user.User;
import com.aram.community.user.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * 로컬 확인용 로그인. 디스코드 없이 사용자로 로그인해요. app.dev-login.enabled=true일 때만 등록돼요. 운영에서는 절대 켜지 않아요.
 * 환경 변수가 설정 파일보다 우선해서, 운영(prod)에서는 설정 값과 상관없이 프로필로 막아요.
 */
@RestController
@Profile("!prod")
@ConditionalOnProperty(name = "app.dev-login.enabled", havingValue = "true")
public class DevLoginController {

	record DevLoginRequest(String discordId, String nickname) {
	}

	private final UserService userService;

	private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

	public DevLoginController(UserService userService) {
		this.userService = userService;
	}

	@PostMapping("/api/dev/login")
	public MeResponse login(@RequestBody DevLoginRequest request, HttpServletRequest httpRequest,
			HttpServletResponse httpResponse) {
		User user = userService.upsertFromDiscord(request.discordId(), null);
		user = userService.changeNickname(user.getId(), request.nickname());
		AppUserPrincipal principal = AppUserPrincipal.of(user.getId(), user.getRole(), user.getNickname(),
				Map.of("id", request.discordId()));
		OAuth2AuthenticationToken token = new OAuth2AuthenticationToken(principal, principal.getAuthorities(),
				"discord");
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(token);
		SecurityContextHolder.setContext(context);
		contextRepository.saveContext(context, httpRequest, httpResponse);
		return MeResponse.of(user, principal);
	}

}
