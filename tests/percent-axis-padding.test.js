import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

test('shooting percentages are padded in points, not whole units', async () => {
    // A 0.5 floor on a fraction padded Curry's FT% axis from 40% to 140% and flattened every line.
    const trend = await read('src/lib/components/TalentTrendChart.svelte');
    assert.match(trend, /Math\.max\(Math\.abs\(yExtent\[1\] - yExtent\[0\]\) \* 0\.1, PERCENT_METRICS\.has\(talentType\) \? 0\.005 : 0\.5\)/);
    const scatter = await read('src/lib/components/ScatterplotChart.svelte');
    assert.match(scatter, /PERCENT_METRICS\.has\(xMetric\) \? 0\.01 : 0\.1/);
    assert.match(scatter, /PERCENT_METRICS\.has\(yMetric\) \? 0\.01 : 0\.1/);
});
