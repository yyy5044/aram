create table champions (
    id          varchar(40) primary key,
    name_ko     varchar(40) not null,
    image_file  varchar(80) not null
);

create table augments (
    id          varchar(80)  primary key,
    name_ko     varchar(80)  not null,
    icon_path   varchar(200) not null,
    active      boolean      not null,
    updated_at  timestamptz  not null
);

create table patches (
    ddragon_version  varchar(20) primary key,
    game_patch       varchar(10) not null,
    released_order   int         not null
);

create table game_data_state (
    id                       int primary key,
    current_ddragon_version  varchar(20),
    current_game_patch       varchar(10),
    last_checked_at          timestamptz,
    last_synced_at           timestamptz,
    last_error               text
);

insert into game_data_state (id) values (1);
