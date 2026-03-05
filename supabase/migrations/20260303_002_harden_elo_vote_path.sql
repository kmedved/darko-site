-- P0: enforce Elo writes through a transactional RPC and tighten function safety.

alter table if exists public.elo_ratings
    enable row level security;
alter table if exists public.elo_votes
    enable row level security;

-- Replace permissive policies with read-only access for public clients.
drop policy if exists anon_update_elo on public.elo_ratings;
drop policy if exists anon_upsert_elo on public.elo_ratings;
drop policy if exists anon_insert_votes on public.elo_votes;

drop policy if exists anon_read_elo on public.elo_ratings;
drop policy if exists anon_read_votes on public.elo_votes;

create policy anon_read_elo
    on public.elo_ratings
    for select
    to anon, authenticated
    using (true);

create policy anon_read_votes
    on public.elo_votes
    for select
    to anon, authenticated
    using (true);

revoke all
    on table public.elo_ratings
    from anon, authenticated;
revoke all
    on table public.elo_votes
    from anon, authenticated;

grant select
    on table public.elo_ratings
    to anon, authenticated;
grant select
    on table public.elo_votes
    to anon, authenticated;

-- Fix search_path mutability and ensure explicit schema references.
create or replace function public.get_random_pair()
returns table(
    nba_id bigint,
    player_name text,
    height double precision,
    weight double precision,
    dob text,
    draft_year double precision,
    draft_slot double precision,
    "position" text,
    country text,
    current_team text,
    active_roster smallint,
    season real,
    rookie_season double precision,
    elo_rating double precision,
    total_comparisons integer,
    wins integer,
    losses integer
)
language sql
stable
set search_path = pg_catalog, public
as $$
    select
        p.nba_id,
        p.player_name,
        p.height,
        p.weight,
        p.dob,
        p.draft_year,
        p.draft_slot,
        p.position as "position",
        p.country,
        p.current_team,
        p.active_roster,
        p.season,
        p.rookie_season,
        coalesce(e.elo_rating, 1500.0) as elo_rating,
        coalesce(e.total_comparisons, 0) as total_comparisons,
        coalesce(e.wins, 0) as wins,
        coalesce(e.losses, 0) as losses
    from public.players as p
    left join public.elo_ratings as e
        on e.nba_id = p.nba_id
    order by random()
    limit 2;
$$;

-- Single transaction, row locks, and audit insert in one RPC.
create or replace function public.record_elo_vote(
    p_winner_id bigint,
    p_loser_id bigint,
    p_k_factor numeric default 32
)
returns table(
    winner_id bigint,
    loser_id bigint,
    winner_elo_before numeric,
    loser_elo_before numeric,
    winner_elo_after numeric,
    loser_elo_after numeric,
    elo_delta numeric
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    v_lo_id bigint;
    v_hi_id bigint;
    v_lo_rating numeric;
    v_hi_rating numeric;
    v_winner_before numeric;
    v_loser_before numeric;
    v_expected numeric;
    v_delta numeric;
    v_winner_after numeric;
    v_loser_after numeric;
begin
    if p_winner_id is null or p_loser_id is null then
        raise exception 'winner_id and loser_id are required';
    end if;

    if p_winner_id <= 0 or p_loser_id <= 0 then
        raise exception 'winner_id and loser_id must be positive';
    end if;

    if p_winner_id = p_loser_id then
        raise exception 'winner_id and loser_id must differ';
    end if;

    if not exists (
        select 1
        from public.players
        where nba_id = p_winner_id
    ) then
        raise exception 'winner_id % does not exist in players', p_winner_id;
    end if;

    if not exists (
        select 1
        from public.players
        where nba_id = p_loser_id
    ) then
        raise exception 'loser_id % does not exist in players', p_loser_id;
    end if;

    insert into public.elo_ratings as er (
        nba_id,
        elo_rating,
        total_comparisons,
        wins,
        losses,
        updated_at
    ) values
        (p_winner_id, 1500, 0, 0, 0, now()),
        (p_loser_id, 1500, 0, 0, 0, now())
    on conflict (nba_id) do nothing;

    -- Lock rows in deterministic order to avoid deadlocks.
    v_lo_id := least(p_winner_id, p_loser_id);
    v_hi_id := greatest(p_winner_id, p_loser_id);

    select elo_rating
    into v_lo_rating
    from public.elo_ratings
    where nba_id = v_lo_id
    for update;

    select elo_rating
    into v_hi_rating
    from public.elo_ratings
    where nba_id = v_hi_id
    for update;

    if v_lo_id = p_winner_id then
        v_winner_before := v_lo_rating;
        v_loser_before := v_hi_rating;
    else
        v_winner_before := v_hi_rating;
        v_loser_before := v_lo_rating;
    end if;

    v_expected := 1.0 / (1.0 + power(10.0, (v_loser_before - v_winner_before) / 400.0));
    v_delta := p_k_factor * (1.0 - v_expected);
    v_winner_after := v_winner_before + v_delta;
    v_loser_after := v_loser_before - v_delta;

    update public.elo_ratings
    set
        elo_rating = v_winner_after,
        total_comparisons = total_comparisons + 1,
        wins = wins + 1,
        updated_at = now()
    where nba_id = p_winner_id;

    update public.elo_ratings
    set
        elo_rating = v_loser_after,
        total_comparisons = total_comparisons + 1,
        losses = losses + 1,
        updated_at = now()
    where nba_id = p_loser_id;

    insert into public.elo_votes (
        winner_id,
        loser_id,
        winner_elo_before,
        loser_elo_before,
        winner_elo_after,
        loser_elo_after,
        elo_delta
    ) values (
        p_winner_id,
        p_loser_id,
        v_winner_before,
        v_loser_before,
        v_winner_after,
        v_loser_after,
        v_delta
    );

    return query
    select
        p_winner_id,
        p_loser_id,
        v_winner_before,
        v_loser_before,
        v_winner_after,
        v_loser_after,
        v_delta;
end;
$$;

revoke all on function public.record_elo_vote(bigint, bigint, numeric) from public;
grant execute on function public.record_elo_vote(bigint, bigint, numeric) to anon, authenticated, service_role;

revoke all on function public.get_random_pair() from public;
grant execute on function public.get_random_pair() to anon, authenticated, service_role;
