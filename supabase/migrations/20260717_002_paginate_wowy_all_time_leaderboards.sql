-- Replace the fixed top-100 all-time WOWY response with a filterable page
-- contract. The existing zero-argument RPCs remain available during rolling
-- deployments; the site uses this function once the matching frontend lands.
--
-- Average rows retain their published average model exposure. Their separate
-- `season_possessions` field comes from the Season-Adjusted publication for
-- the same (season, nba_id), which is the site's certified source of actual
-- regular-season plus playoff possessions. Average-only rows remain visible
-- when no possession bound is active.

create index if not exists idx_wowy_season_player_averages_all_time_rating
    on public.wowy_season_player_averages (wowy_rapm desc, season desc, nba_id);

create index if not exists idx_wowy_season_adjusted_ratings_all_time_rating
    on public.wowy_season_adjusted_ratings (wowy_rapm desc, season desc, nba_id);

create index if not exists idx_wowy_season_adjusted_ratings_possessions
    on public.wowy_season_adjusted_ratings (possessions, season, nba_id);

create or replace function public.get_wowy_all_time_player_seasons_page(
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
        with source_rows as (
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
                array_to_string(averages.team_codes, ' / ') as team_sort_label,
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
                'season-average'::text as snapshot_context
            from public.wowy_season_player_averages as averages
            left join public.players as players
                on players.nba_id = averages.nba_id
            left join public.wowy_season_adjusted_ratings as season_counts
                on season_counts.season = averages.season
               and season_counts.nba_id = averages.nba_id
            where normalized_rating_mode = 'average'

            union all

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
                array_to_string(adjusted.team_codes, ' / ') as team_sort_label,
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
                'season-adjusted'::text as snapshot_context
            from public.wowy_season_adjusted_ratings as adjusted
            left join public.players as players
                on players.nba_id = adjusted.nba_id
            where normalized_rating_mode = 'adjusted'
        ),
        filtered_rows as (
            select *
            from source_rows
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
                            filter_position,
                            season::text
                        )
                    ) like '%' || normalized_search || '%'
                )
        ),
        ordered_rows as (
            select
                filtered_rows.*,
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
                        leaderboard_rank asc
                ) as page_sort_rank
            from filtered_rows
        ),
        page_rows as (
            select *
            from ordered_rows
            where page_sort_rank > p_offset
              and page_sort_rank <= p_offset + p_limit
            order by page_sort_rank
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

revoke all on function public.get_wowy_all_time_player_seasons_page(
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
) from public;

grant execute on function public.get_wowy_all_time_player_seasons_page(
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
) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
