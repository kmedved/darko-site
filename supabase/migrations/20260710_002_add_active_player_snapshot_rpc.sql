-- Return one latest current-season row per active player in a single database round trip.

create index if not exists idx_ratings_active_latest
    on public.player_ratings (season desc, active_roster, nba_id, date desc);

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
