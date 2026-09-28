import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

test('the team page explains its rating three ways, with the chart at full width', async () => {
    const view = await read('src/lib/components/TeamDetailView.svelte');
    assert.match(view, /<RatingBreakdown rows=\{contributions\} \{teamName\} \/>/);
    // Core outlook and payroll share the row under it.
    assert.match(view, /<div class="dna-pair">/);
    assert.doesNotMatch(view, /dna-grid|WATERFALL_VIEWS/);

    const breakdown = await read('src/lib/components/RatingBreakdown.svelte');
    for (const label of ['Players', 'Build-up', 'Minutes']) assert.match(breakdown, new RegExp(`label: '${label}'`));
    // Offense and defense have their own columns, so the build-up shows the net total only.
    assert.match(breakdown, /ratingWaterfall\(folded, 'total'\)/);
    assert.match(breakdown, /aria-pressed=\{sortKey === column\.key\}/);
    // The deep bench opens to name its players, on touch screens too.
    assert.match(breakdown, /aria-expanded=\{benchOpen\}/);
    assert.match(breakdown, /foldDeepBench\(rows\)/);
    // The above/below-average split counts every player, before the fold.
    assert.match(breakdown, /contributionSummary\(rows\)/);
});

test('each Roster Lab side draws its edited roster on one shared Minutes scale', async () => {
    const lab = await read('src/routes/lab/+page.svelte');
    assert.match(lab, /foldDeepBench\(rosterContributions\(view\.a\.roster, playersById\)\)/);
    assert.match(lab, /foldDeepBench\(rosterContributions\(view\.b\.roster, playersById\)\)/);
    assert.match(lab, /domain=\{minutesDomain\}/);
    // The Lab's roster table already names every player.
    assert.match(lab, /listNarrow=\{false\}/);

    const chart = await read('src/lib/components/MinutesChart.svelte');
    assert.match(chart, /minutesProfile\(rows\)/);
    // Narrow containers turn the chart sideways so names still fit.
    assert.match(chart, /const SIDEWAYS_BELOW = \d+;/);
    // Sideways rows are as thick as their share of the minutes, not their raw minutes.
    assert.match(chart, /sidewaysRows\(profile\.bars\)/);
    assert.doesNotMatch(chart, /bar\.minutes \* PX_PER_MINUTE/);
    // The deep bench can be focused and opened, in the chart and in the list under it, which
    // keeps marks with no name even where the Lab's table names every player.
    assert.match(chart, /this=\{bar\.bench \? 'button' : 'a'\}/);
    assert.match(chart, /tabindex=\{column\.bar\.bench \? 0 : undefined\}/);
    assert.match(chart, /<details class="mc-other mc-bench">/);
    assert.match(chart, /column\.bar\.bench \|\|\s*!column\.name \|\|/);
});
