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

test('standings summary uses the shared tiles and explains the playoff-lock count', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), STANDINGS_PAGE), 'utf8');

    assert.match(
        contents,
        /<section class="stat-strip" aria-label=\{seasonComplete \? 'Season leaders' : 'Simulation leaders'\}>/
    );
    assert.match(contents, /<StatTile\b/, 'summary tiles should use the shared StatTile component');
    assert.match(
        contents,
        /caption: `Teams at \$\{PLAYOFF_LOCK_THRESHOLD\}%\+ playoff odds`/,
        'the playoff-lock tile should say what counts as a lock'
    );
    assert.doesNotMatch(contents, /summary-lock|summary-card/, 'the old summary-card markup should be gone');
});
