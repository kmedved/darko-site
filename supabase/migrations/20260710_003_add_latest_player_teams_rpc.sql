-- Resolve the latest valid team for a group of players in one database round trip.

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
