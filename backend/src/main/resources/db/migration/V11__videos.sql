-- 글에 넣는 영상 클립. 원본은 저장하지 않고, 변환한 MP4와 첫 장면 JPEG만 이미지 저장소의 videos/ 아래에 둬요.
create table videos (
    id             uuid         primary key,
    uploader_id    bigint       not null references users (id),
    post_id        bigint       references posts (id) on delete set null,
    status         varchar(20)  not null,
    progress       smallint     not null default 0,
    error_message  varchar(200),
    truncated      boolean      not null default false,
    storage_key    varchar(200),
    poster_key     varchar(200),
    width          int,
    height         int,
    duration_ms    int,
    size_bytes     int,
    created_at     timestamptz  not null
);

create index videos_post_idx on videos (post_id);
create index videos_unlinked_idx on videos (created_at) where post_id is null;
create index videos_status_idx on videos (status);
