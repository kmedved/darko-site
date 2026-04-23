import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const LEADERBOARD_PAGE = 'src/routes/+page.svelte';

test('position rail enforces the displayed minimum games rule', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), LEADERBOARD_PAGE), 'utf8');

    assert.match(
        contents,
        /const\s+TOP_POSITION_MIN_GAMES\s*=\s*20;/,
        'leaderboard page should keep the top-position minimum games threshold explicit'
    );
    assert.match(
        contents,
        /\.filter\(\(player\)\s*=>\s*hasMinimumGames\(player,\s*TOP_POSITION_MIN_GAMES\)\)/,
        'top-position rows should filter out players below the displayed minimum-games rule'
    );
    assert.match(
        contents,
        /career_game_num/,
        'the minimum-games check should use the active row career game count supplied by player_ratings'
    );
});
