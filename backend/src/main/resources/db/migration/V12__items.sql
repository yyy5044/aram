create table items (
    id          int primary key,            -- 게임 아이템 번호
    name_ko     varchar(80)  not null,
    tier        varchar(20)  not null,      -- AUGMENT_MODE·LEGENDARY·EPIC·BOOTS·BASIC·STARTER
    price_total int          not null,
    icon_file   varchar(40)  not null,      -- "3084.png"
    from_ids    int[]        not null,      -- 재료(순서·중복 그대로)
    active      boolean      not null,      -- 지금 증강 칼바람 상점에 있음
    updated_at  timestamptz  not null
);

create table item_texts (
    item_id     int          not null references items (id),
    locale      varchar(5)   not null,      -- AugmentLocale과 같은 값
    name        varchar(80)  not null,
    description text         not null,
    primary key (item_id, locale)
);

create table post_items (
    post_id  bigint not null references posts (id) on delete cascade,
    item_id  int    not null references items (id),
    primary key (post_id, item_id)
);
create index post_items_item_idx on post_items (item_id);

-- 다음 동기화가 패치가 바뀐 것처럼 전체를 다시 받아서 아이템을 채우게 해요.
update game_data_state set current_ddragon_version = null;
