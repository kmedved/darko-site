-- Re-grant anon/authenticated execute on record_elo_vote so votes work
-- without the service_role key. This reverses the restriction from
-- 20260305_001_secure_elo_vote_and_rate_limits.sql.

grant execute on function public.record_elo_vote(bigint, bigint, numeric) to anon;
grant execute on function public.record_elo_vote(bigint, bigint, numeric) to authenticated;
