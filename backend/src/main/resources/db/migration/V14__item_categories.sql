-- 아이템 능력치 분류(게임 자료 mCategories, 설계 docs/superpowers/specs/2026-10-26-item-shop-design.md 4.1)
alter table items add column categories text[] not null default '{}';
-- CommunityDragon 버전만 비워서 다음 시작 때 전체 재동기화로 채워요. Data Dragon 버전은 그대로라 그림 주소가 비지 않아요.
update game_data_state set current_cdragon_version = null;
