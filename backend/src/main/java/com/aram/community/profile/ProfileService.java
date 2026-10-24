package com.aram.community.profile;

import com.aram.community.image.ImageService;
import com.aram.community.user.User;
import com.aram.community.user.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 프로필 조회와 수정. */
@Service
public class ProfileService {

	private final UserService userService;

	private final ImageService imageService;

	public ProfileService(UserService userService, ImageService imageService) {
		this.userService = userService;
		this.imageService = imageService;
	}

	@Transactional
	public User update(User me, ProfileUpdateRequest req) {
		if (req.profileImageId() != null && !req.profileImageId().equals(me.getProfileImageId())) {
			imageService.requireUsableAsProfile(req.profileImageId(), me.getId());
		}
		return userService.updateProfile(me.getId(), req.nickname(), req.profileImageId(), req.profilePublic());
	}

}
