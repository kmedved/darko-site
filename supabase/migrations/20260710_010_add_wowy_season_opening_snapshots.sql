-- Publish a single historical WOWY snapshot for each player-season, beginning
-- with the 1979-80 NBA season. These rows are model-owned opening-game
-- snapshots: the players who appeared in each team's first game, with the
-- historical team code/name from that game and the corresponding WOWY rating.
--
-- This deliberately does not use player_ratings for historical identity. That
-- table begins in 1996-97 and its current-team metadata is unsafe for defunct
-- or relocated franchises (for example SEA, NJN, KCK, and WSB).

create table if not exists public.wowy_season_opening_snapshots (
    season integer not null,
    nba_id bigint not null,
    team_code text not null,
    team_name text not null,
    opening_date date not null,
    game_id text not null,
    wowy_rapm double precision not null,
    wowy_orapm double precision not null,
    wowy_drapm double precision not null,
    exposure double precision not null,
    career_game_num integer not null,
    constraint wowy_season_opening_snapshots_pkey primary key (season, nba_id),
    constraint wowy_season_opening_snapshots_player_game_key unique (nba_id, game_id),
    constraint wowy_season_opening_snapshots_season_check check (season >= 1980),
    constraint wowy_season_opening_snapshots_team_code_check check (length(btrim(team_code)) > 0),
    constraint wowy_season_opening_snapshots_team_name_check check (length(btrim(team_name)) > 0),
    constraint wowy_season_opening_snapshots_career_game_num_check check (career_game_num > 0)
);

create index if not exists idx_wowy_season_opening_snapshots_season_rating
    on public.wowy_season_opening_snapshots (season, wowy_rapm desc, nba_id);

alter table public.wowy_season_opening_snapshots enable row level security;

drop policy if exists wowy_season_opening_snapshots_public_read
    on public.wowy_season_opening_snapshots;
create policy wowy_season_opening_snapshots_public_read
    on public.wowy_season_opening_snapshots
    for select
    to anon, authenticated
    using (true);

revoke all on table public.wowy_season_opening_snapshots
    from public, anon, authenticated;
grant select on table public.wowy_season_opening_snapshots
    to anon, authenticated;

-- The snapshot table is the complete all-era source of truth for the season
-- selector. It is intentionally small (~16K rows), so distinct season lookup
-- is both transparent and fast with the season-leading index above.
create or replace function public.get_wowy_leaderboard_seasons()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    select coalesce(
        jsonb_agg(snapshot_seasons.season order by snapshot_seasons.season desc),
        '[]'::jsonb
    )
    from (
        select distinct snapshots.season
        from public.wowy_season_opening_snapshots as snapshots
    ) as snapshot_seasons;
$function$;

-- Return an all-era historical WOWY snapshot. The rating is the model's
-- opening-game observation, not a complete opening-day roster or a value
-- inferred from present-day team information. `team_code` preserves historic
-- franchises verbatim; tm_id and position are intentionally unavailable.
create or replace function public.get_wowy_season_player_ratings(p_season integer)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    with season_rows as (
        select
            snapshots.nba_id,
            players.player_name,
            snapshots.team_code,
            snapshots.team_name,
            null::integer as tm_id,
            null::text as position,
            snapshots.wowy_rapm,
            snapshots.wowy_orapm,
            snapshots.wowy_drapm,
            snapshots.exposure,
            snapshots.opening_date as date,
            snapshots.game_id,
            snapshots.career_game_num,
            'opening-game'::text as snapshot_context
        from public.wowy_season_opening_snapshots as snapshots
        left join public.players as players
            on players.nba_id = snapshots.nba_id
        where snapshots.season = p_season
    )
    select coalesce(
        jsonb_agg(
            to_jsonb(season_rows)
            order by season_rows.wowy_rapm desc, season_rows.player_name, season_rows.nba_id
        ),
        '[]'::jsonb
    )
    from season_rows;
$function$;

revoke all on function public.get_wowy_leaderboard_seasons() from public;
revoke all on function public.get_wowy_season_player_ratings(integer) from public;
grant execute on function public.get_wowy_leaderboard_seasons()
    to anon, authenticated, service_role;
grant execute on function public.get_wowy_season_player_ratings(integer)
    to anon, authenticated, service_role;

notify pgrst, 'reload schema';
