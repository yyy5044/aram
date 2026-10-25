package com.aram.community.profile;

import com.aram.community.comment.Comment;
import com.aram.community.comment.CommentRepository;
import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.common.PageResponse;
import com.aram.community.image.ImageService;
import com.aram.community.post.Post;
import com.aram.community.post.PostListItem;
import com.aram.community.post.PostListService;
import com.aram.community.post.PostRepository;
import com.aram.community.profile.MyCommentItem.PostRef;
import com.aram.community.scrap.ScrapRepository;
import com.aram.community.user.User;
import com.aram.community.user.UserRepository;
import com.aram.community.user.UserService;
import java.time.LocalDate;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 프로필 조회와 수정. 비공개 프로필은 본인만 활동·통계·목록을 볼 수 있어요(관리자도 예외 없음). */
@Service
public class ProfileService {

	private final UserService userService;

	private final UserRepository users;

	private final ImageService imageService;

	private final PostRepository posts;

	private final CommentRepository comments;

	private final ScrapRepository scraps;

	private final PostListService postList;

	private final ActivityQuery activityQuery;

	public ProfileService(UserService userService, UserRepository users, ImageService imageService,
			PostRepository posts, CommentRepository comments, ScrapRepository scraps, PostListService postList,
			ActivityQuery activityQuery) {
		this.userService = userService;
		this.users = users;
		this.imageService = imageService;
		this.posts = posts;
		this.comments = comments;
		this.scraps = scraps;
		this.postList = postList;
		this.activityQuery = activityQuery;
	}

	@Transactional
	public User update(User me, ProfileUpdateRequest req) {
		if (req.profileImageId() != null && !req.profileImageId().equals(me.getProfileImageId())) {
			imageService.requireUsableAsProfile(req.profileImageId(), me.getId());
		}
		return userService.updateProfile(me.getId(), req.nickname(), req.profileImageId(), req.profilePublic());
	}

	@Transactional(readOnly = true)
	public ProfileResponse get(long userId, Long viewerId) {
		User user = findShown(userId);
		boolean mine = viewerId != null && viewerId == userId;
		boolean locked = !user.isProfilePublic() && !mine;
		ProfileResponse.Stats stats = locked ? null
				: new ProfileResponse.Stats(posts.countByAuthor_Id(userId), comments.countByAuthor_Id(userId),
						scraps.countByUserId(userId), posts.sumLikeCountByAuthorId(userId));
		ProfileResponse.Activity activity = locked ? null
				: activityQuery.load(userId, LocalDate.now(ActivityQuery.KST));
		return new ProfileResponse(user.getId(), user.getNickname(), user.effectiveAvatarUrl(), user.getCreatedAt(),
				user.isProfilePublic(), mine, locked, stats, activity);
	}

	@Transactional(readOnly = true)
	public PageResponse<PostListItem> posts(long userId, Long viewerId, int page) {
		requireVisible(userId, viewerId);
		return postList.listByAuthor(userId, page);
	}

	@Transactional(readOnly = true)
	public PageResponse<PostListItem> scraps(long userId, Long viewerId, int page) {
		requireVisible(userId, viewerId);
		return postList.listScrapsOf(userId, page);
	}

	@Transactional(readOnly = true)
	public PageResponse<MyCommentItem> comments(long userId, Long viewerId, int page) {
		requireVisible(userId, viewerId);
		PostListService.requireValidPage(page);
		Page<Comment> result = comments.findByAuthor_IdOrderByCreatedAtDescIdDesc(userId,
				PageRequest.of(page - 1, PostListService.PAGE_SIZE));
		Map<Long, String> titles = posts
			.findAllById(result.getContent().stream().map(Comment::getPostId).distinct().toList())
			.stream()
			.collect(Collectors.toMap(Post::getId, Post::getTitle, (a, b) -> a));
		return PageResponse.of(result.map(c -> new MyCommentItem(c.getId(), c.getContent(), c.getCreatedAt(),
				new PostRef(c.getPostId(), titles.getOrDefault(c.getPostId(), "")))));
	}

	/** 닉네임을 아직 정하지 않은 사용자는 없는 사용자로 취급해요. */
	private User findShown(long userId) {
		return users.findById(userId)
			.filter(u -> u.getNickname() != null)
			.orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
	}

	private void requireVisible(long userId, Long viewerId) {
		User user = findShown(userId);
		boolean mine = viewerId != null && viewerId == userId;
		if (!user.isProfilePublic() && !mine) {
			throw new ApiException(ErrorCode.PROFILE_PRIVATE);
		}
	}


}
