-- Expose immutable historical leaderboard snapshots without reading every player-game row.
-- A historical snapshot is each team's opening-game roster for the selected season.

create index if not exists idx_ratings_leaderboard_team_opener
    on public.player_ratings (season, team_name, date asc);

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

revoke all on function public.get_leaderboard_seasons() from public;
revoke all on function public.get_season_start_player_ratings(integer) from public;

grant execute on function public.get_leaderboard_seasons()
    to anon, authenticated, service_role;
grant execute on function public.get_season_start_player_ratings(integer)
    to anon, authenticated, service_role;

notify pgrst, 'reload schema';
