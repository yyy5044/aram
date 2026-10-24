create table augment_texts (
    augment_id   varchar(80)  not null references augments (id),
    locale       varchar(10)  not null,
    name         varchar(120) not null,
    description  text         not null,
    updated_at   timestamptz  not null,
    primary key (augment_id, locale)
);

-- 기본값이 있어야 기존 테스트의 insert 문과 예전 행이 그대로 통과해요. 실제 값은 다음 동기화가 채워요.
alter table augments add column large_icon_path varchar(200) not null default '';
update augments set large_icon_path = icon_path;

-- 다음 동기화가 전체를 다시 받아 설명과 큰 아이콘을 채우게 해요 (V7과 같은 방식).
update game_data_state set current_ddragon_version = null;
