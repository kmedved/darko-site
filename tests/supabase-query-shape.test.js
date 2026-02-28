import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const SUPABASE_FILE = 'src/lib/server/supabase.js';
const PLAYERS_SELECT_STAR = /from\('players'\)\s*\.select\('\*'\)/g;


test('supabase players table queries should not use select(*)', async () => {
    const absolutePath = path.resolve(process.cwd(), SUPABASE_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');
    const matches = contents.match(PLAYERS_SELECT_STAR);

    assert.equal(matches, null, 'players queries should project explicit columns');
});
