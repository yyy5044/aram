package com.aram.community.post;

import java.util.Map;

/** 태그 id → 글 수. 글이 있는 태그만 들어 있어요. */
public record TagCountsResponse(Map<String, Long> champions, Map<String, Long> augments, Map<String, Long> items) {

}
