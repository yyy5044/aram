package com.aram.community.gamedata;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.gamedata")
public record GameDataProperties(String ddragonBaseUrl, String cdragonBaseUrl, Duration timeout) {

	public GameDataProperties {
		if (ddragonBaseUrl == null) {
			ddragonBaseUrl = "https://ddragon.leagueoflegends.com";
		}
		if (cdragonBaseUrl == null) {
			cdragonBaseUrl = "https://raw.communitydragon.org";
		}
		if (timeout == null) {
			timeout = Duration.ofSeconds(30);
		}
	}

}
