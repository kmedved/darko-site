import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { compsSummary, contractTiles, dpmRank, profileSections } from '../src/lib/utils/playerProfile.js';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

test("a current player's rank on today's board", () => {
    const board = [
        { nba_id: 2, dpm: 6.4 },
        { nba_id: 1, dpm: '6.8' },
        { nba_id: 3, dpm: null },
        { nba_id: 4, dpm: 5.9 }
    ];
    assert.deepEqual(dpmRank(1, board), { rank: 1, of: 3 });
    assert.deepEqual(dpmRank('4', board), { rank: 3, of: 3 });
    // Not on the board, or no rating: no rank.
    assert.equal(dpmRank(3, board), null);
    assert.equal(dpmRank(9, board), null);
});

test('contract tiles: money, WARP in season only, and the calibrated longevity figures', () => {
    const info = {
        sal_market_fixed: 101_400_179.9,
        actual_salary: 55_224_526,
        surplus_value: 46_175_653.9,
        warp: 15.78,
        projected_years_remaining: 8.1,
        projected_years_remaining_cal: 9.04,
        x_retirement_age: 39.9,
        x_retirement_age_cal: 40.41
    };
    const tiles = contractTiles(info);
    assert.deepEqual(tiles.map((tile) => [tile.label, tile.value]), [
        ['Fair value', '$101.4M'],
        ['Salary', '$55.2M'],
        ['Surplus', '+$46.2M'],
        ['WARP', '15.8'],
        ['Seasons left', '9.0'],
        ['Retires at', '40.4']
    ]);
    assert.equal(tiles.find((tile) => tile.key === 'surplus').tone, 'up');
    assert.equal(contractTiles({ surplus_value: -2_300_000 })[0].tone, 'down');

    // Between seasons the placeholder row's WARP is left out; missing figures drop their tiles.
    assert.ok(!contractTiles(info, { inSeason: false }).some((tile) => tile.key === 'warp'));
    assert.deepEqual(contractTiles({ projected_years_remaining: 3.46 }).map((tile) => tile.value), ['3.5']);
    assert.deepEqual(contractTiles(null), []);
});

test('the line over Comps & futures: the latest season against its age, and the closest comp', () => {
    const seasons = [
        { season: 2026, label: '2025-26', dpm: 7.36, age: 31, ageRank: 4, ageCount: 616, inProgress: false },
        { season: 2025, label: '2024-25', dpm: 6.59, age: 30, ageRank: 9, ageCount: 697, inProgress: false }
    ];
    const comps = [{ comp_id: 2544, comp_name: 'LeBron James', comp_season: 2015 }];
    assert.deepEqual(compsSummary(seasons, comps), {
        dpm: '+7.4',
        age: 31,
        season: '2025-26',
        inProgress: false,
        rank: '4th',
        count: '616',
        closest: { id: 2544, name: 'LeBron James', season: '2014-15' }
    });
    // A season under 20 games has no age rank, so no line.
    assert.equal(compsSummary([{ ...seasons[0], ageRank: null }], comps), null);
    assert.equal(compsSummary([], comps), null);
    assert.equal(compsSummary(seasons, []).closest, null);
});

test('the jump menu lists only the sections a page shows, in page order', () => {
    assert.deepEqual(
        profileSections({ seismograph: true, echoes: true, career: true, seasons: true, percentiles: true }).map(
            (section) => section.id
        ),
        ['seismograph', 'echoes', 'career', 'seasons', 'percentiles']
    );
    assert.deepEqual(profileSections({}), []);
});

test('the player page wires the jump menu, rank, Lab link, contract panel and comps line', async () => {
    const [page, server] = await Promise.all([
        read('src/routes/player/[nbaId]/+page.svelte'),
        read('src/routes/player/[nbaId]/+page.server.js')
    ]);
    assert.match(page, /\{#each sections as section \(section\.id\)\}\s*<a href="#\{section\.id\}">/);
    // Every section the menu can name has that id on the page.
    for (const id of ['seismograph', 'comps', 'echoes', 'career', 'contract', 'seasons', 'percentiles', 'box-score']) {
        assert.match(page, new RegExp(`id="${id}"`), id);
    }
    // Today's figures: current players only, and not in the Time Machine.
    assert.match(page, /isCurrentPlayer && !asOfDate \? contractTiles\(playerInfo, \{ inSeason: inProgressSeason !== null \}\) : \[\]/);
    assert.match(page, /const showLongevity = \$derived\(hasLongevityData && isCurrentPlayer && !asOfDate\);/);
    assert.match(page, /data\.dpmRank && !asOfDate \? `#\$\{data\.dpmRank\.rank\} of \$\{data\.dpmRank\.of\}`/);
    assert.match(page, /<a href="\/lab\?a=\{labTeam\}" class="btn compare-link">Open \{labTeam\} in the Roster Lab<\/a>/);
    assert.match(page, /const compsLine = \$derived\(asOfDate \? null : compsSummary\(seasonsTable, comps\)\);/);
    assert.match(server, /dpmRank: await rank/);
});
