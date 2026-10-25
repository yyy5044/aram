package com.aram.community.video;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface VideoRepository extends JpaRepository<Video, UUID> {

	List<Video> findByPostId(Long postId);

	List<Video> findByStatusInAndCreatedAtBefore(Collection<VideoStatus> statuses, Instant before);

	long countByUploaderIdAndStatusIn(Long uploaderId, Collection<VideoStatus> statuses);

	@Query("select v from Video v where v.postId is null and v.createdAt < :cutoff")
	List<Video> findUnlinkedBefore(Instant cutoff);

	/** 변환 중 진행률만 바꿔요. 엔티티를 통째로 저장하면 다른 변경을 덮어쓸 수 있어서 따로 둬요. */
	@Transactional
	@Modifying
	@Query("update Video v set v.progress = :progress where v.id = :id and v.status = com.aram.community.video.VideoStatus.PROCESSING")
	int updateProgress(UUID id, short progress);

	@Modifying
	@Query("update Video v set v.postId = :postId where v.id in :ids")
	int linkAll(long postId, Collection<UUID> ids);

	@Modifying
	@Query("update Video v set v.postId = null where v.postId = :postId and v.id not in :keep")
	int unlinkOthers(long postId, Collection<UUID> keep);

	@Modifying
	@Query("update Video v set v.postId = null where v.postId = :postId")
	int unlinkAll(long postId);

}
