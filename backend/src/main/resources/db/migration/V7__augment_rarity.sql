alter table augments add column rarity varchar(10) not null default 'SILVER';

-- 다음 동기화가 패치가 바뀐 것처럼 전체를 다시 받아서 기존 증강의 등급을 채우게 해요.
update game_data_state set current_ddragon_version = null;
