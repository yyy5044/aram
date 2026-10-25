package com.aram.community.post;

/** 본문 속 챔피언·증강 박스(tagMention)가 가리키는 것. kind는 champion 또는 augment. */
public record Mention(String kind, String id) {

}
