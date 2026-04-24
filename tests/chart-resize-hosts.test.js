import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const CHART_HOSTS = [
    { file: 'src/lib/components/DpmChart.svelte', host: 'containerEl' },
    { file: 'src/lib/components/TrajectoryChart.svelte', host: 'containerEl' },
    { file: 'src/lib/components/TalentTrendChart.svelte', host: 'containerEl' },
    { file: 'src/lib/components/TalentPercentilesChart.svelte', host: 'chartRootEl' },
    { file: 'src/lib/components/ConferenceChart.svelte', host: 'chartRootEl' },
    { file: 'src/lib/components/WinDistChart.svelte', host: 'chartRootEl' },
    { file: 'src/lib/components/SeedChart.svelte', host: 'chartRootEl' },
    { file: 'src/lib/components/LongevityRosterChart.svelte', host: 'chartRootEl' },
    { file: 'src/lib/components/LongevityCareerLengthChart.svelte', host: 'chartRootEl' }
];

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('chart components observe and measure their host element instead of the SVG', async () => {
    for (const { file, host } of CHART_HOSTS) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');
        const escapedHost = escapeRegex(host);

        assert.match(
            contents,
            new RegExp(`let\\s+${escapedHost}\\s*=\\s*\\$state\\(null\\)`),
            `${file} should track ${host} as state`
        );
        assert.match(
            contents,
            new RegExp(`bind:this=\\{${escapedHost}\\}`),
            `${file} should bind ${host} in markup`
        );
        assert.match(
            contents,
            new RegExp(`withResizeObserver\\(\\{[\\s\\S]*element:\\s*${escapedHost}\\b`),
            `${file} should observe ${host} for resize rerenders`
        );
        assert.match(
            contents,
            new RegExp(`const\\s+width\\s*=\\s*${escapedHost}(?:\\?\\.clientWidth|\\.clientWidth)`),
            `${file} should read chart width from ${host}`
        );
        assert.doesNotMatch(
            contents,
            /withResizeObserver\(\{[\s\S]*element:\s*svgEl\b/,
            `${file} should not observe svgEl directly`
        );
        assert.doesNotMatch(
            contents,
            /\bsvgEl\.clientWidth\b/,
            `${file} should not measure width from svgEl`
        );
    }
});

test('career length chart reserves room for its vertical axis label', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), 'src/lib/components/LongevityCareerLengthChart.svelte'), 'utf8');

    assert.match(contents, /left:\s*isMobile\s*\?\s*58\s*:\s*78/, 'career length chart should keep enough left margin for the y-axis label');
    assert.match(contents, /\.attr\('y',\s*isMobile\s*\?\s*-44\s*:\s*-56\)/, 'career length chart should offset the y-axis label inside the SVG viewBox');
});
