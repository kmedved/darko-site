import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

test('a player the official injury report rules out of his next game says so', async () => {
    const page = await read('src/routes/player/[nbaId]/+page.svelte');
    assert.match(page, /Number\(playerInfo\.future_game\) === 1 && Number\(playerInfo\.available\) === 0/);
    assert.match(page, /Out for his next game \(official NBA injury report\)/);
    assert.match(page, /projected minutes when he plays/);
    const supabase = await read('src/lib/server/supabase.js');
    assert.match(supabase, /'available',/);
});

test('the about page describes rest-of-season stats and minutes when he plays', async () => {
    const about = await read('src/routes/about/+page.svelte');
    assert.match(about, /What are the projected box-score stats\?/);
    assert.match(about, /rates for the rest of the season/);
    assert.match(about, /minutes a game when he plays\.<\/dd>/);
});
