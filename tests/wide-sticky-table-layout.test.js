import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const DETACHED_HEADER_FILES = [
    {
        file: 'src/routes/+page.svelte',
        wrapperSelector: '.table-wrapper'
    },
    {
        file: 'src/lib/components/LegacyLeaderboard.svelte',
        wrapperSelector: '.legacy-wrapper'
    },
    {
        file: 'src/lib/components/TeamDetailView.svelte',
        wrapperSelector: '.table-wrapper'
    }
];

const TEAM_ROUTE_WRAPPERS = [
    'src/routes/team/[team]/+page.svelte',
    'src/routes/standings/[slug]/+page.svelte'
];

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
        assert.match(contents, /\.sticky-header-shell\s*\{[\s\S]*top:\s*var\(--nav-sticky-offset\);/, `${file} should pin the detached header below the nav`);
        assert.match(contents, /\.table-body-scroll\s*\{[\s\S]*overflow-x:\s*auto;/, `${file} should move desktop horizontal scrolling to the body scroller`);
        assert.doesNotMatch(wrapperRule, /overflow(?:-x|-y)?\s*:\s*(auto|scroll)/, `${file} wrapper should not become the desktop scroll container`);
    }
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
