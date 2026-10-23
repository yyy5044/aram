package com.aram.community.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import tools.jackson.databind.JsonNode;

public record PostRequest(
		@NotBlank(message = "제목을 입력해주세요") @Size(max = 100, message = "제목은 100자 이하로 써주세요") String title,
		@NotNull(message = "본문을 입력해주세요") JsonNode content, List<String> championIds, List<String> augmentIds,
		@NotBlank(message = "패치를 골라주세요") String gamePatch) {

	public List<String> championIdsOrEmpty() {
		return championIds == null ? List.of() : championIds;
	}

	public List<String> augmentIdsOrEmpty() {
		return augmentIds == null ? List.of() : augmentIds;
	}

}
