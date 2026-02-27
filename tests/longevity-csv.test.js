import test from 'node:test';
import assert from 'node:assert/strict';

import { longevityCsvColumns } from '../src/lib/utils/csvPresets.js';

test('longevityCsvColumns includes required projection headers and accessors', () => {
    const headers = longevityCsvColumns.map((column) => column.header);
    const accessors = longevityCsvColumns.map((column) => column.accessor);

    const requiredHeaders = [
        'Player',
        'Rookie Season',
        'Career Games',
        'Age',
        'Est. Retirement Age',
        'Years Remaining',
        ...Array.from({ length: 12 }, (_, index) => `+${index + 1}`)
    ];

    const requiredAccessors = [
        'player_name',
        'rookie_season',
        'career_games',
        'age',
        'est_retirement_age',
        'years_remaining',
        ...Array.from({ length: 12 }, (_, index) => `p${index + 1}`)
    ];

    assert.deepEqual(headers, requiredHeaders);
    assert.deepEqual(accessors, requiredAccessors);
});
