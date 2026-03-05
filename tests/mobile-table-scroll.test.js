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

function extractTouchScrollBlock(contents, file) {
    const start = contents.indexOf(START_MARKER);
    const end = contents.indexOf(END_MARKER);

    assert.notEqual(start, -1, `${file} should define a touch/mobile scroll mode block`);
    assert.notEqual(end, -1, `${file} should terminate the touch/mobile scroll mode block`);
    assert.ok(end > start, `${file} touch/mobile scroll mode block should be well formed`);

    return contents.slice(start, end);
}

test('touch/mobile table scroll mode enables horizontal scrolling without hiding columns', async () => {
    for (const file of TARGET_FILES) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');
        const block = extractTouchScrollBlock(contents, file);

        assert.match(block, /pointer:\s*coarse/, `${file} should target touch devices`);
        assert.match(block, /max-width:\s*1024px/, `${file} should support mobile landscape widths`);
        assert.match(block, /\.table-wrapper\s*\{[\s\S]*overflow-x:\s*auto;/, `${file} should enable horizontal scrolling in touch/mobile mode`);
        assert.match(block, /-webkit-overflow-scrolling:\s*touch;/, `${file} should enable momentum scrolling`);
        assert.match(block, /table\s*\{[\s\S]*width:\s*max-content;[\s\S]*min-width:\s*100%;/, `${file} should size the table to create real overflow`);
        assert.match(block, /th\s*\{[\s\S]*position:\s*static;/, `${file} should disable sticky headers in touch/mobile mode`);
        assert.doesNotMatch(block, /nth-child\s*\([\s\S]*display:\s*none;/, `${file} should not hide columns in touch/mobile scroll mode`);
    }
});
