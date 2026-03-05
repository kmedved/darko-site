-- Move Elo vote writes behind service_role and add persistent rate limiting.

revoke execute on function public.record_elo_vote(bigint, bigint, numeric) from anon;
revoke execute on function public.record_elo_vote(bigint, bigint, numeric) from authenticated;
grant execute on function public.record_elo_vote(bigint, bigint, numeric) to service_role;

create table if not exists public.elo_rate_limits (
    subject_hash text not null,
    route text not null,
    window_start timestamptz not null,
    count integer not null default 0,
    updated_at timestamptz not null default now(),
    primary key (subject_hash, route, window_start)
);

alter table public.elo_rate_limits enable row level security;

revoke all on table public.elo_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.elo_rate_limits to service_role;

create or replace function public.check_elo_rate_limit(
    p_subject_hash text,
    p_route text,
    p_window_start timestamptz
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_count integer;
begin
    if coalesce(length(trim(p_subject_hash)), 0) = 0 then
        raise exception 'subject_hash is required';
    end if;

    if coalesce(length(trim(p_route)), 0) = 0 then
        raise exception 'route is required';
    end if;

    if p_window_start is null then
        raise exception 'window_start is required';
    end if;

    insert into public.elo_rate_limits (
        subject_hash,
        route,
        window_start,
        count,
        updated_at
    ) values (
        p_subject_hash,
        p_route,
        p_window_start,
        1,
        now()
    )
    on conflict (subject_hash, route, window_start)
    do update
    set
        count = public.elo_rate_limits.count + 1,
        updated_at = now()
    returning count into v_count;

    return v_count;
end;
$$;

revoke all on function public.check_elo_rate_limit(text, text, timestamptz) from public;
grant execute on function public.check_elo_rate_limit(text, text, timestamptz) to service_role;
