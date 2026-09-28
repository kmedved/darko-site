import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { careerGames, formatHeight } from '../src/lib/utils/playerProfile.js';
import {
    LOWER_IS_BETTER,
    percentileAmong,
    SKILL_FIELDS,
    SKILL_LABELS,
    SKILL_METRICS,
    withSkillRates
} from '../src/lib/utils/playerSkills.js';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');
const near = (a, b) => Math.abs(a - b) < 1e-9;

test("the prototype's ten skills, each named for the skill", () => {
    assert.equal(SKILL_METRICS.length, 10);
    assert.deepEqual(Object.keys(SKILL_LABELS).sort(), [...SKILL_METRICS].sort());
    assert.equal(SKILL_LABELS.x_blk_100, 'Rim protection (blk per 100)');
    assert.ok(LOWER_IS_BETTER.has('tov_pct') && LOWER_IS_BETTER.size === 1);
});

test('true shooting and turnovers per play come from the per-100 projections', () => {
    const row = withSkillRates({ x_pts_100: 38.1, x_fga_100: 26.0, x_fta_100: 9.8, x_tov_100: 4.4 });
    const trueShots = 26.0 + 0.44 * 9.8;
    assert.ok(near(row.ts_pct, 38.1 / (2 * trueShots)));
    assert.ok(near(row.tov_pct, 4.4 / (trueShots + 4.4)));
    // Missing inputs leave the rates empty instead of zero.
    assert.deepEqual(withSkillRates({ x_pts_100: 20 }), { x_pts_100: 20, ts_pct: null, tov_pct: null });
    assert.equal(withSkillRates(null), null);
});

test('percentiles: the share of the position a player beats; fewer turnovers beat more', () => {
    const values = [1, 2, 3, 4];
    assert.equal(percentileAmong(3.5, values, 'x_blk_100'), 75);
    assert.equal(percentileAmong(1.5, values, 'tov_pct'), 75);
    assert.equal(percentileAmong(null, values, 'x_blk_100'), null);
    assert.equal(percentileAmong(2, [], 'x_blk_100'), null);
});

test('height in feet and inches, and career games from the season table', () => {
    assert.equal(formatHeight(82), `6'10"`);
    assert.equal(formatHeight('88'), `7'4"`);
    assert.equal(formatHeight(null), null);
    assert.deepEqual(
        careerGames([
            { games: 70, playoff_games: 7 },
            { games: '65', playoff_games: 0 },
            { games: null, playoff_games: null }
        ]),
        { regular: 135, playoffs: 7 }
    );
});

test('the player page ranks skills, offers the presets, and names size and games', async () => {
    const [page, views, chart, board] = await Promise.all([
        read('src/routes/player/[nbaId]/+page.svelte'),
        read('src/lib/server/playerViews.js'),
        read('src/lib/components/TalentPercentilesChart.svelte'),
        read('src/routes/+page.svelte')
    ]);
    // Every skill input is in the active-player view the page ranks against.
    const percentilesView = views.match(/percentiles: \[([\s\S]*?)\]/)[1];
    for (const field of SKILL_FIELDS) assert.match(percentilesView, new RegExp(`'${field}'`), field);

    assert.match(page, /skills: \[\.\.\.SKILL_METRICS\]/);
    // The Ratings button is the Ratings group, and it is what the chart opens on.
    assert.match(page, /ratings: PERCENTILE_GROUPS\[0\]\.options\.map\(\(option\) => option\.value\)/);
    const ratingsGroup = page.match(/label: 'Ratings',\s*options: \[([\s\S]*?)\]/)[1];
    assert.deepEqual([...ratingsGroup.matchAll(/value: '([a-z_]+)'/g)].map((match) => match[1]), [
        'dpm',
        'o_dpm',
        'd_dpm',
        'on_off_dpm',
        'bayes_rapm_total'
    ]);
    assert.match(page, /let selectedPercentileMetrics = \$state\(\[\.\.\.PERCENTILE_PRESETS\.ratings\]\);/);
    assert.match(page, /return \{ metric, value: percentileAmong\(playerValue, values, metric\) \};/);
    assert.match(page, /rawValues=\{skillInfo\}\s*labels=\{SKILL_LABELS\}/);
    assert.match(chart, /return labels\[metric\] \?\? getMetricDisplayLabel\(metric\);/);
    assert.match(page, /const since = Number\(playerInfo\.rookie_season\) < 1997 \? ' since 1996-97' : '';/);
    // The sidebar scrolls when its controls outgrow the window.
    assert.match(page, /max-height: calc\(100dvh - var\(--nav-sticky-offset\) - 48px\);\s*overflow-y: auto;/);

    // The leaderboard shows age under the name, beside the position.
    assert.match(board, /\{#if positionAndAge\(player\)\}<small>\{positionAndAge\(player\)\}<\/small>\{\/if\}/);
});
