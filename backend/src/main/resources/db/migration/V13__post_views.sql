-- 조회수(설계 docs/superpowers/specs/2026-10-26-view-count-design.md 4장)
alter table posts add column view_count integer not null default 0;
create index posts_view_count_idx on posts (view_count desc, created_at desc, id desc);

-- 같은 사람(u:사용자번호 또는 a:브라우저 쿠키)은 한 글을 하루(한국 시간 날짜)에 한 번만 세요.
create table post_views (
    post_id    bigint      not null references posts (id) on delete cascade,
    viewer_key varchar(50) not null,
    view_date  date        not null,
    primary key (post_id, viewer_key, view_date)
);
create index post_views_view_date_idx on post_views (view_date);
