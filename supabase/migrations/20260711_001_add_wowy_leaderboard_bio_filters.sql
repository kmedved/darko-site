-- Add stable player-dimension filters to every WOWY leaderboard payload.
--
-- `position` remains the current-roster/display field for Current and stays
-- NULL for historical rows. `filter_position` is deliberately separate: it
-- is a normalized classification used only for filtering (current roster data
-- for Current; player-dimension data for historical rows).
-- Likewise, `height_inches` is listed player bio metadata, not a claim about a
-- player's historical roster, team, or game identity.

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

-- Current view: retain the current roster's display position, while using that
-- same current classification for the normalized filter position. Height comes
-- only from the player dimension and invalid/missing placeholders stay NULL.
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

-- Historical selected seasons support the publication's opening-game fallback
-- until the manual average activation occurs. In both branches the bio-only
-- filter fields are separate from the intentionally NULL historical position.
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
                    players.player_name,
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
                snapshots.nba_id,
                players.player_name,
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

-- All-time remains gated on the manually certified season-average publication.
-- It gets the same bio metadata without changing rank, team provenance, or the
-- deliberate absence of a historical display position.
create or replace function public.get_wowy_all_time_player_seasons()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
begin
    if not public.is_wowy_season_average_activated() then
        return '[]'::jsonb;
    end if;

    return (
        with ranked_seasons as (
            select
                row_number() over (
                    order by
                        averages.wowy_rapm desc,
                        averages.season desc,
                        averages.nba_id
                ) as leaderboard_rank,
                averages.season,
                averages.nba_id,
                players.player_name,
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
        ),
        top_seasons as (
            select *
            from ranked_seasons
            order by leaderboard_rank
            limit 100
        )
        select coalesce(
            jsonb_agg(
                to_jsonb(top_seasons)
                order by top_seasons.leaderboard_rank
            ),
            '[]'::jsonb
        )
        from top_seasons
    );
end;
$function$;

revoke all on function public.get_active_wowy_player_ratings() from public;
revoke all on function public.get_wowy_season_player_ratings(integer) from public;
revoke all on function public.get_wowy_all_time_player_seasons() from public;
grant execute on function public.get_active_wowy_player_ratings()
    to anon, authenticated, service_role;
grant execute on function public.get_wowy_season_player_ratings(integer)
    to anon, authenticated, service_role;
grant execute on function public.get_wowy_all_time_player_seasons()
    to anon, authenticated, service_role;

notify pgrst, 'reload schema';
