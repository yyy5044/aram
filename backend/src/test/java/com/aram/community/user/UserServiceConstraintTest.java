package com.aram.community.user;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aram.community.common.ApiException;
import com.aram.community.common.ErrorCode;
import com.aram.community.support.IntegrationTest;
import com.aram.community.support.TestUsers;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class UserServiceConstraintTest extends IntegrationTest {

	@Autowired
	UserService userService;

	@Autowired
	TestUsers testUsers;

	@Test
	void photoRemovedJustBeforeSavingIsNotReportedAsTakenNickname() {
		User me = testUsers.create("하포");
		assertThatThrownBy(() -> userService.updateProfile(me.getId(), "하포", UUID.randomUUID(), true))
			.isInstanceOfSatisfying(ApiException.class, e -> org.assertj.core.api.Assertions.assertThat(e.code())
				.isEqualTo(ErrorCode.IMAGE_NOT_FOUND));
	}

}
