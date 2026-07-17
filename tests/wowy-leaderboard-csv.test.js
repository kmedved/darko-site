import test from 'node:test';
import assert from 'node:assert/strict';

import {
    wowyAdjustedAllTimeLeaderboardCsvColumns,
    wowyAdjustedHistoricalLeaderboardCsvColumns,
    wowyAllTimeLeaderboardCsvColumns,
    wowyHistoricalLeaderboardCsvColumns,
    wowyLeaderboardCsvColumns,
    wowyOpeningGameLeaderboardCsvColumns
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

test('opening-game WOWY CSV retains the snapshot schema during the migration window', () => {
    assert.deepEqual(
        wowyOpeningGameLeaderboardCsvColumns.map((column) => column.header),
        [
            '#',
            'Player',
            'Team Code',
            'Team',
            'Filter Position',
            'Height (in)',
            'WOWY RAPM',
            'WOWY O-RAPM',
            'WOWY D-RAPM',
            'Exposure',
            'Sample Games',
            'Opening Game'
        ]
    );
    assert.deepEqual(
        wowyOpeningGameLeaderboardCsvColumns.map((column) => column.accessor),
        [
            'rank',
            'player_name',
            'team_code',
            'team_name',
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

test('historical WOWY CSV preserves multi-team provenance and season-average context', () => {
    assert.deepEqual(
        wowyHistoricalLeaderboardCsvColumns.map((column) => column.header),
        [
            '#',
            'Player',
            'Team Codes',
            'Teams',
            'Filter Position',
            'Height (in)',
            'Avg WOWY RAPM',
            'Avg WOWY O-RAPM',
            'Avg WOWY D-RAPM',
            'Avg Exposure',
            'Games',
            'First Game',
            'Last Game'
        ]
    );
    assert.deepEqual(
        wowyHistoricalLeaderboardCsvColumns.map((column) => column.accessor),
        [
            'rank',
            'player_name',
            'team_codes',
            'team_names',
            'filter_position',
            'height_inches',
            'wowy_rapm',
            'wowy_orapm',
            'wowy_drapm',
            'exposure',
            'season_games',
            'first_date',
            'last_date'
        ]
    );

    const teamCodes = wowyHistoricalLeaderboardCsvColumns.find(
        (column) => column.accessor === 'team_codes'
    );
    assert.equal(teamCodes.format(['MIA', 'LAL']), 'MIA / LAL');
    const height = wowyHistoricalLeaderboardCsvColumns.find(
        (column) => column.accessor === 'height_inches'
    );
    assert.equal(height.format(null), '—');
});

test('all-time WOWY CSV preserves the official rank and player-season context', () => {
    assert.deepEqual(
        wowyAllTimeLeaderboardCsvColumns.map((column) => column.header),
        [
            '#',
            'Player',
            'Season',
            'Team Codes',
            'Teams',
            'Filter Position',
            'Height (in)',
            'Avg WOWY RAPM',
            'Avg WOWY O-RAPM',
            'Avg WOWY D-RAPM',
            'Avg Exposure',
            'Games',
            'First Game',
            'Last Game'
        ]
    );
    assert.deepEqual(
        wowyAllTimeLeaderboardCsvColumns.map((column) => column.accessor),
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
            'exposure',
            'season_games',
            'first_date',
            'last_date'
        ]
    );

    const season = wowyAllTimeLeaderboardCsvColumns.find(
        (column) => column.accessor === 'season'
    );
    assert.equal(season.format(1981), '1980-81');
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
            'exposure',
            'season_games',
            'playoff_games',
            'first_date',
            'last_date'
        ]
    );
});
