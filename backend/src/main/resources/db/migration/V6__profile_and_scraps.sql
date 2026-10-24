alter table users
    add column profile_image_id uuid references images (id) on delete set null,
    add column profile_public   boolean not null default true;

create table scraps (
    user_id     bigint      not null references users (id),
    post_id     bigint      not null references posts (id) on delete cascade,
    created_at  timestamptz not null,
    primary key (user_id, post_id)
);

create index scraps_user_created_idx on scraps (user_id, created_at desc);
create index posts_author_created_idx on posts (author_id, created_at);
create index comments_author_created_idx on comments (author_id, created_at);
