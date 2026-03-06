import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    ARCHITECTURE_DOC_PATH,
    ARCHITECTURE_SYNC_PATH,
    BUNDLE_DEFINITIONS,
    FILE_INDEX_PATH,
    START_HERE_PATH,
    WHERE_TO_EDIT_ROWS,
    buildBundleOutputs,
    buildSyncArtifact,
    countTokens,
    getFileInventory,
    getPackageVersion,
    renderArchitectureDoc,
    renderFileIndex,
    renderStartHere
} from '../scripts/context-framework.js';

const rootDir = process.cwd();

async function readJson(relPath) {
    const contents = await fs.readFile(path.join(rootDir, relPath), 'utf8');
    return JSON.parse(contents);
}

async function readText(relPath) {
    return fs.readFile(path.join(rootDir, relPath), 'utf8');
}

test('context sync version matches package.json and architecture doc header', async () => {
    const [packageVersion, syncArtifact, architectureDoc] = await Promise.all([
        getPackageVersion(rootDir),
        readJson(ARCHITECTURE_SYNC_PATH),
        readText(ARCHITECTURE_DOC_PATH)
    ]);

    assert.equal(syncArtifact.arch_version, packageVersion);
    assert.match(
        architectureDoc,
        new RegExp(`^Architecture sync version: ${packageVersion.replace(/\./g, '\\.')}$`, 'm')
    );
});

test('context sync file inventory matches the scoped filesystem walk', async () => {
    const [expectedInventory, syncArtifact] = await Promise.all([
        getFileInventory(rootDir),
        readJson(ARCHITECTURE_SYNC_PATH)
    ]);

    assert.deepEqual(syncArtifact.file_inventory, expectedInventory);
});

test('context sync behavior snapshot matches live source extraction', async () => {
    const [expectedSyncArtifact, actualSyncArtifact] = await Promise.all([
        buildSyncArtifact(rootDir),
        readJson(ARCHITECTURE_SYNC_PATH)
    ]);

    assert.deepEqual(actualSyncArtifact.behavior_snapshot, expectedSyncArtifact.behavior_snapshot);
});

test('context sync module dependency map matches live import analysis', async () => {
    const [expectedSyncArtifact, actualSyncArtifact] = await Promise.all([
        buildSyncArtifact(rootDir),
        readJson(ARCHITECTURE_SYNC_PATH)
    ]);

    assert.deepEqual(actualSyncArtifact.module_dependencies, expectedSyncArtifact.module_dependencies);
});

test('context sync public contracts match live export and route inspection', async () => {
    const [expectedSyncArtifact, actualSyncArtifact] = await Promise.all([
        buildSyncArtifact(rootDir),
        readJson(ARCHITECTURE_SYNC_PATH)
    ]);

    assert.deepEqual(actualSyncArtifact.public_contracts, expectedSyncArtifact.public_contracts);
});

test('architecture doc matches the renderer and keeps required headings', async () => {
    const [syncArtifact, architectureDoc] = await Promise.all([
        readJson(ARCHITECTURE_SYNC_PATH),
        readText(ARCHITECTURE_DOC_PATH)
    ]);
    const rendered = renderArchitectureDoc(syncArtifact);

    assert.equal(architectureDoc, rendered);

    for (const heading of [
        '## TL;DR',
        '## Behavior / Routing Matrix',
        '### Critical Invariants',
        '### Conventions',
        '## Public Contract Snapshot',
        '## Core Abstractions',
        '## Module Dependency Map',
        '## Where To Edit',
        '## Bundle Picker'
    ]) {
        assert.match(architectureDoc, new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
    }
});

test('architecture doc stays within the 4000-token ceiling under o200k_base', async () => {
    const architectureDoc = await readText(ARCHITECTURE_DOC_PATH);
    assert.ok(
        countTokens(architectureDoc) <= 4000,
        `REPO_ARCHITECTURE.md should stay under 4000 tokens, found ${countTokens(architectureDoc)}`
    );
});

test('bundle contract covers every where-to-edit task exactly once', async () => {
    const syncArtifact = await readJson(ARCHITECTURE_SYNC_PATH);
    const declaredBundles = new Set(syncArtifact.bundle_contract.bundles.map((bundle) => bundle.name));
    const coverageCounts = new Map(WHERE_TO_EDIT_ROWS.map((row) => [row.task, 0]));

    for (const definition of BUNDLE_DEFINITIONS) {
        for (const task of definition.taskAreas) {
            coverageCounts.set(task, (coverageCounts.get(task) || 0) + 1);
        }

        assert.ok(declaredBundles.has(definition.name), `Missing bundle contract entry for ${definition.name}`);
    }

    for (const row of WHERE_TO_EDIT_ROWS) {
        assert.equal(
            coverageCounts.get(row.task),
            1,
            `Expected bundle coverage count of 1 for "${row.task}"`
        );
        assert.ok(
            declaredBundles.has(row.primaryBundle),
            `Expected primary bundle ${row.primaryBundle} to be declared`
        );
    }

    assert.ok(
        declaredBundles.has(syncArtifact.bundle_contract.default_bundle),
        'Expected default bundle to be declared in bundle_contract'
    );
});

test('file index matches the generator output', async () => {
    const [actual, expected] = await Promise.all([
        readText(FILE_INDEX_PATH),
        renderFileIndex(rootDir)
    ]);

    assert.equal(actual, expected);
});

test('start-here guide exists and matches the renderer', async () => {
    const [syncArtifact, actual] = await Promise.all([
        readJson(ARCHITECTURE_SYNC_PATH),
        readText(START_HERE_PATH)
    ]);
    const expected = renderStartHere(syncArtifact.bundle_contract.default_bundle);

    assert.equal(actual, expected);
    assert.match(actual, /Default:/);
    assert.match(actual, /Oracle:/);
    assert.match(actual, /raw source/);
});

test('bundle outputs use stable names and required usage banners', async () => {
    const outputs = await buildBundleOutputs(rootDir);
    const names = outputs.splitBundles.map((bundle) => bundle.name);

    assert.deepEqual(
        names,
        BUNDLE_DEFINITIONS.map((bundle) => bundle.name)
    );

    for (const bundle of outputs.splitBundles) {
        assert.match(bundle.content, /^# COMPRESSED_/m);
        assert.match(bundle.content, /Use this for /);
        assert.match(bundle.content, /Pair with `context\/REPO_ARCHITECTURE\.md`\./);
        assert.match(bundle.content, /raw source/);
    }
});
