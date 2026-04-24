import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const STANDINGS_PAGE = 'src/routes/standings/+page.svelte';

test('standings percent formatter does not append percent signs to missing values', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), STANDINGS_PAGE), 'utf8');
    const formatter = contents.match(/function\s+formatPercent\(value\)\s*\{[\s\S]*?\n\s*\}/);

    assert.ok(formatter, 'standings page should define a local percent formatter');
    assert.match(formatter[0], /formatted\s*===\s*'—'\s*\?\s*formatted/, 'missing percent values should stay as a dash');
});

test('standings playoff lock summary icon uses visible lock geometry', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), STANDINGS_PAGE), 'utf8');
    const lockBlock = contents.match(/\.summary-lock\s*\{[\s\S]*?\n\s*\}/);

    assert.ok(lockBlock, 'standings page should style the playoff lock summary icon');
    assert.doesNotMatch(lockBlock[0], /clip-path/, 'playoff lock icon should not depend on clipped border geometry');
    assert.match(contents, /\.summary-lock::before/, 'playoff lock icon should draw a shackle');
    assert.match(contents, /\.summary-lock::after[\s\S]*background:\s*currentColor;/, 'playoff lock icon should draw a visible body');
});
