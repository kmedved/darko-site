-- Publish the separately modeled Season-Adjusted WOWY player-season product.
--
-- This table is intentionally independent of the daily-derived
-- wowy_season_player_averages table. Daily publication may replace the latter;
-- the adjusted product changes only when the seasonal model is rebuilt and
-- explicitly published.

create table if not exists public.wowy_season_adjusted_ratings (
    season integer not null,
    nba_id bigint not null,
    team_code text not null,
    team_name text not null,
    team_codes text[] not null,
    team_names text[] not null,
    first_date date not null,
    last_date date not null,
    season_games integer not null,
    playoff_games integer not null,
    possessions double precision not null,
    playoff_possessions double precision not null,
    wowy_rapm double precision not null,
    wowy_orapm double precision not null,
    wowy_drapm double precision not null,
    method_version text not null,
    application_model text not null,
    constraint wowy_season_adjusted_ratings_pkey primary key (season, nba_id),
    constraint wowy_season_adjusted_ratings_season_check check (season >= 1980),
    constraint wowy_season_adjusted_ratings_nba_id_check check (nba_id > 0),
    constraint wowy_season_adjusted_ratings_team_display_check check (
        length(btrim(team_code)) > 0
        and length(btrim(team_name)) > 0
        and team_code = array_to_string(team_codes, '/')
        and team_name = array_to_string(team_names, ' / ')
    ),
    constraint wowy_season_adjusted_ratings_team_arrays_check check (
        array_ndims(team_codes) = 1
        and array_ndims(team_names) = 1
        and cardinality(team_codes) > 0
        and cardinality(team_codes) = cardinality(team_names)
        and array_position(team_codes, null) is null
        and array_position(team_names, null) is null
    ),
    constraint wowy_season_adjusted_ratings_dates_check check (first_date <= last_date),
    constraint wowy_season_adjusted_ratings_games_check check (
        season_games > 0
        and playoff_games >= 0
        and playoff_games <= season_games
    ),
    constraint wowy_season_adjusted_ratings_metrics_check check (
        possessions >= 0
        and possessions < 'Infinity'::double precision
        and playoff_possessions >= 0
        and playoff_possessions < 'Infinity'::double precision
        and wowy_rapm > '-Infinity'::double precision
        and wowy_rapm < 'Infinity'::double precision
        and wowy_orapm > '-Infinity'::double precision
        and wowy_orapm < 'Infinity'::double precision
        and wowy_drapm > '-Infinity'::double precision
        and wowy_drapm < 'Infinity'::double precision
        and abs((wowy_orapm + wowy_drapm) - wowy_rapm) <= 0.0000000001
    ),
    constraint wowy_season_adjusted_ratings_method_check check (
        length(btrim(method_version)) > 0
        and length(btrim(application_model)) > 0
    )
);

create index if not exists idx_wowy_season_adjusted_ratings_season_rating
    on public.wowy_season_adjusted_ratings (season, wowy_rapm desc, nba_id);

create table if not exists public.wowy_season_adjusted_publication (
    id smallint primary key,
    publication_id text not null unique,
    source_sha256 text not null,
    output_sha256 text not null,
    season_from integer not null,
    season_through integer not null,
    data_through date not null,
    row_count integer not null,
    player_count integer not null,
    method_version text not null,
    application_model text not null,
    published_at timestamptz not null default now(),
    constraint wowy_season_adjusted_publication_singleton_check check (id = 1),
    constraint wowy_season_adjusted_publication_range_check check (
        season_from = 1980 and season_through >= season_from
    ),
    constraint wowy_season_adjusted_publication_counts_check check (
        row_count > 0 and player_count > 0
    )
);

alter table public.wowy_season_adjusted_ratings enable row level security;
alter table public.wowy_season_adjusted_publication enable row level security;

drop policy if exists wowy_season_adjusted_ratings_public_read
    on public.wowy_season_adjusted_ratings;
create policy wowy_season_adjusted_ratings_public_read
    on public.wowy_season_adjusted_ratings
    for select
    to anon, authenticated
    using (true);

drop policy if exists wowy_season_adjusted_publication_public_read
    on public.wowy_season_adjusted_publication;
create policy wowy_season_adjusted_publication_public_read
    on public.wowy_season_adjusted_publication
    for select
    to anon, authenticated
    using (true);

revoke all on table
    public.wowy_season_adjusted_ratings,
    public.wowy_season_adjusted_publication
    from public, anon, authenticated;
grant select on table
    public.wowy_season_adjusted_ratings,
    public.wowy_season_adjusted_publication
    to anon, authenticated;

-- Keep the existing leaderboard row shape so Average and Adjusted share the
-- same client-side sorting, filtering, and table rendering. `exposure` is an
-- API compatibility alias for actual season possessions in Adjusted mode.
create or replace function public.get_wowy_adjusted_season_player_ratings(
    p_season integer
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    with season_rows as (
        select
            adjusted.season,
            adjusted.nba_id,
            players.player_name,
            adjusted.team_code,
            adjusted.team_name,
            adjusted.team_codes,
            adjusted.team_names,
            null::integer as tm_id,
            null::text as position,
            public.normalize_wowy_filter_position(players.position) as filter_position,
            case
                when players.height between 60 and 96 then players.height
                else null::double precision
            end as height_inches,
            adjusted.wowy_rapm,
            adjusted.wowy_orapm,
            adjusted.wowy_drapm,
            adjusted.possessions as exposure,
            adjusted.first_date,
            adjusted.last_date,
            adjusted.last_date as date,
            adjusted.season_games,
            adjusted.playoff_games,
            adjusted.playoff_possessions,
            adjusted.method_version,
            adjusted.application_model,
            null::integer as career_game_num,
            'season-adjusted'::text as snapshot_context
        from public.wowy_season_adjusted_ratings as adjusted
        left join public.players as players
            on players.nba_id = adjusted.nba_id
        where adjusted.season = p_season
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

create or replace function public.get_wowy_adjusted_all_time_player_seasons()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    with ranked_seasons as (
        select
            row_number() over (
                order by
                    adjusted.wowy_rapm desc,
                    adjusted.season desc,
                    adjusted.nba_id
            ) as leaderboard_rank,
            adjusted.season,
            adjusted.nba_id,
            players.player_name,
            adjusted.team_code,
            adjusted.team_name,
            adjusted.team_codes,
            adjusted.team_names,
            null::integer as tm_id,
            null::text as position,
            public.normalize_wowy_filter_position(players.position) as filter_position,
            case
                when players.height between 60 and 96 then players.height
                else null::double precision
            end as height_inches,
            adjusted.wowy_rapm,
            adjusted.wowy_orapm,
            adjusted.wowy_drapm,
            adjusted.possessions as exposure,
            adjusted.first_date,
            adjusted.last_date,
            adjusted.last_date as date,
            adjusted.season_games,
            adjusted.playoff_games,
            adjusted.playoff_possessions,
            adjusted.method_version,
            adjusted.application_model,
            null::integer as career_game_num,
            'season-adjusted'::text as snapshot_context
        from public.wowy_season_adjusted_ratings as adjusted
        left join public.players as players
            on players.nba_id = adjusted.nba_id
    ),
    top_seasons as (
        select *
        from ranked_seasons
        order by leaderboard_rank
        limit 100
    )
    select coalesce(
        jsonb_agg(to_jsonb(top_seasons) order by top_seasons.leaderboard_rank),
        '[]'::jsonb
    )
    from top_seasons;
$function$;

revoke all on function
    public.get_wowy_adjusted_season_player_ratings(integer)
    from public;
revoke all on function
    public.get_wowy_adjusted_all_time_player_seasons()
    from public;
grant execute on function
    public.get_wowy_adjusted_season_player_ratings(integer)
    to anon, authenticated, service_role;
grant execute on function
    public.get_wowy_adjusted_all_time_player_seasons()
    to anon, authenticated, service_role;

notify pgrst, 'reload schema';
