package com.aram.community.post;

import com.aram.community.gamedata.AugmentDto;
import com.aram.community.gamedata.ChampionDto;
import com.aram.community.gamedata.ItemDto;
import java.time.Instant;
import java.util.List;

public record PostListItem(long id, String title, String gamePatch, AuthorDto author, List<ChampionDto> champions,
		List<AugmentDto> augments, List<ItemDto> items, int likeCount, int commentCount, int viewCount, Instant createdAt) {

}
