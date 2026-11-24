import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const RATE_PAGE = 'src/routes/rate/+page.svelte';
const ASK_DARKO = 'src/lib/components/AskDarko.svelte';

async function read(file) {
    return fs.readFile(path.resolve(process.cwd(), file), 'utf8');
}

test('Rate a Player votes with the arrow keys and skips with S', async () => {
    const page = await read(RATE_PAGE);
    const handler = page.match(/function handleVoteKey\(event\) \{([\s\S]*?)\n    \}\n/);

    assert.ok(handler, 'the page should define one key handler');
    assert.match(page, /<svelte:window onkeydown=\{handleVoteKey\} \/>/);
    assert.match(handler[1], /key === 'arrowleft'[\s\S]*?vote\(pair\[0\]\.nba_id\)/);
    assert.match(handler[1], /key === 'arrowright'[\s\S]*?vote\(pair\[1\]\.nba_id\)/);
    // S, not Space: Space presses a focused button and scrolls the page.
    assert.match(handler[1], /key === 's'[\s\S]*?skip\(\)/);
    assert.doesNotMatch(handler[1], /' '|'Space'|'Spacebar'/);
});

test('the Rate keys stay out of the way of typing, shortcuts, Ask DARKO and pending votes', async () => {
    const [page, ask] = await Promise.all([read(RATE_PAGE), read(ASK_DARKO)]);
    const handler = page.match(/function handleVoteKey\(event\) \{([\s\S]*?)\n    \}\n/)[1];

    assert.match(handler, /event\.defaultPrevented \|\| event\.repeat/);
    assert.match(handler, /event\.metaKey \|\| event\.ctrlKey \|\| event\.altKey \|\| event\.shiftKey/);
    // A skip keeps the old pair until the new one arrives, so loading blocks votes as well as voting.
    assert.match(handler, /if \(voting \|\| loading \|\| pair\.length !== 2\) return;/);
    assert.match(handler, /target\.isContentEditable \|\| \/\^\(INPUT\|TEXTAREA\|SELECT\)\$\/\.test\(target\.tagName\)/);
    // Ask DARKO marks the page while its palette is open.
    assert.match(handler, /document\.documentElement\.classList\.contains\('ask-open'\)/);
    assert.match(ask, /document\.documentElement\.classList\.add\('ask-open'\)/);
    assert.match(ask, /document\.documentElement\.classList\.remove\('ask-open'\)/);
    // Each handled key stops its default only when it acts.
    assert.equal((handler.match(/event\.preventDefault\(\);/g) ?? []).length, 3);
});

test('the Rate page shows the keys, except where there is no keyboard', async () => {
    const page = await read(RATE_PAGE);

    assert.match(page, /<p class="rate-keys"><kbd>←<\/kbd> <kbd>→<\/kbd> to vote · <kbd>S<\/kbd> to skip<\/p>/);
    assert.match(page, /@media \(hover: none\)\s*\{\s*\.rate-keys\s*\{\s*display:\s*none;/);
});
