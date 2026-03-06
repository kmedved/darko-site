import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const TARGET_FILE = 'src/routes/trajectories/+page.svelte';

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

test('trajectories mobile layout keeps the chart column stretched to full width', async () => {
    const absolutePath = path.resolve(process.cwd(), TARGET_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');
    const mobileBlock = extractMediaBlocks(contents, TARGET_FILE).find((block) =>
        /@media\s*\(\s*max-width:\s*768px\s*\)/.test(block)
    );

    assert.ok(mobileBlock, `${TARGET_FILE} should define a <=768px mobile media block`);
    assert.match(
        mobileBlock,
        /\.trajectory-layout\s*\{[\s\S]*flex-direction:\s*column;/,
        'mobile trajectories layout should stay stacked'
    );
    assert.match(
        mobileBlock,
        /\.trajectory-layout\s*\{[\s\S]*align-items:\s*stretch;/,
        'mobile trajectories layout should stretch children to full width'
    );
    assert.match(
        mobileBlock,
        /\.trajectory-chart-area\s*\{[\s\S]*width:\s*100%;/,
        'mobile chart area should explicitly fill the available width'
    );
    assert.match(
        mobileBlock,
        /\.trajectory-chart-area\s*\{[\s\S]*min-width:\s*0;/,
        'mobile chart area should preserve the min-width guard'
    );
});
