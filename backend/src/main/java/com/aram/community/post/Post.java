package com.aram.community.post;

import com.aram.community.gamedata.Augment;
import com.aram.community.gamedata.Champion;
import com.aram.community.gamedata.Item;
import com.aram.community.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "posts")
public class Post {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "author_id", nullable = false)
	private User author;

	@Column(nullable = false, length = 100)
	private String title;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false, columnDefinition = "jsonb")
	private String content;

	@Column(name = "content_text", nullable = false, columnDefinition = "text")
	private String contentText;

	@Column(name = "game_patch", nullable = false, length = 10)
	private String gamePatch;

	@Column(name = "like_count", nullable = false)
	private int likeCount;

	@Column(name = "comment_count", nullable = false)
	private int commentCount;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(name = "post_champions", joinColumns = @JoinColumn(name = "post_id"),
			inverseJoinColumns = @JoinColumn(name = "champion_id"))
	private Set<Champion> champions = new LinkedHashSet<>();

	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(name = "post_augments", joinColumns = @JoinColumn(name = "post_id"),
			inverseJoinColumns = @JoinColumn(name = "augment_id"))
	private Set<Augment> augments = new LinkedHashSet<>();

	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(name = "post_items", joinColumns = @JoinColumn(name = "post_id"),
			inverseJoinColumns = @JoinColumn(name = "item_id"))
	private Set<Item> items = new LinkedHashSet<>();

	protected Post() {
	}

	public static Post create(User author, String title, ValidatedContent content, String gamePatch,
			Set<Champion> champions, Set<Augment> augments, Set<Item> items, Instant now) {
		Post post = new Post();
		post.author = author;
		post.createdAt = now;
		post.edit(title, content, gamePatch, champions, augments, items, now);
		return post;
	}

	public void edit(String title, ValidatedContent content, String gamePatch, Set<Champion> champions,
			Set<Augment> augments, Set<Item> items, Instant now) {
		this.title = title;
		this.content = content.normalizedJson();
		this.contentText = content.plainText();
		this.gamePatch = gamePatch;
		this.champions.clear();
		this.champions.addAll(champions);
		this.augments.clear();
		this.augments.addAll(augments);
		this.items.clear();
		this.items.addAll(items);
		this.updatedAt = now;
	}

	public boolean isEdited() {
		return Duration.between(createdAt, updatedAt).compareTo(Duration.ofSeconds(1)) > 0;
	}

	public Long getId() {
		return id;
	}

	public User getAuthor() {
		return author;
	}

	public String getTitle() {
		return title;
	}

	public String getContent() {
		return content;
	}

	public String getContentText() {
		return contentText;
	}

	public String getGamePatch() {
		return gamePatch;
	}

	public int getLikeCount() {
		return likeCount;
	}

	public int getCommentCount() {
		return commentCount;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}

	public Set<Champion> getChampions() {
		return champions;
	}

	public Set<Augment> getAugments() {
		return augments;
	}

	public Set<Item> getItems() {
		return items;
	}

}
