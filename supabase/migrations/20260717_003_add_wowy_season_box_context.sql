-- Add the all-game minutes and reconstructed BPM context used by the WOWY
-- all-time leaderboard. These are descriptive comparison fields, not inputs
-- to the leaderboard rank or its possession filter.

create table if not exists public.wowy_season_box_context (
    season integer not null,
    nba_id bigint not null,
    minutes double precision not null,
    bpm double precision not null,
    constraint wowy_season_box_context_pkey primary key (season, nba_id),
    constraint wowy_season_box_context_season_check check (season >= 1980),
    constraint wowy_season_box_context_nba_id_check check (nba_id > 0),
    constraint wowy_season_box_context_minutes_check check (
        minutes > 0
        and minutes not in (
            'Infinity'::double precision,
            '-Infinity'::double precision,
            'NaN'::double precision
        )
    ),
    constraint wowy_season_box_context_bpm_check check (
        bpm not in (
            'Infinity'::double precision,
            '-Infinity'::double precision,
            'NaN'::double precision
        )
    )
);

alter table public.wowy_season_box_context enable row level security;

drop policy if exists wowy_season_box_context_public_read
    on public.wowy_season_box_context;
create policy wowy_season_box_context_public_read
    on public.wowy_season_box_context
    for select
    to anon, authenticated
    using (true);

revoke all on table public.wowy_season_box_context
    from public, anon, authenticated;
grant select on table public.wowy_season_box_context
    to anon, authenticated, service_role;

-- Preserve the complete filtered/paginated implementation from migration 002
-- as a private base function. The public wrapper enriches only the selected
-- page, so the join remains bounded to at most 100 context rows.
do $block$
begin
    if to_regprocedure(
        'public.get_wowy_all_time_player_seasons_page_base(text,integer,integer,double precision,double precision,text,text,text,double precision,double precision,text,text)'
    ) is null then
        alter function public.get_wowy_all_time_player_seasons_page(
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
        ) rename to get_wowy_all_time_player_seasons_page_base;
    end if;
end;
$block$;

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
security definer
set search_path = ''
as $function$
declare
    payload jsonb;
    enriched_rows jsonb;
begin
    payload := public.get_wowy_all_time_player_seasons_page_base(
        p_rating_mode,
        p_limit,
        p_offset,
        p_min_possessions,
        p_max_possessions,
        p_search,
        p_team,
        p_position,
        p_min_height,
        p_max_height,
        p_sort_column,
        p_sort_direction
    );

    if coalesce(jsonb_array_length(payload -> 'rows'), 0) = 0 then
        return payload;
    end if;

    select coalesce(
        jsonb_agg(
            page_row.row_value
            || jsonb_build_object(
                'minutes', box_context.minutes,
                'bpm', box_context.bpm
            )
            order by page_row.ordinality
        ),
        '[]'::jsonb
    )
    into enriched_rows
    from jsonb_array_elements(payload -> 'rows')
        with ordinality as page_row(row_value, ordinality)
    left join public.wowy_season_box_context as box_context
        on box_context.season = (page_row.row_value ->> 'season')::integer
       and box_context.nba_id = (page_row.row_value ->> 'nba_id')::bigint;

    return jsonb_set(payload, '{rows}', enriched_rows, false);
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
