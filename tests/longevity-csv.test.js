import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { longevityCsvColumns } from '../src/lib/utils/csvPresets.js';
import { careerGamesById } from '../src/lib/utils/playerProfile.js';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

test('longevityCsvColumns includes required projection headers and accessors', () => {
    const headers = longevityCsvColumns.map((column) => column.header);
    const accessors = longevityCsvColumns.map((column) => column.accessor);

    const requiredHeaders = [
        'Player',
        'Team',
        'Pos',
        'Rookie Season',
        'Regular-Season Games',
        'Age',
        'Est. Retirement Age',
        'Years Remaining',
        ...Array.from({ length: 15 }, (_, index) => `+${index + 1}`)
    ];

    const requiredAccessors = [
        'player_name',
        'team_name',
        'position',
        'rookie_season',
        'career_games',
        'age',
        'est_retirement_age',
        'years_remaining',
        ...Array.from({ length: 15 }, (_, index) => `p${index + 1}`)
    ];

    assert.deepEqual(headers, requiredHeaders);
    assert.deepEqual(accessors, requiredAccessors);
});

test('Longevity counts games played from the season table, not model rows', async () => {
    const games = careerGamesById([
        { nba_id: 2544, season: 2004, games: 79, playoff_games: 0 },
        { nba_id: 1641705, season: 2024, games: 71, playoff_games: 0 },
        { nba_id: 2544, season: 2025, games: 70, playoff_games: 4 },
        { nba_id: 1641705, season: 2025, games: 46, playoff_games: 0 }
    ]);
    assert.deepEqual(games.get(2544), { regular: 149, playoffs: 4 });
    assert.deepEqual(games.get(1641705), { regular: 117, playoffs: 0 });
    assert.equal(games.get(203999), undefined);

    const [loader, route, page] = await Promise.all([
        read('src/lib/server/supabase.js'),
        read('src/routes/api/longevity/+server.js'),
        read('src/routes/longevity/+page.svelte')
    ]);
    // The route hands the rows the season table's games; without the table they stay unknown, and a
    // player without a game in it yet has none.
    assert.match(route, /getLongevityRows\(\{ activeOnly: true, loadGames: getCareerGames \}\)/);
    assert.match(loader, /career_games: games \? \(games\.get\(Number\(row\.nba_id\)\)\?\.regular \?\? 0\) : null,/);
    assert.doesNotMatch(loader, /career_games: row\.career_game_num/);
    assert.match(page, /\{ key: 'career_games', label: 'Regular-Season Games', align: 'right' \}/);
});
