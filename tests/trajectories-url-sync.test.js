import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const TARGET_FILE = 'src/routes/trajectories/+page.svelte';

test('trajectories URL sync waits until initial player loads finish', async () => {
    const absolutePath = path.resolve(process.cwd(), TARGET_FILE);
    const contents = await fs.readFile(absolutePath, 'utf8');
    const syncEffect = contents.match(
        /\/\/ Sync selected player IDs and chart controls to URL\s*\n\s*\$effect\(\(\) => \{[\s\S]*?\n\s*\}\);/
    );

    assert.ok(syncEffect, `${TARGET_FILE} should define a URL sync effect`);
    assert.match(
        syncEffect[0],
        /if\s*\(\s*!initialLoadDone\s*\|\|\s*loading\s*\)\s*return;/,
        'URL sync should not erase ids while preload or random load is still pending'
    );
});

test('trajectories restores and serializes metric and scale URL state', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), TARGET_FILE), 'utf8');

    assert.match(contents, /searchParams\.get\('metric'\)/);
    assert.match(contents, /searchParams\.get\('scale'\)/);
    assert.match(contents, /talentTypes\.some\(\(option\) => option\.key === requestedMetric\)/);
    assert.match(contents, /timeScaleOptions\.some\(\(option\) => option\.key === requestedScale\)/);
    assert.match(contents, /url\.searchParams\.set\('metric', desiredMetric\)/);
    assert.match(contents, /url\.searchParams\.set\('scale', desiredScale\)/);
    assert.match(contents, /WOWY_METRICS\.has\(talentType\) \? 'wowy' : 'darko'/);
});

test('direct-linked players resolve names from targeted history without loading the full index', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), TARGET_FILE), 'utf8');

    assert.match(contents, /starterPlayerById\.get\(nbaId\)\?\.label/);
    assert.match(contents, /player_name: first\?\.player_name \|\| entry\.player_name/);
    assert.match(contents, /uniqueIds\.map\(\(nbaId\) => loadHistory\(nbaId, kind\)\)/);
    assert.doesNotMatch(contents, /apiPlayersIndex|resolveMissingPlayerMetadata/);
});
