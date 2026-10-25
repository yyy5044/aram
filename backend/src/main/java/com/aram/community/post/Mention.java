package com.aram.community.post;

/** 본문 속 챔피언·증강·아이템 박스(tagMention)가 가리키는 것. kind는 champion, augment, item(아이템 id는 숫자 문자열). */
public record Mention(String kind, String id) {

}
