import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { easternDate, MAX_NEWS_PLAYERS, newsPlayers } from '../src/lib/utils/trending.js';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

const FILE = {
	date: '2026-09-28',
	players: [
		{ nba_id: 2544, name: 'LeBron James', reason: 'First 76ers Media Day' },
		{ nba_id: 1631105, name: 'Jalen Duren', reason: 'Misses Pistons Media Day' }
	]
};

test('dates are read in US Eastern time', () => {
	assert.equal(easternDate(new Date('2026-09-28T12:00:00Z')), '2026-09-28');
	// 11:30 p.m. Eastern is already the next day in UTC.
	assert.equal(easternDate(new Date('2026-09-29T03:30:00Z')), '2026-09-28');
	assert.equal(easternDate(new Date('2027-01-15T04:59:00Z')), '2027-01-14');
});

test('the players in the news hold through the next day, then drop', () => {
	const ids = (now) => newsPlayers(FILE, new Date(now)).map((player) => player.nbaId);
	assert.deepEqual(ids('2026-09-28T13:00:00Z'), [2544, 1631105]);
	assert.deepEqual(ids('2026-09-30T03:59:00Z'), [2544, 1631105]); // Sep 29, 11:59 p.m. Eastern
	assert.deepEqual(ids('2026-09-30T04:00:00Z'), []);
	// A file dated in UTC can run a day ahead of Eastern time.
	assert.deepEqual(ids('2026-09-27T12:00:00Z'), [2544, 1631105]);
	assert.deepEqual(ids('2026-09-26T12:00:00Z'), []);
	assert.deepEqual(newsPlayers(FILE, new Date('2026-09-28T13:00:00Z'))[0], {
		nbaId: 2544,
		label: 'LeBron James',
		detail: 'First 76ers Media Day'
	});
});

test('unusable files and entries are skipped', () => {
	const now = new Date('2026-09-28T13:00:00Z');
	assert.deepEqual(newsPlayers(null, now), []);
	assert.deepEqual(newsPlayers({ date: 'Sept 28', players: FILE.players }, now), []);
	assert.deepEqual(newsPlayers({ date: '2026-09-28' }, now), []);

	const players = newsPlayers(
		{
			date: '2026-09-28',
			players: [
				{ nba_id: '2544', name: ' LeBron James ', reason: 7 },
				{ nba_id: 2544, name: 'LeBron James' },
				{ nba_id: 0, name: 'Nobody' },
				{ nba_id: 12.5, name: 'Half' },
				{ nba_id: 203507 },
				null,
				...[201939, 202695, 1630169, 1628983, 203999].map((id) => ({ nba_id: id, name: `Player ${id}` }))
			]
		},
		now
	);
	assert.equal(players.length, MAX_NEWS_PLAYERS);
	assert.deepEqual(players[0], { nbaId: 2544, label: 'LeBron James', detail: '' });
	assert.deepEqual(
		players.map((player) => player.nbaId),
		[2544, 201939, 202695, 1630169, 1628983]
	);
});

test('the committed file has the shape the automation writes', async () => {
	const file = JSON.parse(await read('src/lib/data/trending.json'));
	assert.match(file.date, /^\d{4}-\d{2}-\d{2}$/);
	assert.ok(Array.isArray(file.players));
	for (const player of file.players) {
		assert.ok(Number.isInteger(player.nba_id) && player.nba_id > 0, `bad nba_id ${player.nba_id}`);
		assert.equal(typeof player.name, 'string');
	}
});

test('Career Trajectories opens on a player in the news while the file is current', async () => {
	const [page, load] = await Promise.all([
		read('src/routes/trajectories/+page.svelte'),
		read('src/routes/trajectories/+page.server.js')
	]);
	assert.match(load, /import trending from '\$lib\/data\/trending\.json';/);
	assert.match(load, /newsPlayers: newsPlayers\(trending\)/);

	// A shared link's players come first, then the players in the news, then anyone active.
	assert.match(
		page,
		/if \(ids\) \{[\s\S]*?\} else if \(newsPlayers\.length > 0\) \{[\s\S]*?preloadPlayersById\(newsPlayers\.map\(\(player\) => player\.nbaId\), initialKind\);\s*\} else \{\s*loadRandomPlayer\(initialKind\);/
	);
	// Over the chart, why each of them is in the news, beside a dot in their line's color.
	assert.match(page, /\{#each newsNotes as note \(note\.nba_id\)\}\s*<li style:--player-color=\{note\.color\}><span>\{note\.name\}<\/span> \{note\.detail\}<\/li>/);
	assert.match(page, /const color = linkedColors\[player\.nba_id\] \|\| getSeriesColor\(index, displayMode\.view\);/);
});

test("the trajectory chart's legend wraps rather than running off a phone", async () => {
	const chart = await read('src/lib/components/TrajectoryChart.svelte');
	assert.match(chart, /if \(row && row\.width \+ itemWidth - 10 <= width - 20\) \{/);
	assert.match(chart, /top: baseMargin\.top \+ Math\.max\(legendRows\.length - 1, 0\) \* legendRowHeight/);
	assert.match(chart, /translate\(\$\{width \/ 2\}, \$\{chartTheme\.legendY \+ rowIndex \* legendRowHeight\}\)/);
});
