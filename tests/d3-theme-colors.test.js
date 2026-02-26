import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const TARGET_FILES = [
    'src/lib/components/WinDistChart.svelte',
    'src/lib/components/SeedChart.svelte',
    'src/lib/components/ConferenceChart.svelte'
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
