import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

test('team detail page loaders delegate to the shared team page helper', async () => {
    const loaderFiles = [
        'src/routes/team/[team]/+page.server.js',
        'src/routes/standings/[slug]/+page.server.js'
    ];

    for (const file of loaderFiles) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');

        assert.match(contents, /loadTeamPageData/, `${file} should use the shared load helper`);
    }
});

test('team detail API route reuses the shared team payload helper and cache helper', async () => {
    const file = path.resolve(process.cwd(), 'src/routes/api/standings/[slug]/+server.js');
    const contents = await fs.readFile(file, 'utf8');

    assert.match(contents, /getTeamPagePayload/, 'API route should reuse the shared team payload helper');
    assert.match(contents, /setTeamPageCacheHeaders/, 'API route should reuse the shared cache helper');
});
