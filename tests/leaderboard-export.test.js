import test from 'node:test';
import assert from 'node:assert/strict';

import { leaderboardCsvColumns } from '../src/lib/utils/csvPresets.js';
import { LEADERBOARD_COLUMNS } from '../src/lib/utils/leaderboardColumns.js';
import { buildLeaderboardCsvRows } from '../src/lib/utils/leaderboardCsv.js';


test('buildLeaderboardCsvRows assigns ranks in sorted display order', () => {
    const sortedPlayers = [
        { player_name: 'Alice', dpm: 5 },
        { player_name: 'Bob', dpm: 9 },
        { player_name: 'Carlos', dpm: 1 }
    ];

    const rows = buildLeaderboardCsvRows(sortedPlayers);

    assert.equal(rows.length, 3);
    assert.equal(rows[0].rank, 1);
    assert.equal(rows[1].player_name, 'Bob');
    assert.equal(rows[1].rank, 2);
    assert.equal(rows[2].rank, 3);
});

test('standard leaderboard money columns are ordered as $ Value, Salary, Surplus', () => {
    const moneyColumns = LEADERBOARD_COLUMNS
        .filter((column) => ['sal_market_fixed', 'actual_salary', 'surplus_value'].includes(column.key))
        .map((column) => ({ key: column.key, label: column.label }));

    assert.deepEqual(moneyColumns, [
        { key: 'sal_market_fixed', label: '$ Value' },
        { key: 'actual_salary', label: 'Salary' },
        { key: 'surplus_value', label: 'Surplus' }
    ]);
});

test('leaderboard CSV money columns match the standard leaderboard labels and order', () => {
    const moneyColumns = leaderboardCsvColumns
        .filter((column) => ['sal_market_fixed', 'actual_salary', 'surplus_value'].includes(column.accessor))
        .map((column) => ({ accessor: column.accessor, header: column.header }));

    assert.deepEqual(moneyColumns, [
        { accessor: 'sal_market_fixed', header: '$ Value' },
        { accessor: 'actual_salary', header: 'Salary' },
        { accessor: 'surplus_value', header: 'Surplus Value' }
    ]);
});
