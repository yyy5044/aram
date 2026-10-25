package com.aram.community.gamedata;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemTextRepository extends JpaRepository<ItemText, ItemTextId> {

	List<ItemText> findByIdItemId(int itemId);

}
