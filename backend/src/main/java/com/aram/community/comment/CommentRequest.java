package com.aram.community.comment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentRequest(
		@NotBlank(message = "댓글을 입력해주세요") @Size(max = 1000, message = "댓글은 1,000자 이하로 써주세요") String content) {

}
