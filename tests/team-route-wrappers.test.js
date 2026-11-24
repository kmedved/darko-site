import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const routeWrappers = [
    'src/routes/team/[team]/+page.svelte',
    'src/routes/standings/[slug]/+page.svelte'
];


test('team route wrappers are thin and use shared TeamDetailView', async () => {
    for (const file of routeWrappers) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');

        assert.match(contents, /TeamDetailView/, `${file} should render TeamDetailView`);
        assert.match(contents, /<TeamDetailView\b/, `${file} should include TeamDetailView tag`);
    }
});

test('a team page links back to the list of every team, not the leaderboard', async () => {
    // Team pages are opened from Teams, Lineups, the leaderboard and Ask DARKO.
    const team = await fs.readFile(path.resolve(process.cwd(), 'src/routes/team/[team]/+page.svelte'), 'utf8');
    assert.match(team, /backHref="\/teams"/);
    assert.match(team, /backLabel="← All teams"/);
    assert.doesNotMatch(team, /Back to leaderboard/);

    // The Standings pages keep their own way back.
    const standings = await fs.readFile(path.resolve(process.cwd(), 'src/routes/standings/[slug]/+page.svelte'), 'utf8');
    assert.match(standings, /backHref="\/standings"/);
    assert.match(standings, /backLabel="← Back to Standings"/);
});
