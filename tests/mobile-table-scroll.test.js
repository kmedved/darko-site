import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const START_MARKER = '/* Touch/mobile scroll mode */';
const END_MARKER = '/* End touch/mobile scroll mode */';

const TARGET_FILES = [
    'src/routes/standings/+page.svelte',
    'src/routes/longevity/+page.svelte'
];

function extractBlock(contents, file, startMarker, endMarker) {
    const start = contents.indexOf(startMarker);
    const end = contents.indexOf(endMarker);

    assert.notEqual(start, -1, `${file} should define ${startMarker}`);
    assert.notEqual(end, -1, `${file} should terminate it with ${endMarker}`);
    assert.ok(end > start, `${file} ${startMarker} block should be well formed`);

    return contents.slice(start, end);
}

function extractTouchScrollBlock(contents, file) {
    return extractBlock(contents, file, START_MARKER, END_MARKER);
}

function extractMediaBlocks(contents, file) {
    const blocks = [];
    let searchIndex = 0;

    while (true) {
        const start = contents.indexOf('@media', searchIndex);
        if (start === -1) break;

        const openBrace = contents.indexOf('{', start);
        assert.notEqual(openBrace, -1, `${file} should have a valid @media block`);

        let depth = 0;
        let end = openBrace;

        for (; end < contents.length; end += 1) {
            const char = contents[end];
            if (char === '{') depth += 1;
            if (char === '}') {
                depth -= 1;
                if (depth === 0) {
                    end += 1;
                    break;
                }
            }
        }

        assert.equal(depth, 0, `${file} should close each @media block`);
        blocks.push(contents.slice(start, end));
        searchIndex = end;
    }

    return blocks;
}

test('lineups keeps its detached sticky header while the body scrolls on touch', async () => {
    const file = 'src/routes/lineups/+page.svelte';
    const contents = await fs.readFile(path.resolve(process.cwd(), file), 'utf8');
    const block = extractTouchScrollBlock(contents, file);

    assert.match(contents, /\.table-body-scroll\s*\{[\s\S]*overflow-x:\s*auto;/);
    assert.match(block, /\.table-body-scroll\s*\{[\s\S]*-webkit-overflow-scrolling:\s*touch;/);
    assert.match(block, /table\s*\{[\s\S]*width:\s*max-content;[\s\S]*min-width:\s*100%;/);
    assert.doesNotMatch(block, /\.table-wrapper\s*\{[\s\S]*overflow-x:\s*auto;/);
    assert.doesNotMatch(block, /\.sticky-header-shell\s*\{[\s\S]*display:\s*none;/);
});

test('standings and longevity keep a pinned header while a wide table scrolls sideways', async () => {
    for (const file of TARGET_FILES) {
        const contents = await fs.readFile(path.resolve(process.cwd(), file), 'utf8');
        const columnHideBlocks = extractMediaBlocks(contents, file).filter(
            (mediaBlock) => /nth-child/.test(mediaBlock) && /display:\s*none;/.test(mediaBlock)
        );

        // A detached header pinned under the nav, over a body that scrolls on its own.
        assert.match(contents, /return setupWideStickyTable\(\{/, `${file} should sync a detached header`);
        assert.match(contents, /class="sticky-header-shell"/);
        assert.match(contents, /\.sticky-header-shell \{[^}]*position: sticky;[^}]*top: var\(--nav-sticky-offset\);/);
        assert.match(contents, /\.table-body-scroll \{[^}]*overflow-x: auto;/);
        // AGENTS.md: the wrapper itself never scrolls, which would unstick the header.
        assert.doesNotMatch(contents, /\.table-wrapper \{[^}]*overflow-x:\s*auto/, `${file} wrapper must not scroll`);
        // Same-table semantic headers, and sort controls the keyboard can reach.
        assert.match(contents, /<tr class="table-semantic-row sr-only">/);
        assert.match(contents, /scope="col"/);
        assert.match(contents, /<button type="button" onclick=\{\(\) => toggleSort\(column\.key\)\}>/);
        assert.deepEqual(columnHideBlocks, [], `${file} should never hide columns`);
    }
});
