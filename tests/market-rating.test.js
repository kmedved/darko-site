import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { describeMarket, latestMarketAsOf, marketRating } from '../src/lib/utils/marketRating.js';
import { COLUMN_SETS, leaderboardTableColumns } from '../src/lib/utils/leaderboardColumns.js';
import { leaderboardCsvColumns } from '../src/lib/utils/csvPresets.js';
import { projectPlayers } from '../src/lib/server/playerViews.js';

test('a row without a market rating has none; one with it carries the playoff value and fit date', () => {
    assert.equal(marketRating({ market_rating: null, market_playoff_rating: 7 }), null);
    assert.equal(marketRating({}), null);
    assert.deepEqual(
        marketRating({ market_rating: 6.4, market_playoff_rating: null, market_as_of: '2026-10-26' }),
        { regular: 6.4, playoff: null, asOf: '2026-10-26' }
    );
    assert.equal(latestMarketAsOf([
        { market_rating: 1, market_as_of: '2026-10-26' },
        { market_rating: 2, market_as_of: '2026-10-27T00:00:00' },
        { market_rating: null, market_as_of: '2026-10-28' }
    ]), '2026-10-27');
    assert.equal(latestMarketAsOf([{ market_rating: null }]), null);
});

test('the market hint says it is experimental and, when known, which day its fit is from', () => {
    assert.equal(
        describeMarket('2026-10-26'),
        'Player rating implied by closing betting spreads (points per 100 possessions). Experimental; as of Oct 26, 2026.'
    );
    assert.equal(
        describeMarket(null),
        'Player rating implied by closing betting spreads (points per 100 possessions). Experimental.'
    );
    assert.match(describeMarket('2026-10-26', 'market_playoff_rating'), /playoff adjustment .*Experimental; as of Oct 26, 2026\.$/);
});

test('the leaderboard shows Market last in Impact, ships its fit date, and exports both', () => {
    const keys = leaderboardTableColumns().map((column) => column.key);
    assert.equal(keys.indexOf('on_off_dpm') + 1, keys.indexOf('market_rating'));
    const market = leaderboardTableColumns().find((column) => column.key === 'market_rating');
    assert.equal(market.label, 'Market');
    assert.equal(market.group, 'impact');
    assert.ok(COLUMN_SETS.find((set) => set.key === 'impact').columns.includes('market_rating'));

    const [row] = projectPlayers([{ nba_id: 1, market_rating: 6.1, market_as_of: '2026-10-26', market_playoff_rating: 7 }], 'leaderboard');
    assert.equal(row.market_rating, 6.1);
    assert.equal(row.market_as_of, '2026-10-26');
    assert.equal(projectPlayers([{ nba_id: 2 }], 'leaderboard')[0].market_rating, null, 'no rating reads as null');

    const accessors = leaderboardCsvColumns.map((column) => column.accessor);
    assert.equal(accessors.indexOf('on_off_dpm') + 1, accessors.indexOf('market_rating'));
    assert.ok(accessors.includes('market_as_of'));
});

test('the direct reads name the market columns and ask again without them until the table has them', async () => {
    const source = await readFile('src/lib/server/supabase.js', 'utf8');
    const ratingColumns = source.match(/const RATING_COLUMNS = \[([\s\S]*?)\]\.join/)[1];
    for (const column of ['market_rating', 'market_playoff_rating', 'market_as_of']) {
        assert.match(ratingColumns, new RegExp(`'${column}'`));
    }
    const asOfColumns = source.match(/const PLAYERS_AS_OF_COLUMNS = \[([\s\S]*?)\]\.join/)[1];
    assert.match(asOfColumns, /'market_rating'/);
    assert.match(asOfColumns, /'market_as_of'/);
    assert.match(source, /async function readMarketColumns\(read, columns\)/);
});
