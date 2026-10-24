package com.aram.community.post;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TagStatsController {

	private final TagStatsService tagStats;

	public TagStatsController(TagStatsService tagStats) {
		this.tagStats = tagStats;
	}

	@GetMapping("/api/tag-counts")
	public TagCountsResponse counts() {
		return tagStats.counts();
	}

	@GetMapping("/api/champions/{championId}/top-augments")
	public List<TopAugmentItem> topAugments(@PathVariable String championId) {
		return tagStats.topAugments(championId);
	}

}
