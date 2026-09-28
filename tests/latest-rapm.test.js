import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { fillLatestRapm, isRapmMetric, staleRapmDate, withLatestRapm } from '../src/lib/utils/latestRapm.js';

test("a current row with no RAPM takes the latest in the player's history, dated", () => {
    const rows = [
        { date: '2026-03-06', bayes_rapm_total: 8.1, bayes_rapm_off: 5.9, bayes_rapm_def: 2.2 },
        { date: '2026-04-01', bayes_rapm_total: null },
        { date: '2026-07-26', bayes_rapm_total: null, dpm: 6.8 }
    ];
    const current = withLatestRapm(rows[2], rows);
    assert.deepEqual(
        [current.bayes_rapm_total, current.bayes_rapm_off, current.bayes_rapm_def, current.bayes_rapm_date, current.dpm],
        [8.1, 5.9, 2.2, '2026-03-06', 6.8]
    );
    assert.equal(staleRapmDate([current]), '2026-03-06');

    // A row with its own RAPM keeps it, dated that day: nothing stale to say.
    const fresh = withLatestRapm(rows[0], rows);
    assert.equal(fresh.bayes_rapm_date, '2026-03-06');
    assert.equal(staleRapmDate([fresh]), null);

    // No RAPM anywhere: left blank.
    assert.equal(withLatestRapm({ date: '2026-07-26' }, [{ date: '2026-07-26' }]).bayes_rapm_total, undefined);
});

test('active players take RAPM from the latest published snapshot', () => {
    const snapshot = {
        date: '2026-03-06',
        byId: new Map([[1, { nba_id: 1, bayes_rapm_total: 3, bayes_rapm_off: 2, bayes_rapm_def: 1 }]])
    };
    const rows = [
        { nba_id: 1, date: '2026-07-26', bayes_rapm_total: null },
        { nba_id: 2, date: '2026-07-26', bayes_rapm_total: null }
    ];
    const [one, two] = fillLatestRapm(rows, snapshot);
    assert.deepEqual([one.bayes_rapm_total, one.bayes_rapm_def, one.bayes_rapm_date], [3, 1, '2026-03-06']);
    assert.equal(two.bayes_rapm_total, null, 'a player missing from the snapshot stays blank');
    assert.equal(staleRapmDate([one, two]), '2026-03-06');
    assert.equal(fillLatestRapm(rows, null), rows, 'no snapshot, no change');
    // Each player's newest RAPM keeps its own date.
    const dated = { ...snapshot, byId: new Map([[1, { nba_id: 1, date: '2026-03-03T00:00:00', bayes_rapm_total: 3 }]]) };
    assert.equal(fillLatestRapm(rows, dated)[0].bayes_rapm_date, '2026-03-03');
    assert.ok(isRapmMetric('bayes_rapm_off') && !isRapmMetric('dpm'));
});

test('every view of current RAPM fills it and says how old it is', async () => {
    const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');
    const server = await read('src/lib/server/supabase.js');
    assert.match(server, /return sortByDpmDesc\(fillLatestRapm\(merged, rapm\)\);/);
    assert.match(server, /fillLatestRapm\(\[latest\], rapm\)/);
    // Best effort: a failed snapshot leaves RAPM blank instead of breaking the leaderboard.
    assert.match(server, /console\.error\('latest RAPM snapshot failed', error\);\s*return null;/);
    assert.match(await read('src/lib/server/comparePage.js'), /withLatestRapm\(withLatestTeam\(rows\.at\(-1\) \?\? \{\}, rows\), rows\)/);
    assert.match(await read('src/lib/components/PlayerCard.svelte'), /staleRapmDate\(\[player\]\)/);
    assert.match(await read('src/routes/scatterplot/+page.svelte'), /RAPM values are each player's latest published, through \{formatAsOfDate\(rapmFrom\)\}\./);

    const player = await read('src/routes/player/[nbaId]/+page.svelte');
    assert.match(player, /RAPM is from \{formatAsOfDate\(percentileRapmFrom\)\}, the latest published\./);
    // A metric with no value is left out rather than drawn at the 0th percentile.
    assert.match(player, /if \(Number\.isNaN\(playerValue\)\) return null;/);
    assert.match(player, /\}\)\.filter\(Boolean\);/);
});
