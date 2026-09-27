import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { formatFractionAsPercent, standingsExpandedCsvColumns } from '../src/lib/utils/csvPresets.js';

test('standings W/L% is a fraction shown as a percentage, unlike the 0-100 odds columns', () => {
    const winPct = standingsExpandedCsvColumns.find((column) => column.header === 'W/L%');
    assert.equal(winPct.format(0.78), '78.0');
    assert.equal(winPct.format('0.659'), '65.9');
    assert.equal(winPct.format(null), '—');
    const playoffs = standingsExpandedCsvColumns.find((column) => column.header === 'Playoff%');
    assert.equal(playoffs.format(100), '100.0');
    assert.equal(formatFractionAsPercent(1), '100.0');

    const page = readFileSync('src/routes/standings/+page.svelte', 'utf8');
    assert.match(page, /key: 'W\/L%', label: 'W\/L%', alignClass: 'num', dataType: 'percent', fraction: true/);
    assert.match(page, /return formatPercent\(percentValue\(column, value\)\)/);
    assert.doesNotMatch(page, /key: 'Playoffs'[^\n]*fraction: true/);
});
