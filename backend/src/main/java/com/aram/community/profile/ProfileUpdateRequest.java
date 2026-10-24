package com.aram.community.profile;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** 프로필 수정 요청. profileImageId가 null이면 디스코드 사진을 써요. */
public record ProfileUpdateRequest(String nickname, UUID profileImageId,
		@NotNull(message = "공개 설정을 골라주세요") Boolean profilePublic) {

}
