import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const TARGET_FILES = [
    'src/lib/components/TalentPercentilesChart.svelte',
    'src/lib/components/TalentTrendChart.svelte',
    'src/routes/trajectories/+page.svelte'
];

const LITERAL_BRACE_ARIA_LABEL = /aria-label="\{[^"]+\}[^"]*"/g;


test('targeted aria-label bindings should not use quoted brace interpolation', async () => {
    for (const file of TARGET_FILES) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');
        const matches = contents.match(LITERAL_BRACE_ARIA_LABEL);

        assert.equal(matches, null, `${file} should use expression bindings for aria-label`);
    }
});
