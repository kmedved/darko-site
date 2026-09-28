import test from 'node:test';
import assert from 'node:assert/strict';

import { csvText } from '../src/lib/utils/csv.js';
import { formatFractionAsPercent, formatNullable, formatSignedMetric } from '../src/lib/utils/csvPresets.js';

test("CSV columns format each value alone, so the formatters' own options stand", () => {
    const text = csvText({
        rows: [{ dpm: 6.7612, wl: 0.7805, note: null }],
        columns: [
            { header: 'DPM', accessor: 'dpm', format: formatSignedMetric },
            { header: 'W/L%', accessor: 'wl', format: formatFractionAsPercent },
            { header: 'Note', accessor: 'note', format: formatNullable }
        ]
    });
    const [header, row] = text.replace('﻿', '').split('\r\n');
    assert.equal(header, 'DPM,W/L%,Note');
    // One decimal, as on the page: the row used to arrive as `decimals` and round to "+7".
    // W/L% keeps its decimal too (the % is in the header).
    assert.deepEqual(row.split(','), ['+6.8', '78.0', '—']);
});
