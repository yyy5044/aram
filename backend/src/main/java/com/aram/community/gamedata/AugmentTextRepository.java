package com.aram.community.gamedata;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AugmentTextRepository extends JpaRepository<AugmentText, AugmentTextId> {

	List<AugmentText> findByIdAugmentId(String augmentId);

}
