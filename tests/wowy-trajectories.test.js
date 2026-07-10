import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';


const PAGE = 'src/routes/trajectories/+page.svelte';
const CHART = 'src/lib/components/TrajectoryChart.svelte';
const SERVER = 'src/lib/server/supabase.js';


test('Trajectories exposes all three WOWY metrics and keeps histories separate', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), PAGE), 'utf8');
    for (const [key, label] of [
        ['wowy_rapm', 'WOWY RAPM'],
        ['wowy_orapm', 'WOWY O-RAPM'],
        ['wowy_drapm', 'WOWY D-RAPM']
    ]) {
        assert.match(contents, new RegExp(`key: '${key}', label: '${label}'`));
    }
    assert.match(contents, /wowyRows:\s*\[\]/);
    assert.match(contents, /apiWowyPlayerHistory/);
	assert.match(contents, /apiPlayerHistory\(nbaId, \{ full: true, view: 'trajectory' \}\)/);
    assert.match(contents, /isWowyMetric \? computeSeasonXFromEndYear\(rows\) : computeSeasonX\(rows\)/);
	assert.match(
		contents,
		/val = isWowyMetric\s*\? Number\.parseInt\(row\.season, 10\) - 1\s*:\s*getSeasonStartYear\(row\.date\)/
	);
    assert.match(contents, /Data through/);
});

test('TrajectoryChart does not prepend DARKO to WOWY axis labels', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), CHART), 'utf8');
    assert.match(contents, /talentType\.startsWith\('wowy_'\)/);
    assert.match(contents, /\? getMetricDisplayLabel\(talentType\)/);
});

test('WOWY server history paginates invisibly and fails on truncation at the route', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), SERVER), 'utf8');
    const start = contents.indexOf('export async function getWowyPlayerHistory');
    const end = contents.indexOf('/** Get the metadata row', start);
    const block = contents.slice(start, end);
    assert.match(block, /const pageSize = 1_000/);
    assert.match(block, /\.range\(page \* pageSize, \(page \+ 1\) \* pageSize - 1\)/);
    assert.match(block, /\.order\('career_game_num', \{ ascending: true \}\)/);

    const route = await fs.readFile(
        path.resolve(process.cwd(), 'src/routes/api/player/[id]/wowy-history/+server.js'),
        'utf8'
    );
    assert.match(route, /if \(result\.truncated\)/);
});
