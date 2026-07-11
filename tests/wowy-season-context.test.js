import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getWowyHistoricalSnapshotContext,
    isWowySeasonAverageContext,
    WOWY_OPENING_GAME_SNAPSHOT,
    WOWY_SEASON_AVERAGE_SNAPSHOT
} from '../src/lib/utils/wowySeasonContext.js';

test('historical WOWY opening-game rows keep the opening-game presentation contract', () => {
    const context = getWowyHistoricalSnapshotContext(
        [{ snapshot_context: WOWY_OPENING_GAME_SNAPSHOT }],
        true
    );

    assert.equal(context, WOWY_OPENING_GAME_SNAPSHOT);
    assert.equal(isWowySeasonAverageContext(context), false);
});

test('historical WOWY season-average rows select the average presentation contract', () => {
    const context = getWowyHistoricalSnapshotContext(
        [{ snapshot_context: WOWY_SEASON_AVERAGE_SNAPSHOT }],
        true
    );

    assert.equal(context, WOWY_SEASON_AVERAGE_SNAPSHOT);
    assert.equal(isWowySeasonAverageContext(context), true);
});

test('unavailable historical context safely falls back to opening-game semantics', () => {
    assert.equal(getWowyHistoricalSnapshotContext([], true), WOWY_OPENING_GAME_SNAPSHOT);
    assert.equal(
        getWowyHistoricalSnapshotContext([{ snapshot_context: 'unknown' }], true),
        WOWY_OPENING_GAME_SNAPSHOT
    );
    assert.equal(getWowyHistoricalSnapshotContext([], false), null);
});
