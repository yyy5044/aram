create table post_likes (
    post_id     bigint      not null references posts (id) on delete cascade,
    user_id     bigint      not null references users (id),
    created_at  timestamptz not null,
    primary key (post_id, user_id)
);
