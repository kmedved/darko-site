-- Decorate name-search matches without loading the full active-player snapshot.

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

notify pgrst, 'reload schema';
