import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getSortAriaValue } from '../src/lib/utils/sortableTable.js';

const DETACHED_HEADER_FILES = [
    {
        file: 'src/routes/+page.svelte',
        wrapperSelector: '.table-wrapper'
    },
    {
        file: 'src/lib/components/TeamDetailView.svelte',
        wrapperSelector: '.table-wrapper'
    },
    {
        file: 'src/routes/lineups/+page.svelte',
        wrapperSelector: '.table-wrapper'
    },
    {
        file: 'src/routes/wowy/+page.svelte',
        wrapperSelector: '.wowy-table-shell'
    }
];

const TEAM_ROUTE_WRAPPERS = [
    'src/routes/team/[team]/+page.svelte',
    'src/routes/standings/[slug]/+page.svelte'
];

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('sort aria values mirror the active column and direction', () => {
    assert.equal(getSortAriaValue('dpm', 'asc', 'dpm'), 'ascending');
    assert.equal(getSortAriaValue('dpm', 'desc', 'dpm'), 'descending');
    assert.equal(getSortAriaValue('dpm', 'desc', 'player_name'), 'none');
});

function extractRule(contents, selector, file) {
    const pattern = new RegExp(`${escapeRegex(selector)}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`);
    const match = contents.match(pattern);

    assert.ok(match, `${file} should define a ${selector} CSS rule`);
    return match[1];
}

test('desktop wide tables use detached sticky headers instead of wrapper overflow', async () => {
    for (const { file, wrapperSelector } of DETACHED_HEADER_FILES) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');
        const wrapperRule = extractRule(contents, wrapperSelector, file);

        assert.match(contents, /setupWideStickyTable/, `${file} should use the shared wide sticky table helper`);
        assert.match(contents, /class="sticky-header-shell"/, `${file} should render a detached sticky header shell`);
        assert.match(contents, /class="table-header-scroll"/, `${file} should render the detached header scroller`);
        assert.match(contents, /class="table-body-scroll"/, `${file} should render the body scroller`);
        assert.match(contents, /role="presentation"/, `${file} should keep the visual header clone out of table semantics`);
        assert.match(
            contents,
            /<thead class="table-sizing-head"\s+bind:this=[^>]+>/,
            `${file} should keep an accessible thead on the body table`
        );
        assert.match(contents, /class="table-semantic-row sr-only"/, `${file} should retain same-table semantic headers`);
        assert.match(contents, /table-semantic-row[\s\S]*aria-sort=\{getSortAriaValue\(/, `${file} semantic headers should expose the current sort state`);
        assert.match(contents, /class="[^"]*table-sizing-row/, `${file} should retain separate visual sizing rows`);
        assert.doesNotMatch(contents, /<thead class="table-sizing-head"[^>]*(?:aria-hidden|inert)/, `${file} should expose the body table's own header associations`);
        assert.match(contents, /\.sticky-header-shell\s*\{[\s\S]*top:\s*var\(--nav-sticky-offset\);/, `${file} should pin the detached header below the nav`);
        assert.match(contents, /\.table-body-scroll\s*\{[\s\S]*overflow-x:\s*auto;/, `${file} should move desktop horizontal scrolling to the body scroller`);
        assert.doesNotMatch(wrapperRule, /overflow(?:-x|-y)?\s*:\s*(auto|scroll)/, `${file} wrapper should not become the desktop scroll container`);
    }
});

test('wide-table helper sizes from visual rows without consuming semantic headers', async () => {
    const helper = await fs.readFile(path.resolve(process.cwd(), 'src/lib/utils/wideStickyTable.js'), 'utf8');
    const appCss = await fs.readFile(path.resolve(process.cwd(), 'src/app.css'), 'utf8');

    assert.match(helper, /querySelectorAll\('\.table-sizing-row th'\)/);
    assert.match(helper, /querySelectorAll\('\.table-sizing-row'\)/);
    assert.match(appCss, /\.table-sizing-head \.table-sizing-row th\s*\{[\s\S]*visibility:\s*hidden;/);
});

test('shared team detail table fix reaches both team route wrappers', async () => {
    const teamDetailPath = path.resolve(process.cwd(), 'src/lib/components/TeamDetailView.svelte');
    const teamDetail = await fs.readFile(teamDetailPath, 'utf8');

    assert.match(teamDetail, /setupWideStickyTable/, 'TeamDetailView should own the shared wide-table fix');
    assert.match(teamDetail, /class="table-body-scroll"/, 'TeamDetailView should render the wide-table body scroller');

    for (const file of TEAM_ROUTE_WRAPPERS) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');

        assert.match(contents, /<TeamDetailView\b/, `${file} should continue to delegate to TeamDetailView`);
    }
});
