import test from 'node:test';
import assert from 'node:assert/strict';

import { wowyLeaderboardCsvColumns } from '../src/lib/utils/csvPresets.js';

test('WOWY leaderboard CSV uses the current-active observed-rating schema', () => {
    assert.deepEqual(
        wowyLeaderboardCsvColumns.map((column) => column.header),
        [
            '#',
            'Player',
            'Team',
            'Pos',
            'WOWY RAPM',
            'WOWY O-RAPM',
            'WOWY D-RAPM',
            'Exposure',
            'Sample Games',
            'As of'
        ]
    );
    assert.deepEqual(
        wowyLeaderboardCsvColumns.map((column) => column.accessor),
        [
            'rank',
            'player_name',
            'team_name',
            'position',
            'wowy_rapm',
            'wowy_orapm',
            'wowy_drapm',
            'exposure',
            'career_game_num',
            'date'
        ]
    );
});

test('WOWY leaderboard CSV preserves signed ratings and model exposure', () => {
    const total = wowyLeaderboardCsvColumns.find((column) => column.accessor === 'wowy_rapm');
    const exposure = wowyLeaderboardCsvColumns.find((column) => column.accessor === 'exposure');
    const sampleGames = wowyLeaderboardCsvColumns.find((column) => column.accessor === 'career_game_num');

    assert.equal(total.format(2.34), '+2.3');
    assert.equal(total.format(-0.04), '-0.0');
    assert.equal(exposure.format(154.26), '154.3');
    assert.equal(sampleGames.format(82), '82');
});
