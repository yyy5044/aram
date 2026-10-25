package com.aram.community.post;

import java.util.List;
import java.util.UUID;

/** 검사를 통과한 본문: 저장할 JSON, 순수 글자, 본문에 들어간 이미지·영상 ID(등장 순서, 영상은 중복 없이), 챔피언·증강 박스(중복 없이). */
public record ValidatedContent(String normalizedJson, String plainText, List<UUID> imageIds, List<UUID> videoIds,
		List<Mention> mentions) {

}
