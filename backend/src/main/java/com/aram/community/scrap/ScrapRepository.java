package com.aram.community.scrap;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ScrapRepository extends JpaRepository<Scrap, ScrapId> {

	long countByUserId(Long userId);

}
