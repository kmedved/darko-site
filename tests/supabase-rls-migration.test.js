import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migration = [
    '20260529_001_lock_public_read_tables.sql',
    '20260616_001_lock_public_fact_tables.sql',
    '20260710_001_add_wowy_ratings.sql'
]
    .map((filename) =>
        readFileSync(join(__dirname, '..', 'supabase', 'migrations', filename), 'utf8')
    )
    .join('\n');

const publicReadTables = [
    'players',
    'season_sim',
    'win_distribution',
    'player_ratings',
    'lineup_ratings',
    'wowy_ratings',
    'wowy_publication'
];

test('RLS migration enables row level security for advisor-flagged public tables', () => {
    for (const table of publicReadTables) {
        assert.match(
            migration,
            new RegExp(`alter table if exists public\\.${table}\\s+enable row level security;`)
        );
    }
});

test('RLS migration preserves anon/authenticated read access only', () => {
    for (const table of publicReadTables) {
        assert.match(
            migration,
            new RegExp(`create policy [a-z_]+\\s+on public\\.${table}\\s+for select\\s+to anon, authenticated\\s+using \\(true\\);`)
        );
    }

    assert.match(
        migration,
        /revoke all\s+on table public\.players, public\.season_sim, public\.win_distribution\s+from public, anon, authenticated;/
    );
    assert.match(
        migration,
        /revoke all\s+on table public\.player_ratings, public\.lineup_ratings\s+from public, anon, authenticated;/
    );
    assert.match(
        migration,
        /grant select\s+on table public\.players, public\.season_sim, public\.win_distribution\s+to anon, authenticated;/
    );
    assert.match(
        migration,
        /grant select\s+on table public\.player_ratings, public\.lineup_ratings\s+to anon, authenticated;/
    );
    assert.match(
        migration,
        /grant select\s+on table public\.wowy_ratings, public\.wowy_publication\s+to anon, authenticated;/
    );
    for (const role of ['anon', 'authenticated']) {
        assert.doesNotMatch(
            migration,
            new RegExp(`for\\s+(insert|update|delete|all)\\s+to\\s+[^;]*\\b${role}\\b`, 'i')
        );
    }
});
