package com.aram.community.user;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import java.time.Instant;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

	private static final Pattern NICKNAME = Pattern.compile("^[가-힣A-Za-z0-9_]{2,12}$");

	private static final String NICKNAME_RULE = "닉네임은 2~12자 한글, 영문, 숫자, 밑줄만 쓸 수 있어요";

	private final UserRepository users;

	private final Set<String> adminDiscordIds;

	public UserService(UserRepository users, @Value("${app.admin-discord-ids:}") String adminDiscordIds) {
		this.users = users;
		this.adminDiscordIds = Arrays.stream(adminDiscordIds.split(","))
			.map(String::trim)
			.filter(s -> !s.isEmpty())
			.collect(Collectors.toUnmodifiableSet());
	}

	@Transactional
	public User upsertFromDiscord(String discordId, String avatarUrl) {
		Role role = adminDiscordIds.contains(discordId) ? Role.ADMIN : Role.USER;
		return users.findByDiscordId(discordId).map(user -> {
			user.refreshFromDiscord(avatarUrl, role);
			return user;
		}).orElseGet(() -> users.save(User.create(discordId, avatarUrl, role, Instant.now())));
	}

	@Transactional
	public User changeNickname(long userId, String raw) {
		String nickname = raw == null ? "" : raw.trim();
		if (!NICKNAME.matcher(nickname).matches()) {
			throw new ApiException(ErrorCode.INVALID_INPUT, Map.of("nickname", NICKNAME_RULE));
		}
		if (users.nicknameTakenByOther(nickname, userId)) {
			throw new ApiException(ErrorCode.NICKNAME_TAKEN);
		}
		User user = users.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
		user.changeNickname(nickname);
		try {
			return users.saveAndFlush(user);
		}
		catch (DataIntegrityViolationException e) {
			throw new ApiException(ErrorCode.NICKNAME_TAKEN);
		}
	}

}
