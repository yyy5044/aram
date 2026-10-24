package com.aram.community.gamedata;

import static org.assertj.core.api.Assertions.assertThat;

import com.aram.community.support.IntegrationTest;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class AugmentTextRepositoryTest extends IntegrationTest {

	@Autowired
	AugmentRepository augments;

	@Autowired
	AugmentTextRepository texts;

	@Test
	void savesOneRowPerLocaleAndFindsByAugment() {
		augments.save(new Augment("OminousPact", "불길한 서약", "s.png", "l.png", AugmentRarity.PRISMATIC, Instant.now()));
		texts.save(new AugmentText(new AugmentTextId("OminousPact", "en"), "Ominous Pact", "Gain …", Instant.now()));
		texts.save(new AugmentText(new AugmentTextId("OminousPact", "ko"), "불길한 서약", "잃은 체력에 …", Instant.now()));

		assertThat(texts.findByIdAugmentId("OminousPact")).extracting(t -> t.getId().locale())
			.containsExactlyInAnyOrder("en", "ko");
		assertThat(augments.findById("OminousPact").orElseThrow().getLargeIconPath()).isEqualTo("l.png");
	}

}
