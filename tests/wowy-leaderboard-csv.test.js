import test from 'node:test';
import assert from 'node:assert/strict';

import {
    wowyAdjustedAllTimeLeaderboardCsvColumns,
    wowyAdjustedHistoricalLeaderboardCsvColumns,
    wowyLeaderboardCsvColumns
} from '../src/lib/utils/csvPresets.js';

test('WOWY leaderboard CSV uses the current-active observed-rating schema', () => {
    assert.deepEqual(
        wowyLeaderboardCsvColumns.map((column) => column.header),
        [
            '#',
            'Player',
            'Team',
            'Pos',
            'Filter Position',
            'Height (in)',
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
            'filter_position',
            'height_inches',
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
    const height = wowyLeaderboardCsvColumns.find((column) => column.accessor === 'height_inches');

    assert.equal(total.format(2.34), '+2.3');
    assert.equal(total.format(-0.04), '-0.0');
    assert.equal(exposure.format(154.26), '154.3');
    assert.equal(sampleGames.format(82), '82');
    assert.equal(height.format(77), '77');
});

test('Season-Adjusted WOWY CSV labels modeled ratings and season possessions', () => {
    assert.deepEqual(
        wowyAdjustedHistoricalLeaderboardCsvColumns.map((column) => column.header),
        [
            '#',
            'Player',
            'Team Codes',
            'Teams',
            'Filter Position',
            'Height (in)',
            'Adjusted WOWY RAPM',
            'Adjusted WOWY O-RAPM',
            'Adjusted WOWY D-RAPM',
            'Possessions',
            'Games',
            'Playoff Games',
            'First Game',
            'Last Game'
        ]
    );
    assert.deepEqual(
        wowyAdjustedAllTimeLeaderboardCsvColumns.map((column) => column.accessor),
        [
            'rank',
            'player_name',
            'season',
            'team_codes',
            'team_names',
            'filter_position',
            'height_inches',
            'wowy_rapm',
            'wowy_orapm',
            'wowy_drapm',
            'minutes',
            'bpm'
        ]
    );

    // Multi-team seasons, missing heights and season labels format the same way everywhere.
    const column = (columns, accessor) => columns.find((entry) => entry.accessor === accessor);
    assert.equal(column(wowyAdjustedHistoricalLeaderboardCsvColumns, 'team_codes').format(['MIA', 'LAL']), 'MIA / LAL');
    assert.equal(column(wowyAdjustedHistoricalLeaderboardCsvColumns, 'height_inches').format(null), '—');
    assert.equal(column(wowyAdjustedAllTimeLeaderboardCsvColumns, 'season').format(1981), '1980-81');
});
