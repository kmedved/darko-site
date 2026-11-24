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

test('standings shows win ranges for the toggled conference while the simulation runs', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), STANDINGS_PAGE), 'utf8');

    // Hidden for a finished season and whenever the league set failed its check (null).
    assert.match(contents, /\{#if !seasonComplete && data\.winDistributions\}/);
    assert.match(contents, /<WinRangesChart teams=\{standings\} distributions=\{data\.winDistributions\} \/>/);
});

test('standings cut lines follow the projected order only', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), STANDINGS_PAGE), 'utf8');

    // Sorted by anything else, or searched, rows 6 and 10 are no longer the cutoffs.
    assert.match(
        contents,
        /const showCutLines = \$derived\(!seasonComplete && sortColumn === 'Rk' && sortDirection === 'asc' && !teamSearch\.trim\(\)\);/
    );
    assert.match(contents, /<tr class:cut-line=\{showCutLines && \[6, 10\]\.includes\(Number\(team\.Rk\)\)\}>/);
});
