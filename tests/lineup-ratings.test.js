import test from 'node:test';
import assert from 'node:assert/strict';

import {
    TEAM_PENDING_LABEL,
    groupLineupRows,
    normalizeLineupRow,
    normalizeLineupVariant
} from '../src/lib/server/lineupRatings.js';

function buildLineupRow(overrides = {}) {
    return {
        variant: 'pi',
        min_season_poss: 150,
        total_net_rating: 3.1,
        total_off_rating: 5.2,
        total_def_rating: 2.1,
        player_1: 'Player 1',
        player_2: 'Player 2',
        player_3: 'Player 3',
        player_4: 'Player 4',
        player_5: 'Player 5',
        player_1_id: 1,
        player_2_id: 2,
        player_3_id: 3,
        player_4_id: 4,
        player_5_id: 5,
        ...overrides
    };
}

test('normalizeLineupVariant maps raw and npi variants into the npi bucket', () => {
    assert.equal(normalizeLineupVariant('raw'), 'npi');
    assert.equal(normalizeLineupVariant('npi'), 'npi');
    assert.equal(normalizeLineupVariant('pi'), 'pi');
    assert.equal(normalizeLineupVariant('other'), null);
});

test('normalizeLineupRow resolves tm_id to team name', () => {
    const row = normalizeLineupRow(buildLineupRow({ tm_id: 1610612738 }));

    assert.equal(row.team_name, 'Boston Celtics');
    assert.equal(row.lineup_label, 'Player 1, Player 2, Player 3, Player 4, Player 5');
});

test('normalizeLineupRow falls back to Team pending when tm_id is missing', () => {
    const row = normalizeLineupRow(buildLineupRow({ tm_id: undefined }));

    assert.equal(row.team_name, TEAM_PENDING_LABEL);
});

test('normalizeLineupRow falls back to Team pending when tm_id is unmapped', () => {
    const row = normalizeLineupRow(buildLineupRow({ tm_id: 9999999999 }));

    assert.equal(row.team_name, TEAM_PENDING_LABEL);
});

test('normalizeLineupRow passes through synergy values', () => {
    const row = normalizeLineupRow(buildLineupRow({
        tm_id: 1610612743,
        off_synergy: 1.5,
        def_synergy: -0.8
    }));

    assert.equal(row.off_synergy, 1.5);
    assert.equal(row.def_synergy, -0.8);
});

test('normalizeLineupRow excludes rows missing total ratings', () => {
    const row = normalizeLineupRow(buildLineupRow({ total_net_rating: null }));

    assert.equal(row, null);
});

test('normalizeLineupRow enforces a strict possessions threshold above 100', () => {
    assert.equal(normalizeLineupRow(buildLineupRow({ min_season_poss: 100 })), null);
    assert.notEqual(normalizeLineupRow(buildLineupRow({ min_season_poss: 101 })), null);
});

test('groupLineupRows prefers exact npi rows over raw duplicates during rollout', () => {
    const grouped = groupLineupRows([
        buildLineupRow({
            variant: 'raw',
            tm_id: undefined,
            total_net_rating: 1.1
        }),
        buildLineupRow({
            variant: 'npi',
            tm_id: 1610612738,
            total_net_rating: 2.4
        })
    ]);

    assert.equal(grouped.pi.length, 0);
    assert.equal(grouped.npi.length, 1);
    assert.equal(grouped.npi[0].variant, 'npi');
    assert.equal(grouped.npi[0].team_name, 'Boston Celtics');
    assert.equal(grouped.npi[0].net_pm, 2.4);
});
