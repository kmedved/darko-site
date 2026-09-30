import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalTeamName, knownTeamName } from '../src/lib/utils/teamRouteUtils.js';

test('team detail page loaders delegate to the shared team page helper', async () => {
    const loaderFiles = [
        'src/routes/team/[team]/+page.server.js',
        'src/routes/standings/[slug]/+page.server.js'
    ];

    for (const file of loaderFiles) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');

        assert.match(contents, /loadTeamPageData/, `${file} should use the shared load helper`);
    }
});

test('team detail API route reuses the shared team payload helper and cache helper', async () => {
    const file = path.resolve(process.cwd(), 'src/routes/api/standings/[slug]/+server.js');
    const contents = await fs.readFile(file, 'utf8');

    assert.match(contents, /getTeamPagePayload/, 'API route should reuse the shared team payload helper');
    assert.match(contents, /setTeamPageCacheHeaders/, 'API route should reuse the shared cache helper');
});

test('team pages accept abbreviations and any-case names', async () => {
    assert.equal(canonicalTeamName('OKC'), 'Oklahoma City Thunder');
    assert.equal(canonicalTeamName('den'), 'Denver Nuggets');
    assert.equal(canonicalTeamName('oklahoma city thunder'), 'Oklahoma City Thunder');
    assert.equal(canonicalTeamName('Denver Nuggets'), 'Denver Nuggets');
    assert.equal(canonicalTeamName('Seattle SuperSonics'), 'Seattle SuperSonics');
    // Slugs and nicknames: /team/knicks, /team/new-york-knicks, /standings/trail_blazers.
    assert.equal(canonicalTeamName('knicks'), 'New York Knicks');
    assert.equal(canonicalTeamName('new-york-knicks'), 'New York Knicks');
    assert.equal(canonicalTeamName('trail blazers'), 'Portland Trail Blazers');
    assert.equal(canonicalTeamName('Blazers'), 'Portland Trail Blazers');
    assert.equal(canonicalTeamName('76ers'), 'Philadelphia 76ers');
    // A city alone names no team.
    assert.equal(knownTeamName('los-angeles'), null);
    assert.equal(knownTeamName(''), null);

    // Anything that isn't one of the 30 teams has no page: a 404, not an empty page titled
    // with the slug.
    assert.equal(knownTeamName('OKC'), 'Oklahoma City Thunder');
    assert.equal(knownTeamName('denver nuggets'), 'Denver Nuggets');
    assert.equal(knownTeamName('not-a-team'), null);
    assert.equal(knownTeamName('Seattle SuperSonics'), null);

    const helper = await fs.readFile(path.resolve(process.cwd(), 'src/lib/server/teamPage.js'), 'utf8');
    assert.match(helper, /const known = knownTeamName\(teamName\);/, 'the shared loader should resolve the team name');
    assert.match(helper, /throw error\(404, 'Team not found'\);/);
    const api = await fs.readFile(path.resolve(process.cwd(), 'src/routes/api/standings/[slug]/+server.js'), 'utf8');
    assert.match(api, /e\?\.status === 400 \|\| e\?\.status === 404/, 'the API keeps the 404');
});

test('an offseason projection row keeps its ratings but takes the last real team', async () => {
    const { withLatestTeam } = await import('../src/lib/utils/latestTeam.js');
    const rows = [
        { date: '2026-04-30', team_name: 'Denver Nuggets', tm_id: 1610612743, dpm: 6.5 },
        { date: '2026-07-26', team_name: null, tm_id: -999, dpm: 6.8 }
    ];
    assert.deepEqual(withLatestTeam(rows[1], rows), { date: '2026-07-26', team_name: 'Denver Nuggets', tm_id: -999, dpm: 6.8 });
    assert.equal(withLatestTeam(rows[0], rows), rows[0], 'a row with a team is left alone');
    assert.equal(withLatestTeam({ team_name: null }, []).team_name, null, 'no team anywhere stays empty');
});
