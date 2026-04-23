import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const LINEUPS_PAGE = 'src/routes/lineups/+page.svelte';
const SUPABASE_SERVER = 'src/lib/server/supabase.js';

function read(file) {
    return fs.readFile(path.resolve(process.cwd(), file), 'utf8');
}

test('lineups page keeps controls visible when the selected variant has no rows', async () => {
    const contents = await read(LINEUPS_PAGE);

    assert.match(
        contents,
        /hasAnyVariantLineups\s*=\s*\$derived\(/,
        'lineups page should distinguish all-data-empty from selected-variant-empty'
    );
    assert.match(
        contents,
        /\{#if\s+!hasAnyVariantLineups\}/,
        'lineups page should only show the full-page empty state when every variant is empty'
    );
    assert.doesNotMatch(
        contents,
        /\{#if\s+selectedLineups\.length\s*===\s*0\}/,
        'selected empty PI/NPI buckets should leave the variant controls available'
    );
});

test('lineup ratings cache separates possession thresholds', async () => {
    const contents = await read(SUPABASE_SERVER);

    assert.match(
        contents,
        /cacheKey\('lineupRatings',\s*`size-\$\{lineupSize\}:min-\$\{minPoss\}`\)/,
        'lineup ratings cache key should include minPoss so 2/3/4/5-man cutoffs cannot collide'
    );
});
