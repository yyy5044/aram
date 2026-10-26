package com.aram.community.post;

import com.aram.community.gamedata.AugmentDto;
import com.aram.community.gamedata.ChampionDto;
import com.aram.community.gamedata.ItemDto;
import com.fasterxml.jackson.annotation.JsonRawValue;
import java.time.Instant;
import java.util.List;

public record PostDetailResponse(long id, String title, @JsonRawValue String content, String gamePatch,
		AuthorDto author, List<ChampionDto> champions, List<AugmentDto> augments, List<ItemDto> items, int likeCount, int commentCount, int viewCount,
		boolean likedByMe, boolean scrappedByMe, Instant createdAt, Instant updatedAt, boolean edited) {

}
