package com.aram.community.user;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import java.time.Instant;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.hibernate.exception.ConstraintViolationException;
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
		String nickname = validNickname(userId, raw);
		User user = load(userId);
		user.changeNickname(nickname);
		return saveCheckingNickname(user);
	}

	/** 프로필 수정: 닉네임, 직접 올린 사진(null이면 디스코드 사진), 공개 여부를 한 번에 바꿔요. 사진 검증은 호출하는 쪽에서 해요. */
	@Transactional
	public User updateProfile(long userId, String rawNickname, UUID profileImageId, boolean profilePublic) {
		String nickname = validNickname(userId, rawNickname);
		User user = load(userId);
		user.updateProfile(nickname, profileImageId, profilePublic);
		return saveCheckingNickname(user);
	}

	private String validNickname(long userId, String raw) {
		String nickname = raw == null ? "" : raw.trim();
		if (!NICKNAME.matcher(nickname).matches()) {
			throw new ApiException(ErrorCode.INVALID_INPUT, Map.of("nickname", NICKNAME_RULE));
		}
		if (users.nicknameTakenByOther(nickname, userId)) {
			throw new ApiException(ErrorCode.NICKNAME_TAKEN);
		}
		return nickname;
	}

	private User load(long userId) {
		return users.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
	}

	/** 확인과 저장 사이에 바뀐 상황(같은 닉네임을 먼저 저장, 고른 사진이 정리됨)을 알맞은 오류로 바꿔요. */
	private User saveCheckingNickname(User user) {
		try {
			return users.saveAndFlush(user);
		}
		catch (DataIntegrityViolationException e) {
			String constraint = e.getCause() instanceof ConstraintViolationException c ? c.getConstraintName() : null;
			if (constraint == null) {
				throw e;
			}
			if (constraint.contains("nickname")) {
				throw new ApiException(ErrorCode.NICKNAME_TAKEN);
			}
			if (constraint.contains("profile_image")) {
				throw new ApiException(ErrorCode.IMAGE_NOT_FOUND);
			}
			throw e;
		}
	}

}
