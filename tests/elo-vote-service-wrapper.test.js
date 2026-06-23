import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const ELO_SERVICE_FILE = 'src/lib/server/eloService.js';
const ELO_LOCKDOWN_MIGRATION = 'supabase/migrations/20260617_001_restore_service_role_elo_vote_path.sql';

test('public Elo votes use a server-only service-role Supabase client', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), ELO_SERVICE_FILE), 'utf8');

    assert.match(contents, /from '\$env\/dynamic\/private'/);
    assert.match(contents, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(contents, /createClient\(PUBLIC_SUPABASE_URL, key/);
    assert.match(contents, /client\.rpc\('check_elo_rate_limit'/);
    assert.match(contents, /recordVote\(winnerId, loserId, \{ client: serviceClient \}\)/);
    assert.doesNotMatch(contents, /recordVote\(winnerId, loserId\);/);
});

test('forward migration keeps record_elo_vote executable by service_role only', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), ELO_LOCKDOWN_MIGRATION), 'utf8');

    assert.match(contents, /revoke execute on function public\.record_elo_vote\(bigint, bigint, numeric\)[\s\S]*from public, anon, authenticated;/);
    assert.match(contents, /grant execute on function public\.record_elo_vote\(bigint, bigint, numeric\)[\s\S]*to service_role;/);
    assert.match(contents, /alter table if exists public\.elo_rate_limits enable row level security;/);
    assert.match(contents, /revoke all on table public\.elo_rate_limits from public, anon, authenticated;/);
    assert.match(contents, /grant select, insert, update, delete on table public\.elo_rate_limits to service_role;/);
    assert.match(contents, /revoke all on function public\.check_elo_rate_limit\(text, text, timestamptz\)[\s\S]*from public, anon, authenticated;/);
    assert.match(contents, /grant execute on function public\.check_elo_rate_limit\(text, text, timestamptz\) to service_role;/);
    assert.doesNotMatch(contents, /grant execute on function public\.record_elo_vote\(bigint, bigint, numeric\)\s+to anon/i);
    assert.doesNotMatch(contents, /grant execute on function public\.record_elo_vote\(bigint, bigint, numeric\)\s+to authenticated/i);
});
