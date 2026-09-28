import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

test('player pages load comps beside the history, and never fail over them', async () => {
    const load = await read('src/routes/player/[nbaId]/+page.server.js');
    assert.match(load, /getPlayerComps\(parsePlayerRouteId\(params\.nbaId\)\)\.catch\(/);
    assert.match(load, /comps: await comps/);

    const server = await read('src/lib/server/comps.js');
    assert.match(server, /from\('player_comps'\)/);
    // Until the pipeline first publishes the table, players have no comps.
    assert.match(server, /if \(isMissingTable\(error\)\) return \[\];/);
    assert.match(server, /readLocalTable\('player_comps'\)/);
});

test('the player page shows Comps & futures for today only, at #comps', async () => {
    const page = await read('src/routes/player/[nbaId]/+page.svelte');
    assert.match(page, /\{#if comps\.length > 0 && !asOfDate\}/);
    assert.match(page, /id="comps"/);
    assert.match(page, /<CompsFutures \{comps\} history=\{historyRows\}/);
});
