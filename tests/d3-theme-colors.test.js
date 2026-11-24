import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const TARGET_FILES = [
    'src/lib/components/WinDistChart.svelte',
    'src/lib/components/SeedChart.svelte',
    'src/lib/components/ConferenceChart.svelte',
    'src/lib/components/LongevityRosterChart.svelte',
    'src/lib/components/LongevityCareerLengthChart.svelte',
    'src/lib/components/SeismographChart.svelte'
];

const HEX_COLOR = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;


test('D3 components should not hardcode hex color literals', async () => {
    for (const file of TARGET_FILES) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');
        const matches = contents.match(HEX_COLOR);

        assert.equal(matches, null, `${file} should not include hex color values`);
    }
});

test('Simulation bar charts use the series colour, not the reserved good/bad colours', async () => {
    for (const file of ['src/lib/components/WinDistChart.svelte', 'src/lib/components/SeedChart.svelte']) {
        const contents = await fs.readFile(path.resolve(process.cwd(), file), 'utf8');
        assert.match(contents, /getSeriesColor\(0, displayMode\.view\)/, `${file} should colour bars with the series colour`);
        assert.doesNotMatch(contents, /var\(--(?:positive|negative)\)/, `${file} should not use --positive or --negative`);
    }
});
