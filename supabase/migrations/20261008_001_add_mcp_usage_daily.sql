-- Daily usage counters for the assistant endpoint (/mcp). One row per UTC day, tool, coarse
-- client family and outcome; no identifiers, request contents or conversation text.
-- Written only by the site through service_role (src/routes/mcp/+server.ts), like the Elo vote
-- path; nobody else can read or write it. Depends on no table the nba_darko publisher replaces.

create table if not exists public.mcp_usage_daily (
    day date not null,
    tool text not null,
    client text not null,
    ok boolean not null,
    calls integer not null default 0,
    total_ms bigint not null default 0,
    max_ms integer not null default 0,
    players bigint not null default 0,
    primary key (day, tool, client, ok)
);

alter table public.mcp_usage_daily enable row level security;

revoke all on table public.mcp_usage_daily from public, anon, authenticated;
grant select, insert, update on table public.mcp_usage_daily to service_role;

create or replace function public.record_mcp_usage(
    p_tool text,
    p_client text,
    p_ok boolean,
    p_duration_ms integer,
    p_players integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
    if coalesce(length(trim(p_tool)), 0) = 0 then
        raise exception 'tool is required';
    end if;

    insert into public.mcp_usage_daily as usage (day, tool, client, ok, calls, total_ms, max_ms, players)
    values (
        (now() at time zone 'utc')::date,
        left(p_tool, 64),
        left(coalesce(nullif(trim(p_client), ''), 'other'), 32),
        coalesce(p_ok, false),
        1,
        greatest(coalesce(p_duration_ms, 0), 0),
        greatest(coalesce(p_duration_ms, 0), 0),
        greatest(coalesce(p_players, 0), 0)
    )
    on conflict (day, tool, client, ok) do update
    set calls = usage.calls + 1,
        total_ms = usage.total_ms + excluded.total_ms,
        max_ms = greatest(usage.max_ms, excluded.max_ms),
        players = usage.players + excluded.players;
end;
$function$;

revoke execute on function public.record_mcp_usage(text, text, boolean, integer, integer)
    from public, anon, authenticated;
grant execute on function public.record_mcp_usage(text, text, boolean, integer, integer)
    to service_role;
