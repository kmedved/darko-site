-- P0: lock down players dimension to read-only for public clients.

alter table if exists public.players
    enable row level security;

-- Keep policy name stable and idempotent.
drop policy if exists players_public_read on public.players;
drop policy if exists allow_public_read on public.players;

create policy players_public_read
    on public.players
    for select
    to anon, authenticated
    using (true);

-- Anonymous and authenticated clients should have read-only access.
revoke all
    on table public.players
    from anon, authenticated;

grant select
    on table public.players
    to anon, authenticated;
