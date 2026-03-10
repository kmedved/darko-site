import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const TARGET_FILES = [
    'src/lib/components/TalentPercentilesChart.svelte',
    'src/lib/components/TalentTrendChart.svelte',
    'src/routes/trajectories/+page.svelte'
];
const METRIC_TOOLTIP_FILE = 'src/lib/components/MetricTooltip.svelte';

const LITERAL_BRACE_ARIA_LABEL = /aria-label="\{[^"]+\}[^"]*"/g;


test('targeted aria-label bindings should not use quoted brace interpolation', async () => {
    for (const file of TARGET_FILES) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');
        const matches = contents.match(LITERAL_BRACE_ARIA_LABEL);

        assert.equal(matches, null, `${file} should use expression bindings for aria-label`);
    }
});

test('MetricTooltip uses the stat label as the only visible trigger', async () => {
    const absolutePath = path.resolve(process.cwd(), METRIC_TOOLTIP_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');

    assert.match(contents, /class="metric-tooltip-trigger"/);
    assert.match(contents, /class="metric-tooltip-label"/);
    assert.doesNotMatch(contents, />\s*\?\s*</);
});

test('MetricTooltip preserves hover, focus, touch, and keyboard interaction hooks', async () => {
    const absolutePath = path.resolve(process.cwd(), METRIC_TOOLTIP_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');

    assert.match(contents, /onmouseenter=\{openTooltip\}/);
    assert.match(contents, /onmouseleave=\{closeTooltip\}/);
    assert.match(contents, /onfocusin=\{openTooltip\}/);
    assert.match(contents, /onfocusout=\{handleFocusOut\}/);
    assert.match(contents, /onpointerdown=\{handleTriggerPointerDown\}/);
    assert.match(contents, /onclick=\{handleTriggerClick\}/);
    assert.match(contents, /onkeydown=\{handleKeydown\}/);
    assert.match(contents, /event\.stopPropagation\(\)/);
    assert.match(contents, /pointerType === 'touch' \|\| pointerType === 'pen'/);
});
