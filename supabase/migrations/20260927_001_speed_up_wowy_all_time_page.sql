-- Speed up the all-time WOWY leaderboard page without changing its output.
--
-- get_wowy_all_time_player_seasons_page_base took about a second per request.
-- Profiling a replica of the published tables showed where: the query called
-- normalize_wowy_filter_position() once per player-season (about 25,600 calls
-- per request; the function cannot be inlined), and it carried every full row
-- through two sorts and a materialized filter result, which spilled to disk.
-- The ranking itself was cheap.
--
-- This version keeps the output identical:
--   * each distinct listed position is normalized once (a few dozen values);
--   * only keys and sort fields pass the filter, and the page is a bounded
--     top-N sort;
--   * the all-time rank is the (wowy_rapm desc, season desc, nba_id) order,
--     so those columns are the final tie-breaker, and the rank is joined to
--     the returned page only;
--   * full rows are built for the returned page alone (at most 100 rows).
-- The argument validation, the activation gate, the filters and the sort keys
-- are unchanged text from 20260814_001_publish_unified_wowy_from_1957.sql.
-- The public wrapper get_wowy_all_time_player_seasons_page is unchanged.

create or replace function public.get_wowy_all_time_player_seasons_page_base(
    p_rating_mode text default 'average',
    p_limit integer default 100,
    p_offset integer default 0,
    p_min_possessions double precision default null,
    p_max_possessions double precision default null,
    p_search text default null,
    p_team text default null,
    p_position text default null,
    p_min_height double precision default null,
    p_max_height double precision default null,
    p_sort_column text default 'wowy_rapm',
    p_sort_direction text default 'desc'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
    normalized_rating_mode text := lower(btrim(coalesce(p_rating_mode, '')));
    normalized_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
    normalized_team text := nullif(btrim(coalesce(p_team, '')), '');
    normalized_position text := nullif(upper(btrim(coalesce(p_position, ''))), '');
    normalized_sort_column text := lower(btrim(coalesce(p_sort_column, '')));
    normalized_sort_direction text := lower(btrim(coalesce(p_sort_direction, '')));
begin
    if normalized_rating_mode not in ('average', 'adjusted') then
        raise exception 'Unsupported WOWY rating mode: %', p_rating_mode;
    end if;
    if p_limit is null or p_limit < 1 or p_limit > 100 then
        raise exception 'WOWY page limit must be between 1 and 100';
    end if;
    if p_offset is null or p_offset < 0 then
        raise exception 'WOWY page offset must be nonnegative';
    end if;
    if p_min_possessions is not null and p_min_possessions < 0 then
        raise exception 'Minimum possessions must be nonnegative';
    end if;
    if p_max_possessions is not null and p_max_possessions < 0 then
        raise exception 'Maximum possessions must be nonnegative';
    end if;
    if p_min_possessions is not null
       and p_max_possessions is not null
       and p_min_possessions > p_max_possessions then
        raise exception 'Minimum possessions must not exceed maximum possessions';
    end if;
    if p_min_height is not null
       and p_max_height is not null
       and p_min_height > p_max_height then
        raise exception 'Minimum height must not exceed maximum height';
    end if;
    if normalized_position is not null
       and normalized_position not in ('G', 'F', 'C') then
        raise exception 'Unsupported WOWY position group: %', p_position;
    end if;
    if normalized_sort_column not in (
        'player_name',
        'team_sort_label',
        'season',
        'wowy_rapm',
        'wowy_orapm',
        'wowy_drapm',
        'exposure',
        'season_possessions',
        'season_games',
        'last_date'
    ) then
        raise exception 'Unsupported WOWY sort column: %', p_sort_column;
    end if;
    if normalized_sort_direction not in ('asc', 'desc') then
        raise exception 'Unsupported WOWY sort direction: %', p_sort_direction;
    end if;

    if normalized_rating_mode = 'average'
       and not public.is_wowy_season_average_activated() then
        return jsonb_build_object(
            'rows', '[]'::jsonb,
            'total_count', 0,
            'has_more', false,
            'loaded_count', 0,
            'activated', false
        );
    end if;

    return (
        -- Normalize each distinct listed position once, not once per player-season.
        with player_positions as (
            select
                listed.position,
                public.normalize_wowy_filter_position(listed.position) as filter_position
            from (
                select distinct players.position
                from public.players as players
                where players.position is not null
            ) as listed
        ),
        -- Every field the filters and sorts read, one row per player-season.
        candidate_rows as (
            select
                averages.season,
                averages.nba_id,
                coalesce(averages.player_name, players.player_name) as player_name,
                averages.league,
                averages.team_code,
                averages.team_name,
                averages.team_codes,
                averages.team_names,
                array_to_string(averages.team_codes, ' / ') as team_sort_label,
                player_positions.filter_position,
                case
                    when players.height between 60 and 96 then players.height
                    else null::double precision
                end as height_inches,
                averages.wowy_rapm,
                averages.wowy_orapm,
                averages.wowy_drapm,
                averages.exposure,
                season_counts.possessions as season_possessions,
                averages.season_games,
                averages.last_date
            from public.wowy_season_player_averages as averages
            left join public.players as players
                on players.nba_id = averages.nba_id
            left join player_positions
                on player_positions.position = players.position
            left join public.wowy_season_adjusted_ratings as season_counts
                on season_counts.season = averages.season
               and season_counts.nba_id = averages.nba_id
            where normalized_rating_mode = 'average'

            union all

            select
                adjusted.season,
                adjusted.nba_id,
                players.player_name,
                'NBA'::text as league,
                adjusted.team_code,
                adjusted.team_name,
                adjusted.team_codes,
                adjusted.team_names,
                array_to_string(adjusted.team_codes, ' / ') as team_sort_label,
                player_positions.filter_position,
                case
                    when players.height between 60 and 96 then players.height
                    else null::double precision
                end as height_inches,
                adjusted.wowy_rapm,
                adjusted.wowy_orapm,
                adjusted.wowy_drapm,
                adjusted.possessions as exposure,
                adjusted.possessions as season_possessions,
                adjusted.season_games,
                adjusted.last_date
            from public.wowy_season_adjusted_ratings as adjusted
            left join public.players as players
                on players.nba_id = adjusted.nba_id
            left join player_positions
                on player_positions.position = players.position
            where normalized_rating_mode = 'adjusted'
        ),
        -- Only the keys and sort fields travel past the filter, so sorting and counting stay
        -- small. The all-time rank is the (wowy_rapm desc, season desc, nba_id) order, so
        -- those columns stand in for it as the final tie-breaker.
        filtered_rows as materialized (
            select
                season,
                nba_id,
                player_name,
                team_sort_label,
                wowy_rapm,
                wowy_orapm,
                wowy_drapm,
                exposure,
                season_possessions,
                season_games,
                last_date
            from candidate_rows
            where (
                    p_min_possessions is null
                    or season_possessions >= p_min_possessions
                )
              and (
                    p_max_possessions is null
                    or season_possessions <= p_max_possessions
                )
              and (
                    normalized_team is null
                    or normalized_team = any(team_codes)
                    or normalized_team = any(team_names)
                )
              and (
                    normalized_position is null
                    or normalized_position = any(
                        string_to_array(coalesce(filter_position, ''), '-')
                    )
                )
              and (p_min_height is null or height_inches >= p_min_height)
              and (p_max_height is null or height_inches <= p_max_height)
              and (
                    normalized_search is null
                    or lower(
                        concat_ws(
                            ' ',
                            player_name,
                            team_code,
                            team_name,
                            array_to_string(team_codes, ' '),
                            array_to_string(team_names, ' '),
                            league,
                            filter_position,
                            season::text
                        )
                    ) like '%' || normalized_search || '%'
                )
        ),
        -- The requested page: a bounded (top-N) sort of the narrow rows, numbered in the
        -- same order for the response.
        page_keys as (
            select
                paged.season,
                paged.nba_id,
                row_number() over (
                    order by
                        case when normalized_sort_column = 'player_name'
                                  and normalized_sort_direction = 'asc'
                            then lower(player_name) end asc nulls last,
                        case when normalized_sort_column = 'player_name'
                                  and normalized_sort_direction = 'desc'
                            then lower(player_name) end desc nulls last,
                        case when normalized_sort_column = 'team_sort_label'
                                  and normalized_sort_direction = 'asc'
                            then lower(team_sort_label) end asc nulls last,
                        case when normalized_sort_column = 'team_sort_label'
                                  and normalized_sort_direction = 'desc'
                            then lower(team_sort_label) end desc nulls last,
                        case when normalized_sort_column = 'season'
                                  and normalized_sort_direction = 'asc'
                            then season end asc nulls last,
                        case when normalized_sort_column = 'season'
                                  and normalized_sort_direction = 'desc'
                            then season end desc nulls last,
                        case when normalized_sort_column = 'wowy_rapm'
                                  and normalized_sort_direction = 'asc'
                            then wowy_rapm end asc nulls last,
                        case when normalized_sort_column = 'wowy_rapm'
                                  and normalized_sort_direction = 'desc'
                            then wowy_rapm end desc nulls last,
                        case when normalized_sort_column = 'wowy_orapm'
                                  and normalized_sort_direction = 'asc'
                            then wowy_orapm end asc nulls last,
                        case when normalized_sort_column = 'wowy_orapm'
                                  and normalized_sort_direction = 'desc'
                            then wowy_orapm end desc nulls last,
                        case when normalized_sort_column = 'wowy_drapm'
                                  and normalized_sort_direction = 'asc'
                            then wowy_drapm end asc nulls last,
                        case when normalized_sort_column = 'wowy_drapm'
                                  and normalized_sort_direction = 'desc'
                            then wowy_drapm end desc nulls last,
                        case when normalized_sort_column = 'exposure'
                                  and normalized_sort_direction = 'asc'
                            then exposure end asc nulls last,
                        case when normalized_sort_column = 'exposure'
                                  and normalized_sort_direction = 'desc'
                            then exposure end desc nulls last,
                        case when normalized_sort_column = 'season_possessions'
                                  and normalized_sort_direction = 'asc'
                            then season_possessions end asc nulls last,
                        case when normalized_sort_column = 'season_possessions'
                                  and normalized_sort_direction = 'desc'
                            then season_possessions end desc nulls last,
                        case when normalized_sort_column = 'season_games'
                                  and normalized_sort_direction = 'asc'
                            then season_games end asc nulls last,
                        case when normalized_sort_column = 'season_games'
                                  and normalized_sort_direction = 'desc'
                            then season_games end desc nulls last,
                        case when normalized_sort_column = 'last_date'
                                  and normalized_sort_direction = 'asc'
                            then last_date end asc nulls last,
                        case when normalized_sort_column = 'last_date'
                                  and normalized_sort_direction = 'desc'
                            then last_date end desc nulls last,
                        wowy_rapm desc,
                        season desc,
                        nba_id asc
                ) as page_sort_rank
            from (
                select *
                from filtered_rows
                -- Same order as the numbering above.
                order by
                        case when normalized_sort_column = 'player_name'
                                  and normalized_sort_direction = 'asc'
                            then lower(player_name) end asc nulls last,
                        case when normalized_sort_column = 'player_name'
                                  and normalized_sort_direction = 'desc'
                            then lower(player_name) end desc nulls last,
                        case when normalized_sort_column = 'team_sort_label'
                                  and normalized_sort_direction = 'asc'
                            then lower(team_sort_label) end asc nulls last,
                        case when normalized_sort_column = 'team_sort_label'
                                  and normalized_sort_direction = 'desc'
                            then lower(team_sort_label) end desc nulls last,
                        case when normalized_sort_column = 'season'
                                  and normalized_sort_direction = 'asc'
                            then season end asc nulls last,
                        case when normalized_sort_column = 'season'
                                  and normalized_sort_direction = 'desc'
                            then season end desc nulls last,
                        case when normalized_sort_column = 'wowy_rapm'
                                  and normalized_sort_direction = 'asc'
                            then wowy_rapm end asc nulls last,
                        case when normalized_sort_column = 'wowy_rapm'
                                  and normalized_sort_direction = 'desc'
                            then wowy_rapm end desc nulls last,
                        case when normalized_sort_column = 'wowy_orapm'
                                  and normalized_sort_direction = 'asc'
                            then wowy_orapm end asc nulls last,
                        case when normalized_sort_column = 'wowy_orapm'
                                  and normalized_sort_direction = 'desc'
                            then wowy_orapm end desc nulls last,
                        case when normalized_sort_column = 'wowy_drapm'
                                  and normalized_sort_direction = 'asc'
                            then wowy_drapm end asc nulls last,
                        case when normalized_sort_column = 'wowy_drapm'
                                  and normalized_sort_direction = 'desc'
                            then wowy_drapm end desc nulls last,
                        case when normalized_sort_column = 'exposure'
                                  and normalized_sort_direction = 'asc'
                            then exposure end asc nulls last,
                        case when normalized_sort_column = 'exposure'
                                  and normalized_sort_direction = 'desc'
                            then exposure end desc nulls last,
                        case when normalized_sort_column = 'season_possessions'
                                  and normalized_sort_direction = 'asc'
                            then season_possessions end asc nulls last,
                        case when normalized_sort_column = 'season_possessions'
                                  and normalized_sort_direction = 'desc'
                            then season_possessions end desc nulls last,
                        case when normalized_sort_column = 'season_games'
                                  and normalized_sort_direction = 'asc'
                            then season_games end asc nulls last,
                        case when normalized_sort_column = 'season_games'
                                  and normalized_sort_direction = 'desc'
                            then season_games end desc nulls last,
                        case when normalized_sort_column = 'last_date'
                                  and normalized_sort_direction = 'asc'
                            then last_date end asc nulls last,
                        case when normalized_sort_column = 'last_date'
                                  and normalized_sort_direction = 'desc'
                            then last_date end desc nulls last,
                        wowy_rapm desc,
                        season desc,
                        nba_id asc
                limit p_limit
                offset p_offset
            ) as paged
        ),
        -- All-time ranks from keys alone, then joined to the returned page.
        ranks as (
            select
                averages.season,
                averages.nba_id,
                row_number() over (
                    order by
                        averages.wowy_rapm desc,
                        averages.season desc,
                        averages.nba_id
                ) as leaderboard_rank
            from public.wowy_season_player_averages as averages
            where normalized_rating_mode = 'average'
              and exists (select 1 from page_keys)

            union all

            select
                adjusted.season,
                adjusted.nba_id,
                row_number() over (
                    order by
                        adjusted.wowy_rapm desc,
                        adjusted.season desc,
                        adjusted.nba_id
                ) as leaderboard_rank
            from public.wowy_season_adjusted_ratings as adjusted
            where normalized_rating_mode = 'adjusted'
              and exists (select 1 from page_keys)
        ),
        -- Full rows, built only for the returned page.
        page_rows as (
            select
                ranks.leaderboard_rank,
                averages.season,
                averages.nba_id,
                coalesce(averages.player_name, players.player_name) as player_name,
                averages.league,
                averages.cross_league_level_identified,
                averages.team_code,
                averages.team_name,
                averages.team_codes,
                averages.team_names,
                array_to_string(averages.team_codes, ' / ') as team_sort_label,
                null::integer as tm_id,
                null::text as position,
                player_positions.filter_position,
                case
                    when players.height between 60 and 96 then players.height
                    else null::double precision
                end as height_inches,
                averages.wowy_rapm,
                averages.wowy_orapm,
                averages.wowy_drapm,
                averages.exposure,
                season_counts.possessions as season_possessions,
                averages.first_date,
                averages.last_date,
                averages.last_date as date,
                averages.season_games,
                null::integer as playoff_games,
                null::double precision as playoff_possessions,
                null::text as method_version,
                null::text as application_model,
                null::integer as career_game_num,
                'season-average'::text as snapshot_context,
                page_keys.page_sort_rank
            from page_keys
            join public.wowy_season_player_averages as averages
                on averages.season = page_keys.season
               and averages.nba_id = page_keys.nba_id
            join ranks
                on ranks.season = averages.season
               and ranks.nba_id = averages.nba_id
            left join public.players as players
                on players.nba_id = averages.nba_id
            left join player_positions
                on player_positions.position = players.position
            left join public.wowy_season_adjusted_ratings as season_counts
                on season_counts.season = averages.season
               and season_counts.nba_id = averages.nba_id
            where normalized_rating_mode = 'average'

            union all

            select
                ranks.leaderboard_rank,
                adjusted.season,
                adjusted.nba_id,
                players.player_name,
                'NBA'::text as league,
                true as cross_league_level_identified,
                adjusted.team_code,
                adjusted.team_name,
                adjusted.team_codes,
                adjusted.team_names,
                array_to_string(adjusted.team_codes, ' / ') as team_sort_label,
                null::integer as tm_id,
                null::text as position,
                player_positions.filter_position,
                case
                    when players.height between 60 and 96 then players.height
                    else null::double precision
                end as height_inches,
                adjusted.wowy_rapm,
                adjusted.wowy_orapm,
                adjusted.wowy_drapm,
                adjusted.possessions as exposure,
                adjusted.possessions as season_possessions,
                adjusted.first_date,
                adjusted.last_date,
                adjusted.last_date as date,
                adjusted.season_games,
                adjusted.playoff_games,
                adjusted.playoff_possessions,
                adjusted.method_version,
                adjusted.application_model,
                null::integer as career_game_num,
                'season-adjusted'::text as snapshot_context,
                page_keys.page_sort_rank
            from page_keys
            join public.wowy_season_adjusted_ratings as adjusted
                on adjusted.season = page_keys.season
               and adjusted.nba_id = page_keys.nba_id
            join ranks
                on ranks.season = adjusted.season
               and ranks.nba_id = adjusted.nba_id
            left join public.players as players
                on players.nba_id = adjusted.nba_id
            left join player_positions
                on player_positions.position = players.position
            where normalized_rating_mode = 'adjusted'
        ),
        counts as (
            select count(*)::integer as total_count
            from filtered_rows
        )
        select jsonb_build_object(
            'rows',
            coalesce(
                (
                    select jsonb_agg(
                        to_jsonb(page_rows) - 'page_sort_rank'
                        order by page_sort_rank
                    )
                    from page_rows
                ),
                '[]'::jsonb
            ),
            'total_count',
            counts.total_count,
            'has_more',
            p_offset + (select count(*) from page_rows) < counts.total_count,
            'loaded_count',
            (select count(*) from page_rows),
            'activated',
            true
        )
        from counts
    );
end;
$function$;

revoke all on function public.get_wowy_all_time_player_seasons_page_base(
    text,
    integer,
    integer,
    double precision,
    double precision,
    text,
    text,
    text,
    double precision,
    double precision,
    text,
    text
) from public, anon, authenticated;

grant execute on function public.get_wowy_all_time_player_seasons_page_base(
    text,
    integer,
    integer,
    double precision,
    double precision,
    text,
    text,
    text,
    double precision,
    double precision,
    text,
    text
) to service_role;

notify pgrst, 'reload schema';
