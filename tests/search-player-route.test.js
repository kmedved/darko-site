import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROUTE_FILE = 'src/routes/api/search-players/+server.js';

test('player search keeps database failures private and uncached', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), ROUTE_FILE), 'utf8');
    const searchIndex = contents.indexOf('const results = await searchAllPlayers(q)');
    const cacheIndex = contents.indexOf('setEdgeCache(setHeaders', searchIndex);
    const catchIndex = contents.indexOf('} catch (e)', searchIndex);

    assert.ok(searchIndex >= 0 && cacheIndex > searchIndex && catchIndex > cacheIndex);
    assert.match(contents, /console\.error\('player search failed', e\)/);
    assert.match(
        contents,
        /error\(503, 'Player search is temporarily unavailable\. Please try again\.'\)/
    );
    assert.doesNotMatch(contents, /error\(500, e\?\.message/);
});
