package com.aram.community.gamedata;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class GameDataController {

	private final GameDataService gameData;

	public GameDataController(GameDataService gameData) {
		this.gameData = gameData;
	}

	@GetMapping("/champions")
	public List<ChampionDto> champions() {
		return gameData.allChampions();
	}

	@GetMapping("/augments")
	public List<AugmentDto> augments() {
		return gameData.allAugments();
	}

	@GetMapping("/augments/{id}")
	public AugmentDetailDto augment(@PathVariable String id, @RequestParam(required = false) String lang) {
		return gameData.augmentDetail(id, lang);
	}

	@GetMapping("/patches")
	public PatchesResponse patches() {
		return new PatchesResponse(gameData.currentGamePatch().orElse(null), gameData.selectablePatches());
	}

}
