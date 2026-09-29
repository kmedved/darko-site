import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

test('player pages load comps beside the history, and never fail over them', async () => {
    const load = await read('src/routes/player/[nbaId]/+page.server.js');
    // Comps, echoes and seasons are side panels: a failure leaves them empty, not the page.
    assert.match(load, /const sidePanel = \(label, promise\) =>\s*promise\.catch\(/);
    assert.match(load, /const comps = sidePanel\('comps', getPlayerComps\(nbaId\)\);/);
    assert.match(load, /sidePanel\('seasons', getPlayerSeasons\(nbaId\)/);
    assert.match(load, /sidePanel\(\s*'echoes',/);
    assert.match(load, /comps: await comps,\s*seasons: await seasons,\s*echoes: await echoes/);

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

test('the comps count seasons of 10+ games, which is all a missing DPM says', async () => {
    const chart = await read('src/lib/components/CompsFutures.svelte');
    assert.match(chart, /text-anchor="end">10\+ games<\/text>/);
    assert.match(chart, /point\.dpm === null \? 'under 10 games'/);
    assert.doesNotMatch(chart, /In NBA|out of the league/);
});
