-- MANUAL PRODUCTION OPERATION — do not run this file as part of normal
-- Supabase migration replay.
--
-- Run only after migration 011 has provisioned public.wowy_season_player_averages,
-- later WOWY schema migrations (currently through 20260711_001) are applied,
-- and `33_wowy_rapm/scripts/publish_wowy_season_player_averages.py --publish`
-- has loaded its checked artifact. This file opens and commits its own
-- transaction; run it with a client in autocommit mode, not inside another
-- transaction.
--
-- The guard fails closed: it compares every published `(season, nba_id)` group
-- with public.wowy_ratings, including each simple (unweighted) player-game mean,
-- so the public RPCs cannot move to a partial, stale, or weighted artifact.

begin;

do $guard$
declare
    metric_tolerance constant double precision := 0.000000001;
    source_min_season integer;
    source_max_season integer;
    source_season_count integer;
    source_game_count bigint;
    source_group_count bigint;
    average_min_season integer;
    average_max_season integer;
    average_season_count integer;
    average_game_count bigint;
    average_group_count bigint;
    missing_group_count bigint;
    extra_group_count bigint;
    mismatched_group_count bigint;
begin
    if to_regclass('public.wowy_season_player_averages') is null then
        raise exception
            'Cannot activate WOWY season averages: run migration 011 and publish the artifact first.';
    end if;

    select
        min(wowy.season),
        max(wowy.season),
        count(distinct wowy.season)::integer,
        count(*)
    into
        source_min_season,
        source_max_season,
        source_season_count,
        source_game_count
    from public.wowy_ratings as wowy
    where wowy.season >= 1980;

    select
        min(averages.season),
        max(averages.season),
        count(distinct averages.season)::integer,
        coalesce(sum(averages.season_games), 0),
        count(*)
    into
        average_min_season,
        average_max_season,
        average_season_count,
        average_game_count,
        average_group_count
    from public.wowy_season_player_averages as averages;

    with source_groups as (
        select
            wowy.season,
            wowy.nba_id,
            count(*) as season_games,
            min(wowy.date) as first_date,
            max(wowy.date) as last_date,
            avg(wowy.wowy_rapm)::double precision as wowy_rapm,
            avg(wowy.wowy_orapm)::double precision as wowy_orapm,
            avg(wowy.wowy_drapm)::double precision as wowy_drapm,
            avg(wowy.exposure)::double precision as exposure
        from public.wowy_ratings as wowy
        where wowy.season >= 1980
        group by wowy.season, wowy.nba_id
    ),
    group_comparison as (
        select
            source.season as source_season,
            source.nba_id as source_nba_id,
            source.season_games as source_season_games,
            source.first_date as source_first_date,
            source.last_date as source_last_date,
            source.wowy_rapm as source_wowy_rapm,
            source.wowy_orapm as source_wowy_orapm,
            source.wowy_drapm as source_wowy_drapm,
            source.exposure as source_exposure,
            averages.season as average_season,
            averages.nba_id as average_nba_id,
            averages.season_games as average_season_games,
            averages.first_date as average_first_date,
            averages.last_date as average_last_date,
            averages.wowy_rapm as average_wowy_rapm,
            averages.wowy_orapm as average_wowy_orapm,
            averages.wowy_drapm as average_wowy_drapm,
            averages.exposure as average_exposure
        from source_groups as source
        full outer join public.wowy_season_player_averages as averages
            on averages.season = source.season
            and averages.nba_id = source.nba_id
    )
    select
        count(*) filter (where average_season is null),
        count(*) filter (where source_season is null),
        count(*) filter (
            where source_season is not null
                and average_season is not null
                and (
                    source_season_games <> average_season_games
                    or source_first_date is distinct from average_first_date
                    or source_last_date is distinct from average_last_date
                    or source_wowy_rapm is null
                    or average_wowy_rapm is null
                    or abs(source_wowy_rapm - average_wowy_rapm) > metric_tolerance
                    or source_wowy_orapm is null
                    or average_wowy_orapm is null
                    or abs(source_wowy_orapm - average_wowy_orapm) > metric_tolerance
                    or source_wowy_drapm is null
                    or average_wowy_drapm is null
                    or abs(source_wowy_drapm - average_wowy_drapm) > metric_tolerance
                    or source_exposure is null
                    or average_exposure is null
                    or abs(source_exposure - average_exposure) > metric_tolerance
                )
        ),
        count(*) filter (where source_season is not null)
    into
        missing_group_count,
        extra_group_count,
        mismatched_group_count,
        source_group_count
    from group_comparison;

    if source_min_season is null
       or source_min_season <> 1980
       or source_season_count <> source_max_season - source_min_season + 1
       or average_min_season is distinct from source_min_season
       or average_max_season is distinct from source_max_season
       or average_season_count is distinct from source_season_count
       or average_season_count <> average_max_season - average_min_season + 1
       or average_game_count is distinct from source_game_count
       or average_group_count is distinct from source_group_count
       or missing_group_count > 0
       or extra_group_count > 0
       or mismatched_group_count > 0 then
        raise exception
            'Cannot activate mismatched WOWY season averages (source: seasons %-% / % seasons / % games / % groups; averages: seasons %-% / % seasons / % games / % groups; missing groups: %, extra groups: %, mismatched groups: %, metric tolerance: %).',
            source_min_season,
            source_max_season,
            source_season_count,
            source_game_count,
            source_group_count,
            average_min_season,
            average_max_season,
            average_season_count,
            average_game_count,
            average_group_count,
            missing_group_count,
            extra_group_count,
            mismatched_group_count,
            metric_tolerance;
    end if;
end;
$guard$;

-- A full player_ratings rebuild restores these durable RPCs. Record that the
-- guarded cutover has completed so that the rebuild script cannot mistake a
-- merely nonempty or partial staging table for an activated publication.
create table if not exists public.wowy_season_average_activation (
    id smallint primary key,
    activated_at timestamptz not null default now(),
    source_min_season integer not null,
    source_max_season integer not null,
    source_game_count bigint not null,
    average_row_count bigint not null,
    constraint wowy_season_average_activation_singleton_check check (id = 1),
    constraint wowy_season_average_activation_minimum_check check (source_min_season = 1980),
    constraint wowy_season_average_activation_range_check check (source_max_season >= source_min_season),
    constraint wowy_season_average_activation_counts_check check (
        source_game_count > 0
        and average_row_count > 0
    )
);

alter table public.wowy_season_average_activation enable row level security;

revoke all on table public.wowy_season_average_activation
    from public, anon, authenticated;

-- The averaged table is now the all-era source of truth for the historical
-- season picker. The opening-game table remains an immutable publication
-- artifact, but is intentionally no longer used by these public RPCs.
create or replace function public.get_wowy_leaderboard_seasons()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    select coalesce(
        jsonb_agg(seasons.season order by seasons.season desc),
        '[]'::jsonb
    )
    from (
        select distinct averages.season
        from public.wowy_season_player_averages as averages
    ) as seasons;
$function$;

-- Return all published player-season averages for a selected NBA season.
-- `date` remains a backwards-compatible alias for `last_date`; consumers that
-- present seasonal context should use first_date, last_date, and season_games.
-- tm_id, position, and career_game_num are intentionally unavailable: they
-- would imply a current-team or one-game identity for a season-wide statistic.
create or replace function public.get_wowy_season_player_ratings(p_season integer)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    with season_rows as (
        select
            averages.season,
            averages.nba_id,
            players.player_name,
            averages.team_code,
            averages.team_name,
            averages.team_codes,
            averages.team_names,
            null::integer as tm_id,
            null::text as position,
            -- These are explicitly named player-dimension filters, never
            -- historical roster/team identity. `position` stays NULL above.
            public.normalize_wowy_filter_position(players.position) as filter_position,
            case
                when players.height between 60 and 96 then players.height
                else null::double precision
            end as height_inches,
            averages.wowy_rapm,
            averages.wowy_orapm,
            averages.wowy_drapm,
            averages.exposure,
            averages.first_date,
            averages.last_date,
            averages.last_date as date,
            averages.season_games,
            null::integer as career_game_num,
            'season-average'::text as snapshot_context
        from public.wowy_season_player_averages as averages
        left join public.players as players
            on players.nba_id = averages.nba_id
        where averages.season = p_season
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

-- Write the durable marker only after the public RPC contract and grants are
-- in place. The parent ratings publisher uses this to choose the contract to
-- restore after a future player_ratings rebuild.
insert into public.wowy_season_average_activation (
    id,
    source_min_season,
    source_max_season,
    source_game_count,
    average_row_count
)
select
    1,
    min(wowy.season),
    max(wowy.season),
    count(*),
    (select count(*) from public.wowy_season_player_averages)
from public.wowy_ratings as wowy
where wowy.season >= 1980
on conflict (id) do update
set
    activated_at = now(),
    source_min_season = excluded.source_min_season,
    source_max_season = excluded.source_max_season,
    source_game_count = excluded.source_game_count,
    average_row_count = excluded.average_row_count;

notify pgrst, 'reload schema';

commit;
