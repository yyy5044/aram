package com.aram.community.user;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, Long> {

	Optional<User> findByDiscordId(String discordId);

	boolean existsByProfileImageIdIn(Collection<UUID> imageIds);

	@Query("select count(u) > 0 from User u where lower(u.nickname) = lower(:nickname) and u.id <> :excludeId")
	boolean nicknameTakenByOther(String nickname, long excludeId);

}
