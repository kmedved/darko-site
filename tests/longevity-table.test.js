import test from 'node:test';
import assert from 'node:assert/strict';

import {
    filterLongevityRows,
    paginateRows,
    resolveActiveLongevityPlayer
} from '../src/lib/utils/longevityTable.js';

const sampleRows = [
    {
        nba_id: 1,
        player_name: 'Jayson Tatum',
        rookie_season: 2018,
        career_games: 759,
        age: 27.2,
        est_retirement_age: 38.1,
        years_remaining: 10.9,
        p1: 100.0,
        p10: 75.1,
        p12: 58.4
    },
    {
        nba_id: 2,
        player_name: 'Luka Doncic',
        rookie_season: 2019,
        career_games: 652,
        age: 26.9,
        est_retirement_age: 36.3,
        years_remaining: 9.4,
        p1: 100.0,
        p10: 59.7,
        p12: 38.9
    },
    {
        nba_id: 3,
        player_name: 'LeBron James',
        rookie_season: 2004,
        career_games: 1510,
        age: 41.2,
        est_retirement_age: 43.1,
        years_remaining: 1.9,
        p1: 91.0,
        p10: 4.5,
        p12: 1.0
    }
];

test('filterLongevityRows applies global search query', () => {
    const filtered = filterLongevityRows(sampleRows, 'luka', {});

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].player_name, 'Luka Doncic');
});

test('filterLongevityRows applies case-insensitive per-column filters against display values', () => {
    const filtered = filterLongevityRows(sampleRows, '', {
        player_name: 'tatum',
        p10: '75.1%'
    });

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].nba_id, 1);
});

test('paginateRows returns the expected slice for a page', () => {
    const paged = paginateRows(sampleRows, 2, 2);

    assert.equal(paged.length, 1);
    assert.equal(paged[0].nba_id, 3);
});

test('resolveActiveLongevityPlayer falls back to first visible row when active player is filtered out', () => {
    const visibleRows = sampleRows.slice(1);

    const fallback = resolveActiveLongevityPlayer(visibleRows, 1);
    const stable = resolveActiveLongevityPlayer(visibleRows, 2);
    const empty = resolveActiveLongevityPlayer([], 2);

    assert.equal(fallback.nba_id, 2);
    assert.equal(stable.nba_id, 2);
    assert.equal(empty, null);
});
