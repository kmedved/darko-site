import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { ASK_PAGES } from '../src/lib/utils/askDarko.js';
import { DAILY_RETURNS } from '../src/lib/utils/daily.js';
import {
    currentNews,
    NEW_FOR_DAYS,
    newFeatureCount,
    newThingsTitle,
    newUntil,
    WHATS_NEW
} from '../src/lib/utils/whatsNew.js';

const DAY = 86_400_000;
const keys = (items) => items.map((item) => item.key);

test('items stay for 30 days from launch, newest first', () => {
    assert.equal(NEW_FOR_DAYS, 30);
    const now = new Date('2026-09-28T12:00:00Z');
    assert.deepEqual(keys(currentNews(now)), [
        'comps',
        'team-dna',
        'ask',
        'lab',
        'rewind',
        'seismograph',
        'fantasy',
        'offense-defense'
    ]);

    const seismograph = WHATS_NEW.find((item) => item.key === 'seismograph');
    const launched = Date.parse(seismograph.launched);
    assert.equal(newUntil(seismograph).getTime(), launched + 30 * DAY);
    // On the site for just under 30 days: still new. At 30 days: gone.
    assert.ok(keys(currentNews(new Date(launched + 30 * DAY - 1))).includes('seismograph'));
    assert.ok(!keys(currentNews(new Date(launched + 30 * DAY))).includes('seismograph'));
    // Before launch, nothing about it shows.
    assert.ok(!keys(currentNews(new Date(launched - 1))).includes('seismograph'));

    // Comps & futures went live that morning and leads until the evening's launches.
    const afternoon = new Date('2026-09-28T14:00:00Z');
    assert.deepEqual(keys(currentNews(afternoon)).slice(0, 2), ['comps', 'team-dna']);

    // The Teams overview and the player-page sections went live that evening.
    const evening = new Date('2026-09-28T18:00:00Z');
    assert.deepEqual(keys(currentNews(evening)).slice(0, 4), ['teams', 'seasons', 'box-score', 'comps']);

    // The leaderboard's tools and the fuller player pages followed that night.
    const night = new Date('2026-09-28T20:00:00Z');
    assert.deepEqual(keys(currentNews(night)).slice(0, 3), ['leaderboard-tools', 'player-pages', 'teams']);
    assert.equal(newFeatureCount(night), 12);

    // Late that night: the rearranged pages, the moving dots and a design note.
    const late = new Date('2026-09-28T23:30:00Z');
    assert.deepEqual(keys(currentNews(late)).slice(0, 4), ['page-headers', 'distribution-motion', 'easier-reading', 'leaderboard-tools']);
    assert.equal(newFeatureCount(late), 14);

    // The Daily is off the site between seasons and counts as new from its return.
    assert.equal(WHATS_NEW.find((item) => item.key === 'daily').launched, DAILY_RETURNS);
    assert.ok(!keys(currentNews(late)).includes('daily'));
    assert.equal(keys(currentNews(new Date(DAILY_RETURNS)))[0], 'daily');

    // A month on, the first night's launches have left and the later ones remain.
    assert.deepEqual(keys(currentNews(new Date('2026-10-27T12:00:00Z'))), [
        'daily',
        'page-headers',
        'distribution-motion',
        'easier-reading',
        'leaderboard-tools',
        'player-pages',
        'teams',
        'seasons',
        'box-score',
        'comps',
        'team-dna',
        'ask',
        'lab',
        'rewind'
    ]);
    assert.deepEqual(keys(currentNews(new Date('2026-11-01T00:00:00Z'))), ['daily']);
    assert.deepEqual(currentNews(new Date('2026-11-22T00:00:00Z')), []);
    // The menus count features, not the design note, to match the page's headline.
    assert.equal(newFeatureCount(now), 7);
    assert.equal(newFeatureCount(afternoon), 7);
    assert.equal(newFeatureCount(evening), 10);
    assert.equal(newFeatureCount(new Date('2026-11-01T00:00:00Z')), 1);
});

function routeExists(href) {
    const segments = href.split(/[?#]/)[0].split('/').filter(Boolean);
    let dir = path.resolve(process.cwd(), 'src/routes');
    for (const segment of segments) {
        const literal = path.join(dir, segment);
        if (fs.existsSync(literal)) {
            dir = literal;
            continue;
        }
        const param = fs.readdirSync(dir).find((name) => /^\[[^\]]+\]$/.test(name));
        if (!param) return false;
        dir = path.join(dir, param);
    }
    return fs.existsSync(path.join(dir, '+page.svelte'));
}

test('every item is a feature the site has, with a working way in', () => {
    for (const item of WHATS_NEW) {
        assert.ok(item.title && item.text, item.key);
        assert.ok(Number.isFinite(Date.parse(item.launched)), `${item.key} launch date`);
        if (item.kind === 'design') continue;
        if (item.ask) {
            assert.equal(typeof item.ask, 'string');
        } else {
            assert.ok(routeExists(item.href), `${item.key}: ${item.href}`);
        }
    }
    // DARKOdle and Card Studio were dropped.
    assert.ok(!WHATS_NEW.some((item) => /darkodle|card studio/i.test(item.title)));
    assert.equal(new Set(keys(WHATS_NEW)).size, WHATS_NEW.length);
});

test('the headline counts in words', () => {
    assert.equal(newThingsTitle(7), 'Seven new things to do with DARKO');
    assert.equal(newThingsTitle(1), 'One new thing to do with DARKO');
    assert.equal(newThingsTitle(12), '12 new things to do with DARKO');
});

test('the menus, the page and Ask DARKO all read the same 30-day list', async () => {
    const read = (file) => fsp.readFile(path.resolve(process.cwd(), file), 'utf8');
    const layout = await read('src/routes/+layout.svelte');
    assert.match(layout, /let whatsNewCount = \$state\(newFeatureCount\(\)\);/);
    // A page served from cache recounts in the browser.
    assert.match(layout, /onMount\(\(\) => \{\s*whatsNewCount = newFeatureCount\(\);/);
    const page = await read('src/routes/new/+page.svelte');
    assert.match(page, /currentNews\(now, data\.items \?\? \[\]\)/);
    assert.equal((layout.match(/\{#if whatsNewCount > 0\}/g) ?? []).length, 2);

    const load = await read('src/routes/new/+page.server.js');
    assert.match(load, /currentNews\(new Date\(\)\)/);
    assert.match(load, /edgeSMaxAge: 3600, swr: 3600/);

    assert.ok(ASK_PAGES.some((entry) => entry.href === '/new' && entry.re.test("what's new")));
    const ask = await read('src/lib/components/AskDarko.svelte');
    assert.match(ask, /window\.addEventListener\('darko:ask', ask\)/);
});
