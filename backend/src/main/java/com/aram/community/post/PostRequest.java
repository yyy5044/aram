package com.aram.community.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import tools.jackson.databind.JsonNode;

public record PostRequest(
		// 길이는 앞뒤 공백을 뺀 뒤 PostService에서 검사해요.
		@NotBlank(message = "제목을 입력해주세요") String title,
		@NotNull(message = "본문을 입력해주세요") JsonNode content, List<String> championIds, List<String> augmentIds,
		@NotBlank(message = "패치를 골라주세요") String gamePatch) {

	public List<String> championIdsOrEmpty() {
		return championIds == null ? List.of() : championIds;
	}

	public List<String> augmentIdsOrEmpty() {
		return augmentIds == null ? List.of() : augmentIds;
	}

}
