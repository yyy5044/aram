package com.aram.community.gamedata;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatchRepository extends JpaRepository<Patch, String> {

	List<Patch> findTop8ByOrderByReleasedOrderDesc();

	boolean existsByGamePatch(String gamePatch);

}
