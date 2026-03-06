import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CHART_EXPORT_DEFAULT_SCALE,
    CHART_EXPORT_HIDE_SELECTORS,
    normalizeImageFilename
} from '../src/lib/utils/chartImageExport.js';
import { CHART_QUICK_EXPORT_FORMAT } from '../src/lib/utils/chartQuickExport.js';

test('normalizeImageFilename maps png/jpeg extensions and sanitizes filename base', () => {
    assert.equal(
        normalizeImageFilename({ filenameBase: 'Nikola Jokic Talent Trend', format: 'png' }),
        'nikola-jokic-talent-trend.png'
    );

    assert.equal(
        normalizeImageFilename({ filenameBase: 'Nikola Jokic Talent Trend', format: 'jpeg' }),
        'nikola-jokic-talent-trend.jpg'
    );

    assert.equal(
        normalizeImageFilename({ filenameBase: 'Nikola Jokic Talent Trend', format: 'jpg' }),
        'nikola-jokic-talent-trend.jpg'
    );

    assert.equal(
        normalizeImageFilename({ filenameBase: '  @@@', format: 'unknown' }),
        'chart.png'
    );
});

test('chart export helper defaults include hover selectors and 2x scale', () => {
    assert.equal(CHART_EXPORT_DEFAULT_SCALE, 2);
    assert.equal(CHART_QUICK_EXPORT_FORMAT, 'png');

    assert.deepEqual(CHART_EXPORT_HIDE_SELECTORS, [
        '.chart-tooltip',
        '.trend-tooltip',
        '.trajectory-tooltip',
        '.chart-crosshair',
        '.chart-hover-dot'
    ]);
});
