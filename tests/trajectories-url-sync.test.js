import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const TARGET_FILE = 'src/routes/trajectories/+page.svelte';

test('trajectories URL sync waits until initial player loads finish', async () => {
    const absolutePath = path.resolve(process.cwd(), TARGET_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');
    const syncEffect = contents.match(
        /\/\/ Sync selected player IDs to URL\s*\n\s*\$effect\(\(\) => \{[\s\S]*?\n\s*\}\);/
    );

    assert.ok(syncEffect, `${TARGET_FILE} should define a URL sync effect`);
    assert.match(
        syncEffect[0],
        /if\s*\(\s*!initialLoadDone\s*\|\|\s*loading\s*\)\s*return;/,
        'URL sync should not erase ids while preload or random load is still pending'
    );
});
