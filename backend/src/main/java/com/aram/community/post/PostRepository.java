package com.aram.community.post;

import com.aram.community.gamedata.Augment;
import com.aram.community.gamedata.Champion;
import com.aram.community.gamedata.Item;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PostRepository extends JpaRepository<Post, Long> {

	/** 태그 필터는 null이면 무시해요. 여럿이면 모두 만족하는 글만. */
	@EntityGraph(attributePaths = "author")
	@Query(value = """
			select p from Post p
			where (:championId is null or exists (select 1 from p.champions c where c.id = :championId))
			  and (:augmentId is null or exists (select 1 from p.augments a where a.id = :augmentId))
			  and (:itemId is null or exists (select 1 from p.items i where i.id = :itemId))
			""", countQuery = """
			select count(p) from Post p
			where (:championId is null or exists (select 1 from p.champions c where c.id = :championId))
			  and (:augmentId is null or exists (select 1 from p.augments a where a.id = :augmentId))
			  and (:itemId is null or exists (select 1 from p.items i where i.id = :itemId))
			""")
	Page<Post> search(String championId, String augmentId, Integer itemId, Pageable pageable);

	@EntityGraph(attributePaths = "author")
	Page<Post> findByAuthor_Id(Long authorId, Pageable pageable);

	long countByAuthor_Id(Long authorId);

	/** 이 사람이 쓴 글들이 받은 추천 수의 합(글이 없으면 0). */
	@Query("select coalesce(sum(p.likeCount), 0) from Post p where p.author.id = :authorId")
	long sumLikeCountByAuthorId(long authorId);

	/** 스크랩한 시간의 최신순. Scrap 엔티티는 scrap 패키지에 있어요. */
	@EntityGraph(attributePaths = "author")
	@Query(value = "select p from Post p, Scrap s where s.postId = p.id and s.userId = :userId order by s.createdAt desc, p.id desc",
			countQuery = "select count(s) from Scrap s where s.userId = :userId")
	Page<Post> findScrappedBy(Long userId, Pageable pageable);

	interface PostChampion {

		Long getPostId();

		Champion getChampion();

	}

	interface PostAugment {

		Long getPostId();

		Augment getAugment();

	}

	interface PostItem {

		Long getPostId();

		Item getItem();

	}

	interface TagCount {

		String getId();

		long getPostCount();

	}

	interface AugmentCount {

		Augment getAugment();

		long getPostCount();

	}

	/** 태그별 글 수. 글이 하나도 없는 태그는 나오지 않아요. */
	@Query("select c.id as id, count(p) as postCount from Post p join p.champions c group by c.id")
	List<TagCount> countByChampion();

	@Query("select a.id as id, count(p) as postCount from Post p join p.augments a group by a.id")
	List<TagCount> countByAugment();

	@Query("select cast(i.id as string) as id, count(p) as postCount from Post p join p.items i group by i.id")
	List<TagCount> countByItem();

	/** 이 챔피언 글에 함께 태그된 증강을 많이 쓰인 순으로. 지금 게임에 있는 증강만. */
	@Query("""
			select a as augment, count(p) as postCount from Post p join p.champions c join p.augments a
			where c.id = :championId and a.active = true
			group by a order by count(p) desc, a.nameKo asc
			""")
	List<AugmentCount> topAugmentsWith(String championId, Pageable limit);

	@Query("select p.id as postId, c as champion from Post p join p.champions c where p.id in :postIds")
	List<PostChampion> findChampionTags(Collection<Long> postIds);

	@Query("select p.id as postId, a as augment from Post p join p.augments a where p.id in :postIds")
	List<PostAugment> findAugmentTags(Collection<Long> postIds);

	@Query("select p.id as postId, i as item from Post p join p.items i where p.id in :postIds")
	List<PostItem> findItemTags(Collection<Long> postIds);

}
