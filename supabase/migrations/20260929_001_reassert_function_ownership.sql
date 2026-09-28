-- Reassert every public function that nba_darko's publisher used to CREATE OR REPLACE on
-- each publish, from this repository's own latest definitions. The publisher no longer
-- defines functions (nba_darko docs/migration/supabase-function-ownership-and-wowy-import.md,
-- Part A). Idempotent: re-run at any time to put production at these definitions.
-- Each definition is followed by the grants its source migration gave it: revoke all from
-- PUBLIC, execute to anon, authenticated and service_role. CREATE OR REPLACE keeps an
-- existing function's grants, but a function that a later migration dropped comes back with
-- PostgreSQL's default PUBLIC EXECUTE; restating the grants means a lone re-run of this file
-- never widens privileges. Such a re-run does re-create the dropped function, so re-apply
-- the migration that dropped it afterwards.
--
-- Source migration of each definition:
--   normalize_wowy_filter_position: 20260711_001_add_wowy_leaderboard_bio_filters.sql
--   get_active_player_ratings: 20260710_002_add_active_player_snapshot_rpc.sql
--   get_latest_player_teams: 20260710_003_add_latest_player_teams_rpc.sql
--   get_leaderboard_seasons: 20260710_005_add_historical_leaderboard_snapshot_rpcs.sql
--   get_season_start_player_ratings: 20260710_005_add_historical_leaderboard_snapshot_rpcs.sql
--   get_latest_player_search_ratings: 20260710_006_add_player_search_snapshot_rpc.sql
--   get_active_wowy_player_ratings: 20260711_001_add_wowy_leaderboard_bio_filters.sql
--   get_wowy_leaderboard_seasons: activation-aware merge of 20260710_010 and the activation operation
--   get_wowy_season_player_ratings: 20260814_001_publish_unified_wowy_from_1957.sql

begin;

-- normalize_wowy_filter_position (from 20260711_001_add_wowy_leaderboard_bio_filters.sql)
create or replace function public.normalize_wowy_filter_position(p_position text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $function$
    with normalized as (
        select upper(btrim(p_position)) as position
    )
    select case
        when normalized.position is null or normalized.position = '' then null
        when normalized.position in ('G', 'PG', 'SG', 'GUARD') then 'G'
        when normalized.position in (
            'G-F',
            'F-G',
            'GUARD-FORWARD',
            'FORWARD-GUARD'
        ) then 'G-F'
        when normalized.position in ('F', 'SF', 'PF', 'FORWARD') then 'F'
        when normalized.position in (
            'F-C',
            'C-F',
            'FORWARD-CENTER',
            'CENTER-FORWARD'
        ) then 'F-C'
        when normalized.position in ('C', 'CENTER') then 'C'
        -- Some older crosswalk rows contain the traditional 1–5 scale.
        -- Preserve its inclusive guard/forward/center meaning rather than
        -- exposing a second, incompatible set of filter values.
        when normalized.position ~ '^[1-5]([.]0|[.]5)?$' then
            case
                when normalized.position::numeric <= 2 then 'G'
                when normalized.position::numeric < 3 then 'G-F'
                when normalized.position::numeric <= 3 then 'F'
                when normalized.position::numeric < 5 then 'F-C'
                else 'C'
            end
        else null
    end
    from normalized;
$function$;

revoke all on function public.normalize_wowy_filter_position(text) from public;
grant execute on function public.normalize_wowy_filter_position(text)
    to anon, authenticated, service_role;

-- get_active_player_ratings (from 20260710_002_add_active_player_snapshot_rpc.sql)
create or replace function public.get_active_player_ratings(p_season integer)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    select coalesce(jsonb_agg(to_jsonb(latest)), '[]'::jsonb)
    from (
        select distinct on (pr.nba_id) pr.*
        from public.player_ratings as pr
        where pr.season = p_season
          and pr.active_roster = 1
        order by pr.nba_id, pr.date desc
    ) as latest;
$function$;

revoke all on function public.get_active_player_ratings(integer) from public;
grant execute on function public.get_active_player_ratings(integer)
    to anon, authenticated, service_role;

-- get_latest_player_teams (from 20260710_003_add_latest_player_teams_rpc.sql)
create or replace function public.get_latest_player_teams(
    p_ids bigint[],
    p_start_date date default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    select coalesce(jsonb_agg(to_jsonb(latest)), '[]'::jsonb)
    from (
        select distinct on (pr.nba_id)
            pr.nba_id,
            pr.team_name,
            pr.tm_id
        from public.player_ratings as pr
        where pr.nba_id = any(p_ids)
          and pr.team_name is not null
          and pr.tm_id > 0
          and (p_start_date is null or pr.date >= p_start_date)
        order by pr.nba_id, pr.date desc
    ) as latest;
$function$;

revoke all on function public.get_latest_player_teams(bigint[], date) from public;
grant execute on function public.get_latest_player_teams(bigint[], date)
    to anon, authenticated, service_role;

-- get_leaderboard_seasons (from 20260710_005_add_historical_leaderboard_snapshot_rpcs.sql)
create or replace function public.get_leaderboard_seasons()
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
        select distinct pr.season::integer as season
        from public.player_ratings as pr
        where pr.season is not null
    ) as seasons;
$function$;

revoke all on function public.get_leaderboard_seasons() from public;
grant execute on function public.get_leaderboard_seasons()
    to anon, authenticated, service_role;

-- get_season_start_player_ratings (from 20260710_005_add_historical_leaderboard_snapshot_rpcs.sql)
create or replace function public.get_season_start_player_ratings(p_season integer)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    with team_openers as (
        select
            pr.team_name,
            min(pr.date) as opening_date
        from public.player_ratings as pr
        where pr.season = p_season
          and pr.team_name is not null
        group by pr.team_name
    ), season_start_rows as (
        select distinct on (pr.nba_id) pr.*
        from public.player_ratings as pr
        inner join team_openers as opener
            on pr.team_name = opener.team_name
           and pr.date = opener.opening_date
        where pr.season = p_season
        order by pr.nba_id, pr.date asc
    )
    select coalesce(
        jsonb_agg(to_jsonb(season_start_rows) order by season_start_rows.nba_id),
        '[]'::jsonb
    )
    from season_start_rows;
$function$;

revoke all on function public.get_season_start_player_ratings(integer) from public;
grant execute on function public.get_season_start_player_ratings(integer)
    to anon, authenticated, service_role;

-- get_latest_player_search_ratings (from 20260710_006_add_player_search_snapshot_rpc.sql)
create or replace function public.get_latest_player_search_ratings(p_ids bigint[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    select coalesce(
        jsonb_agg(to_jsonb(latest) order by latest.nba_id),
        '[]'::jsonb
    )
    from (
        select distinct on (pr.nba_id)
            pr.nba_id,
            pr.date,
            pr.team_name,
            pr.tm_id,
            pr.dpm,
            pr.o_dpm,
            pr.d_dpm
        from public.player_ratings as pr
        where pr.nba_id = any(p_ids)
        order by pr.nba_id, pr.date desc
    ) as latest;
$function$;

revoke all on function public.get_latest_player_search_ratings(bigint[]) from public;
grant execute on function public.get_latest_player_search_ratings(bigint[])
    to anon, authenticated, service_role;

-- get_active_wowy_player_ratings (from 20260711_001_add_wowy_leaderboard_bio_filters.sql)
create or replace function public.get_active_wowy_player_ratings()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    with current_season as (
        select pr.season::integer as season
        from public.player_ratings as pr
        where pr.season is not null
        order by pr.season desc
        limit 1
    ), active_players as (
        select distinct on (pr.nba_id)
            pr.nba_id,
            pr.team_name,
            pr.tm_id,
            pr.position
        from public.player_ratings as pr
        inner join current_season as current_snapshot
            on pr.season = current_snapshot.season
        where pr.active_roster = 1
        order by pr.nba_id, pr.date desc
    ), latest_wowy as (
        select
            active.nba_id,
            players.player_name,
            coalesce(active.team_name, players.current_team) as team_name,
            active.tm_id,
            coalesce(active.position, players.position) as position,
            public.normalize_wowy_filter_position(
                coalesce(active.position, players.position)
            ) as filter_position,
            case
                when players.height between 60 and 96 then players.height
                else null::double precision
            end as height_inches,
            wowy.wowy_rapm,
            wowy.wowy_orapm,
            wowy.wowy_drapm,
            wowy.exposure,
            wowy.date,
            wowy.career_game_num
        from active_players as active
        left join public.players as players
            on players.nba_id = active.nba_id
        cross join lateral (
            select
                wr.wowy_rapm,
                wr.wowy_orapm,
                wr.wowy_drapm,
                wr.exposure,
                wr.date,
                wr.career_game_num
            from public.wowy_ratings as wr
            where wr.nba_id = active.nba_id
            order by wr.date desc
            limit 1
        ) as wowy
    )
    select coalesce(
        jsonb_agg(
            to_jsonb(latest_wowy)
            order by latest_wowy.wowy_rapm desc nulls last, latest_wowy.player_name
        ),
        '[]'::jsonb
    )
    from latest_wowy;
$function$;

revoke all on function public.get_active_wowy_player_ratings() from public;
grant execute on function public.get_active_wowy_player_ratings()
    to anon, authenticated, service_role;

-- get_wowy_leaderboard_seasons: one definition for both activation states. Migration
-- 20260710_010 lists seasons from the opening snapshots; the manual activation operation
-- (supabase/operations/20260710_activate_wowy_season_player_averages.sql) replaced it with a
-- list from the season averages once they were certified. Production is activated. This
-- version checks the activation marker itself, the way get_wowy_season_player_ratings does,
-- so a fresh replay and production converge on the same function.
create or replace function public.get_wowy_leaderboard_seasons()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
begin
    if public.is_wowy_season_average_activated() then
        return (
            select coalesce(
                jsonb_agg(seasons.season order by seasons.season desc),
                '[]'::jsonb
            )
            from (
                select distinct averages.season
                from public.wowy_season_player_averages as averages
            ) as seasons
        );
    end if;
    return (
        select coalesce(
            jsonb_agg(snapshot_seasons.season order by snapshot_seasons.season desc),
            '[]'::jsonb
        )
        from (
            select distinct snapshots.season
            from public.wowy_season_opening_snapshots as snapshots
        ) as snapshot_seasons
    );
end;
$function$;

revoke all on function public.get_wowy_leaderboard_seasons() from public;
grant execute on function public.get_wowy_leaderboard_seasons()
    to anon, authenticated, service_role;

-- get_wowy_season_player_ratings (from 20260814_001_publish_unified_wowy_from_1957.sql)
create or replace function public.get_wowy_season_player_ratings(p_season integer)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
begin
    if public.is_wowy_season_average_activated() then
        return (
            with season_rows as (
                select
                    averages.season,
                    averages.nba_id,
                    coalesce(averages.player_name, players.player_name) as player_name,
                    averages.league,
                    averages.cross_league_level_identified,
                    averages.team_code,
                    averages.team_name,
                    averages.team_codes,
                    averages.team_names,
                    null::integer as tm_id,
                    null::text as position,
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
            from season_rows
        );
    end if;

    return (
        with season_rows as (
            select
                snapshots.season,
                snapshots.nba_id,
                coalesce(snapshots.player_name, players.player_name) as player_name,
                snapshots.league,
                snapshots.cross_league_level_identified,
                snapshots.team_code,
                snapshots.team_name,
                null::integer as tm_id,
                null::text as position,
                public.normalize_wowy_filter_position(players.position) as filter_position,
                case
                    when players.height between 60 and 96 then players.height
                    else null::double precision
                end as height_inches,
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
        from season_rows
    );
end;
$function$;

revoke all on function public.get_wowy_season_player_ratings(integer) from public;
grant execute on function public.get_wowy_season_player_ratings(integer)
    to anon, authenticated, service_role;

commit;
