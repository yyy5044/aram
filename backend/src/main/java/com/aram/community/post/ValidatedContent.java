package com.aram.community.post;

import java.util.List;
import java.util.UUID;

/** 검사를 통과한 본문: 저장할 JSON, 순수 글자, 본문에 들어간 이미지 ID(등장 순서). */
public record ValidatedContent(String normalizedJson, String plainText, List<UUID> imageIds) {

}
