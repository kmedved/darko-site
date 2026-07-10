-- Return one latest observed WOWY row per player on the current DARKO active roster.
-- Team and position deliberately come from the current player_ratings snapshot rather
-- than the historical game that produced the WOWY rating.
-- The existing (nba_id, date) WOWY index makes each lateral latest-row lookup bounded.

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

notify pgrst, 'reload schema';
