package com.aram.community.image;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ImageRepository extends JpaRepository<Image, UUID> {

	List<Image> findByPostId(Long postId);

	@Query("select i from Image i where i.postId is null and i.createdAt < :cutoff "
			+ "and not exists (select 1 from User u where u.profileImageId = i.id)")
	List<Image> findUnlinkedBefore(Instant cutoff);

	@Modifying
	@Query("update Image i set i.postId = :postId where i.id in :ids")
	int linkAll(long postId, Collection<UUID> ids);

	@Modifying
	@Query("update Image i set i.postId = null where i.postId = :postId and i.id not in :keep")
	int unlinkOthers(long postId, Collection<UUID> keep);

	@Modifying
	@Query("update Image i set i.postId = null where i.postId = :postId")
	int unlinkAll(long postId);

}
