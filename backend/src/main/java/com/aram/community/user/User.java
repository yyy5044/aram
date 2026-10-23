package com.aram.community.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "discord_id", nullable = false, unique = true, length = 32)
	private String discordId;

	@Column(length = 12)
	private String nickname;

	@Column(name = "avatar_url", length = 255)
	private String avatarUrl;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private Role role;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected User() {
	}

	public static User create(String discordId, String avatarUrl, Role role, Instant now) {
		User user = new User();
		user.discordId = discordId;
		user.avatarUrl = avatarUrl;
		user.role = role;
		user.createdAt = now;
		return user;
	}

	public void refreshFromDiscord(String avatarUrl, Role role) {
		this.avatarUrl = avatarUrl;
		this.role = role;
	}

	public void changeNickname(String nickname) {
		this.nickname = nickname;
	}

	public Long getId() {
		return id;
	}

	public String getDiscordId() {
		return discordId;
	}

	public String getNickname() {
		return nickname;
	}

	public String getAvatarUrl() {
		return avatarUrl;
	}

	public Role getRole() {
		return role;
	}

	public boolean isAdmin() {
		return role == Role.ADMIN;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

}
