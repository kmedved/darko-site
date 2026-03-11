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

// lineups/+page.svelte is excluded: dynamic column counts make
// nth-child column-hiding media queries impractical.
const TOUCH_SCROLL_ONLY_FILES = [
    'src/routes/lineups/+page.svelte'
];

function extractTouchScrollBlock(contents, file) {
    const start = contents.indexOf(START_MARKER);
    const end = contents.indexOf(END_MARKER);

    assert.notEqual(start, -1, `${file} should define a touch/mobile scroll mode block`);
    assert.notEqual(end, -1, `${file} should terminate the touch/mobile scroll mode block`);
    assert.ok(end > start, `${file} touch/mobile scroll mode block should be well formed`);

    return contents.slice(start, end);
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

function assertTouchScrollBlock(block, file) {
    assert.match(block, /hover:\s*none/, `${file} should target touch devices without hover`);
    assert.match(block, /pointer:\s*coarse/, `${file} should target coarse pointers`);
    assert.match(block, /any-hover:\s*none/, `${file} should include the any-hover touch fallback`);
    assert.match(block, /any-pointer:\s*coarse/, `${file} should include the any-pointer touch fallback`);
    assert.match(block, /max-width:\s*1024px/, `${file} should support mobile landscape widths`);
    assert.doesNotMatch(block, /@media\s*\(\s*max-width:\s*768px\s*\)/, `${file} should not use a bare <=768px touch fallback`);
    assert.match(block, /\.table-wrapper\s*\{[\s\S]*overflow-x:\s*auto;/, `${file} should enable horizontal scrolling in touch/mobile mode`);
    assert.match(block, /-webkit-overflow-scrolling:\s*touch;/, `${file} should enable momentum scrolling`);
    assert.match(block, /table\s*\{[\s\S]*width:\s*max-content;[\s\S]*min-width:\s*100%;/, `${file} should size the table to create real overflow`);
    assert.match(block, /th\s*\{[\s\S]*position:\s*static;/, `${file} should disable sticky headers in touch/mobile mode`);
    assert.doesNotMatch(block, /nth-child\s*\([\s\S]*display:\s*none;/, `${file} should not hide columns in touch/mobile scroll mode`);
}

test('touch-scroll-only files have scroll block without column-hiding requirement', async () => {
    for (const file of TOUCH_SCROLL_ONLY_FILES) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');
        const block = extractTouchScrollBlock(contents, file);
        assertTouchScrollBlock(block, file);
    }
});

test('touch/mobile table scroll mode enables horizontal scrolling without hiding columns', async () => {
    for (const file of TARGET_FILES) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');
        const block = extractTouchScrollBlock(contents, file);
        const columnHideBlocks = extractMediaBlocks(contents, file).filter(
            (mediaBlock) => /nth-child/.test(mediaBlock) && /display:\s*none;/.test(mediaBlock)
        );

        assertTouchScrollBlock(block, file);
        assert.ok(columnHideBlocks.length > 0, `${file} should keep non-touch narrow-screen column fallbacks`);

        for (const mediaBlock of columnHideBlocks) {
            assert.match(mediaBlock, /hover:\s*hover/, `${file} column hiding should be limited to hover-capable devices`);
            assert.match(mediaBlock, /pointer:\s*fine/, `${file} column hiding should be limited to fine pointers`);
            assert.doesNotMatch(mediaBlock, /hover:\s*none/, `${file} column hiding should not target touch hover modes`);
            assert.doesNotMatch(mediaBlock, /pointer:\s*coarse/, `${file} column hiding should not target coarse pointers`);
            assert.doesNotMatch(mediaBlock, /any-hover:\s*none/, `${file} column hiding should not target touch fallback queries`);
            assert.doesNotMatch(mediaBlock, /any-pointer:\s*coarse/, `${file} column hiding should not target touch fallback queries`);
        }
    }
});
