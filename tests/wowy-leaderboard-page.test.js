import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const WOWY_PAGE = 'src/routes/wowy/+page.svelte';
const WOWY_PAGE_SERVER = 'src/routes/wowy/+page.server.js';

async function read(file) {
    return fs.readFile(path.resolve(process.cwd(), file), 'utf8');
}

test('WOWY leaderboard loader fetches current ratings and publication freshness in parallel', async () => {
    const contents = await read(WOWY_PAGE_SERVER);

    assert.match(contents, /getActiveWowyPlayers/);
    assert.match(contents, /getWowyPublication/);
    assert.match(contents, /Promise\.all\(\[\s*getActiveWowyPlayers\(\),\s*getWowyPublication\(\)/s);
    assert.match(contents, /setEdgeCache\(/);
    assert.match(contents, /edgeSMaxAge:\s*300/);
    assert.match(contents, /swr:\s*3600/);
});

test('WOWY leaderboard presents observed current-active ratings and trajectory links', async () => {
    const contents = await read(WOWY_PAGE);

    assert.match(contents, /Latest observed/);
    assert.match(contents, /does not use DARKO projection rows/);
    assert.match(contents, /Current active players/);
    assert.match(contents, /wowy_rapm/);
    assert.match(contents, /wowy_orapm/);
    assert.match(contents, /wowy_drapm/);
    assert.match(contents, /exposure/);
    assert.match(contents, /career_game_num/);
    assert.match(contents, /publication\.data_through/);
    assert.match(contents, /\/trajectories\?ids=\$\{encodeURIComponent\(player\.nba_id\)\}&metric=wowy_rapm/);
    assert.doesNotMatch(contents, /start of (?:the )?season/i);
});

test('WOWY leaderboard supports sorting, filtering, complete CSV export, and mobile table access', async () => {
    const contents = await read(WOWY_PAGE);
    const touchStart = contents.indexOf('/* Touch/mobile scroll mode */');
    const touchEnd = contents.indexOf('/* End touch/mobile scroll mode */');

    assert.match(contents, /getNextSortState/);
    assert.match(contents, /getSortedRows/);
    assert.match(contents, /aria-sort=\{sortColumn === column\.key/);
    assert.match(contents, /setTeamFilter/);
    assert.match(contents, /setSearchQuery/);
    assert.match(contents, /sortedPlayers\.map\(\(player, index\) => \(\{ \.\.\.player, rank: index \+ 1 \}\)\)/);
    assert.match(contents, /wowyLeaderboardCsvColumns/);
    assert.ok(touchStart >= 0 && touchEnd > touchStart, 'page should define a touch-table mode');

    const touchBlock = contents.slice(touchStart, touchEnd);
    assert.match(touchBlock, /hover:\s*none/);
    assert.match(touchBlock, /pointer:\s*coarse/);
    assert.match(touchBlock, /any-hover:\s*none/);
    assert.match(touchBlock, /any-pointer:\s*coarse/);
    assert.match(touchBlock, /max-width:\s*1024px/);
    assert.match(touchBlock, /\.wowy-table-shell\s*\{[\s\S]*overflow-x:\s*auto;/);
    assert.match(touchBlock, /\.wowy-table\s*\{[\s\S]*width:\s*max-content;[\s\S]*min-width:\s*900px;/);
    assert.match(touchBlock, /\.wowy-table th\s*\{[\s\S]*position:\s*static;/);
    assert.match(contents, /\.wowy-table th\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*var\(--nav-sticky-offset\);/);
    assert.match(contents, /\.wowy-table-shell\s*\{[\s\S]*overflow:\s*visible;/);
    assert.match(contents, /@media \(max-width: 840px\)\s*\{[\s\S]*?\.wowy-table-shell\s*\{[\s\S]*?overflow-x:\s*auto;/);
    assert.match(contents, /@media \(max-width: 840px\)\s*\{[\s\S]*?\.wowy-table th\s*\{[\s\S]*?position:\s*static;/);
});
