import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

test('every page carries Ask DARKO: a nav button and one dialog with its shortcuts', async () => {
    const layout = await read('src/routes/+layout.svelte');
    assert.match(layout, /<AskDarko bind:open=\{askOpen\} \/>/);
    assert.match(layout, /class="ask-nav-toggle"/);
    assert.match(layout, /aria-keyshortcuts="Meta\+K Control\+K \/"/);

    const component = await read('src/lib/components/AskDarko.svelte');
    assert.match(component, /role="dialog"/);
    assert.match(component, /role="combobox"/);
    assert.match(component, /aria-activedescendant=/);
    assert.match(component, /\/api\/active-players\?view=ask/);
    assert.match(component, /\/api\/search-players\?q=/);
    // "Back to today" clears the date the way the Time Machine does, before navigating.
    assert.match(component, /timeMachine\.date = null;\s*void goto\(relativeHref\(withAsOf\(\$page\.url, null\)\)/);
});

test('the active-players API serves the command bar a compact view', async () => {
    const views = await read('src/lib/server/playerViews.js');
    assert.match(views, /ask: \[/);
    for (const field of ['player_name', 'team_name', 'x_minutes', 'x_fg3_pct', 'surplus_value', 'rookie_season']) {
        assert.match(views.slice(views.indexOf('ask: [')), new RegExp(`'${field}'`));
    }
});

test('the Roster Lab makes a linked trade once and then drops it from the URL', async () => {
    const lab = await read('src/routes/lab/+page.svelte');
    assert.match(lab, /params\.has\('trade'\)/);
    assert.match(lab, /function applyTrade\(id, to\)/);
    assert.match(lab, /addPlayer\('a', id\)/);
    assert.match(lab, /url\.searchParams\.delete\('trade'\);\s*url\.searchParams\.delete\('to'\);/);
});

test('the Fantasy Lab takes its scoring from a link once', async () => {
    const projections = await read('src/routes/projections/+page.svelte');
    assert.match(projections, /to\?\.url\.searchParams\.get\('scoring'\)/);
    assert.match(projections, /url\.searchParams\.delete\('scoring'\)/);
});

test('team pages get every team rating for Team DNA', async () => {
    const supabase = await read('src/lib/server/supabase.js');
    assert.match(supabase, /league: leagueTeamRatings\(allPlayers \|\| \[\]\)/);
    for (const file of ['src/routes/team/[team]/+page.svelte', 'src/routes/standings/[slug]/+page.svelte']) {
        assert.match(await read(file), /league=\{data\.league\}/, file);
    }
    const view = await read('src/lib/components/TeamDetailView.svelte');
    assert.match(view, /id="team-dna"/);
    assert.match(view, /teamRatingSummary\(abbr, teamPlayers, league\)/);
});
