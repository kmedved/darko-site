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
        /\.trajectory-workspace\s*\{[\s\S]*grid-template-columns:\s*1fr;/,
        'mobile trajectories layout should stay stacked'
    );
    assert.match(
        mobileBlock,
        /\.trajectory-workspace\s*\{[\s\S]*align-items:\s*stretch;/,
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

test('trajectories sidebar leads with the player picker and folds the rarely used settings into Advanced', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), TARGET_FILE), 'utf8');
    const markup = contents.slice(contents.indexOf('</script>'), contents.indexOf('<style>'));
    const aside = markup.slice(markup.indexOf('<aside class="trajectory-controls"'), markup.indexOf('</aside>'));

    // Picker, then the phone toggle and the options it folds: Talent Type, Time Scale, Advanced.
    const order = [
        'Select Players to Compare',
        'class="btn chart-options-toggle"',
        '<div id="trajectory-chart-options"',
        'for="talent-type">Talent Type</label>',
        '<legend class="control-label">Time Scale</legend>',
        '<details class="advanced-options">',
        'Y-Axis Range',
        'Smoothing Span',
        '{#if showRangeFilter}',
        '</details>'
    ].map((needle) => {
        const index = aside.indexOf(needle);
        assert.notEqual(index, -1, `the sidebar should contain ${needle}`);
        return index;
    });
    assert.deepEqual(order, [...order].sort((a, b) => a - b), 'sidebar controls should run in the new order');

    // Advanced starts closed and stays inside the phone fold, so no lone row trails the toggle.
    assert.doesNotMatch(aside, /<details[^>]*\sopen\b/);
    assert.doesNotMatch(aside, /bind:open/);
    assert.match(aside, /<\/details>\s*<\/div>\s*$/);
    const advanced = aside.slice(aside.indexOf('<details'), aside.indexOf('</details>'));
    for (const handler of ['handleYMinChange', 'handleYMaxChange', 'handleBandwidthChange', 'handleRangeMinChange', 'handleRangeMaxChange']) {
        assert.match(advanced, new RegExp(`oninput=\\{${handler}\\}`), `${handler} should stay wired inside Advanced`);
    }
    assert.match(advanced, /\{advancedSetCount\} set/);

    // In the news follows the chart rather than pushing it down.
    const chart = markup.indexOf('<TrajectoryChart');
    const chartEnd = markup.indexOf('</section>', chart);
    const news = markup.indexOf('<div class="trajectory-news">');
    assert.ok(chart !== -1 && chartEnd < news, 'In the news should sit below the chart section');
    assert.ok(news < markup.indexOf('trajectory-stat-strip'), 'In the news should stay above the summary tiles');

    // On phones the closed toggle ends the card without a trailing gap.
    const tabletBlock = extractMediaBlocks(contents, TARGET_FILE).find((block) =>
        /@media\s*\(\s*max-width:\s*980px\s*\)/.test(block)
    );
    assert.match(tabletBlock, /\.chart-options:not\(\.open\)\s*\{\s*display:\s*none;/);
    assert.match(tabletBlock, /\.chart-options\.open\s*\{\s*margin-top:\s*14px;/);
    assert.doesNotMatch(tabletBlock, /\.chart-options-toggle\s*\{[^}]*margin-bottom/);
});
