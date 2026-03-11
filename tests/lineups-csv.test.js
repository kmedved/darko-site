import test from 'node:test';
import assert from 'node:assert/strict';

import { lineupsCsvColumns, getLineupsCsvColumns } from '../src/lib/utils/csvPresets.js';

test('lineupsCsvColumns exposes the expected headers and accessors for 5-man', () => {
    const headers = lineupsCsvColumns.map((column) => column.header);
    const accessors = lineupsCsvColumns.map((column) => column.accessor);

    assert.deepEqual(headers, [
        'Variant',
        'Team',
        'Poss',
        'Net +/-',
        'Off +/-',
        'Def +/-',
        'Off Synergy',
        'Def Synergy',
        'Player 1',
        'Player 2',
        'Player 3',
        'Player 4',
        'Player 5'
    ]);

    assert.deepEqual(accessors, [
        'variant',
        'team_name',
        'possessions',
        'net_pm',
        'off_pm',
        'def_pm',
        'off_synergy',
        'def_synergy',
        'player_1',
        'player_2',
        'player_3',
        'player_4',
        'player_5'
    ]);
});

test('lineupsCsvColumns format variant, possessions, and signed ratings for export', () => {
    const variantColumn = lineupsCsvColumns.find((column) => column.accessor === 'variant');
    const possessionsColumn = lineupsCsvColumns.find((column) => column.accessor === 'possessions');
    const netColumn = lineupsCsvColumns.find((column) => column.accessor === 'net_pm');

    assert.equal(variantColumn.format('npi'), 'NPI');
    assert.equal(possessionsColumn.format(138), '138');
    assert.equal(netColumn.format(2.34), '+2.3');
    assert.equal(netColumn.format(null), '\u2014');
});

test('getLineupsCsvColumns produces correct player columns for 3-man lineups', () => {
    const columns = getLineupsCsvColumns(3);
    const playerHeaders = columns.filter((c) => c.header.startsWith('Player'));

    assert.equal(playerHeaders.length, 3);
    assert.deepEqual(
        playerHeaders.map((c) => c.accessor),
        ['player_1', 'player_2', 'player_3']
    );
});

test('getLineupsCsvColumns produces correct player columns for 2-man lineups', () => {
    const columns = getLineupsCsvColumns(2);
    const playerHeaders = columns.filter((c) => c.header.startsWith('Player'));

    assert.equal(playerHeaders.length, 2);
    assert.deepEqual(
        playerHeaders.map((c) => c.accessor),
        ['player_1', 'player_2']
    );
});

test('getLineupsCsvColumns defaults to 5 player columns', () => {
    const columns = getLineupsCsvColumns();
    const playerHeaders = columns.filter((c) => c.header.startsWith('Player'));

    assert.equal(playerHeaders.length, 5);
});
