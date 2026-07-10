-- Public synthetic WOWY RAPM history for the Trajectories page.

create table if not exists public.wowy_ratings (
    nba_id bigint not null,
    game_id text not null,
    date date not null,
    season integer not null,
    career_game_num integer not null,
    age double precision not null,
    wowy_rapm double precision not null,
    wowy_orapm double precision not null,
    wowy_drapm double precision not null,
    exposure double precision not null,
    constraint wowy_ratings_pkey primary key (nba_id, game_id),
    constraint wowy_ratings_player_date_key unique (nba_id, date),
    constraint wowy_ratings_player_game_num_key unique (nba_id, career_game_num),
    constraint wowy_ratings_game_num_positive check (career_game_num > 0)
);

create index if not exists idx_wowy_ratings_player_date
    on public.wowy_ratings (nba_id, date);
create index if not exists idx_wowy_ratings_player_game_num
    on public.wowy_ratings (nba_id, career_game_num);
create index if not exists idx_wowy_ratings_season
    on public.wowy_ratings (season);

create table if not exists public.wowy_publication (
    id smallint primary key default 1,
    publication_id text not null unique,
    composite_sha256 text not null,
    output_sha256 text not null,
    data_through date not null,
    season_through integer not null,
    row_count bigint not null,
    player_count integer not null,
    published_at timestamptz not null default now(),
    constraint wowy_publication_singleton check (id = 1)
);

alter table if exists public.wowy_ratings enable row level security;
alter table if exists public.wowy_publication enable row level security;

drop policy if exists wowy_ratings_public_read on public.wowy_ratings;
create policy wowy_ratings_public_read
    on public.wowy_ratings
    for select
    to anon, authenticated
    using (true);

drop policy if exists wowy_publication_public_read on public.wowy_publication;
create policy wowy_publication_public_read
    on public.wowy_publication
    for select
    to anon, authenticated
    using (true);

revoke all
    on table public.wowy_ratings, public.wowy_publication
    from public, anon, authenticated;

grant select
    on table public.wowy_ratings, public.wowy_publication
    to anon, authenticated;
