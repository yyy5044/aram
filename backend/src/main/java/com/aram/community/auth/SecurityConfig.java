package com.aram.community.auth;

import com.aram.community.common.ErrorCode;
import com.aram.community.common.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;

@Configuration(proxyBeanMethods = false)
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, JsonMapper jsonMapper,
			DiscordOAuth2UserService discordUserService, LoginSuccessHandler loginSuccessHandler) throws Exception {
		http.authorizeHttpRequests(auth -> auth
			.requestMatchers(HttpMethod.GET, "/api/**").permitAll()
			.requestMatchers(HttpMethod.POST, "/api/dev/login").permitAll()
			.requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
			.requestMatchers("/api/**").authenticated()
			.anyRequest().permitAll());
		http.oauth2Login(oauth -> oauth.userInfoEndpoint(info -> info.userService(discordUserService))
			.successHandler(loginSuccessHandler)
			// 디스코드에서 취소하거나 실패하면 화면이 안내 문구를 띄우고 원래 보던 곳으로 돌려보내요.
			.failureUrl("/auth/done?error"));
		http.csrf(csrf -> csrf.spa());
		http.addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class);
		http.exceptionHandling(ex -> ex
			.authenticationEntryPoint((req, res, e) -> writeError(res, jsonMapper, ErrorCode.UNAUTHORIZED))
			.accessDeniedHandler((req, res, e) -> writeError(res, jsonMapper,
					e instanceof CsrfException ? ErrorCode.CSRF_INVALID : ErrorCode.FORBIDDEN)));
		http.logout(logout -> logout.logoutUrl("/api/logout")
			.logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)));
		return http.build();
	}

	private static void writeError(HttpServletResponse res, JsonMapper jsonMapper, ErrorCode code)
			throws IOException {
		res.setStatus(code.status());
		res.setContentType(MediaType.APPLICATION_JSON_VALUE);
		res.setCharacterEncoding("UTF-8");
		jsonMapper.writeValue(res.getOutputStream(), ErrorResponse.of(code));
	}

	/** 요청마다 CSRF 토큰을 꺼내서 XSRF-TOKEN 쿠키가 항상 내려가게 해요. */
	static final class CsrfCookieFilter extends OncePerRequestFilter {

		@Override
		protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
				throws ServletException, IOException {
			CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
			if (token != null) {
				token.getToken();
			}
			chain.doFilter(request, response);
		}

	}

}
