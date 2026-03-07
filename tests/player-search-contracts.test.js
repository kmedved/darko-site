import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

test('PlayerSearch keeps the active-player data source and shared presentation layer', async () => {
    const file = path.resolve(process.cwd(), 'src/lib/components/PlayerSearch.svelte');
    const contents = await fs.readFile(file, 'utf8');

    assert.match(contents, /apiActivePlayers/, 'PlayerSearch should still use active-player data');
    assert.match(contents, /PlayerSearchField/, 'PlayerSearch should reuse the shared search field');
});

test('AllPlayerSearch keeps the search API and request sequencer', async () => {
    const file = path.resolve(process.cwd(), 'src/lib/components/AllPlayerSearch.svelte');
    const contents = await fs.readFile(file, 'utf8');

    assert.match(contents, /apiSearchPlayers/, 'AllPlayerSearch should still use the full search API');
    assert.match(contents, /createRequestSequencer/, 'AllPlayerSearch should still guard against stale responses');
    assert.match(contents, /PlayerSearchField/, 'AllPlayerSearch should reuse the shared search field');
});
