-- Return a WOWY season-start snapshot for a selected NBA season.
-- Each row uses the selected season's opening roster and the latest observed
-- WOWY value strictly before that team's opening game. WOWY values are
-- postgame observations, so the strict cutoff prevents opening-night leakage.

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
        select distinct pr.season::integer as season
        from public.player_ratings as pr
        where pr.season is not null
          and exists (
              select 1
              from public.wowy_ratings as wr
              where wr.season = pr.season
          )
    ) as seasons;
$function$;

create or replace function public.get_wowy_season_player_ratings(p_season integer)
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
    ), opening_roster as (
        select distinct on (pr.nba_id)
            pr.nba_id,
            pr.team_name,
            pr.tm_id,
            pr.position,
            opener.opening_date
        from public.player_ratings as pr
        inner join team_openers as opener
            on pr.team_name = opener.team_name
           and pr.date = opener.opening_date
        where pr.season = p_season
        order by pr.nba_id, pr.date asc
    ), season_rows as (
        select
            roster.nba_id,
            players.player_name,
            roster.team_name,
            roster.tm_id,
            coalesce(roster.position, players.position) as position,
            wowy.wowy_rapm,
            wowy.wowy_orapm,
            wowy.wowy_drapm,
            wowy.exposure,
            wowy.date,
            wowy.career_game_num
        from opening_roster as roster
        left join public.players as players
            on players.nba_id = roster.nba_id
        left join lateral (
            select
                wr.wowy_rapm,
                wr.wowy_orapm,
                wr.wowy_drapm,
                wr.exposure,
                wr.date,
                wr.career_game_num
            from public.wowy_ratings as wr
            where wr.nba_id = roster.nba_id
              and wr.date < roster.opening_date
            order by wr.date desc
            limit 1
        ) as wowy on true
    )
    select coalesce(
        jsonb_agg(
            to_jsonb(season_rows)
            order by season_rows.wowy_rapm desc nulls last, season_rows.player_name
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
