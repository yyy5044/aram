package com.aram.community.auth;

import com.aram.community.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/** 로그인 후 닉네임이 없으면 /welcome, 있으면 /auth/done으로 보내요. 원래 보던 화면 복귀는 프론트엔드가 해요. */
@Component
public class LoginSuccessHandler implements AuthenticationSuccessHandler {

	private final UserRepository users;

	public LoginSuccessHandler(UserRepository users) {
		this.users = users;
	}

	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
			Authentication authentication) throws IOException {
		boolean needsNickname = authentication.getPrincipal() instanceof AppUserPrincipal p
				&& users.findById(p.userId()).map(u -> u.getNickname() == null).orElse(true);
		response.sendRedirect(needsNickname ? "/welcome" : "/auth/done");
	}

}
