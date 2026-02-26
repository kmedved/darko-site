import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const routeWrappers = [
    'src/routes/team/[team]/+page.svelte',
    'src/routes/standings/[slug]/+page.svelte'
];


test('team route wrappers are thin and use shared TeamDetailView', async () => {
    for (const file of routeWrappers) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');

        assert.match(contents, /TeamDetailView/, `${file} should render TeamDetailView`);
        assert.match(contents, /<TeamDetailView /, `${file} should include TeamDetailView tag`);
    }
});
