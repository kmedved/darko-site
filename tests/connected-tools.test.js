import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
	cleanRanges,
	filterChips,
	leaderboardSearchParams,
	matchesRanges,
	RANGE_FILTERS,
	rangeLabel,
	readLeaderboardState
} from '../src/lib/utils/leaderboardState.js';
import { columnGroupCells, COLUMN_SETS, leaderboardTableColumns } from '../src/lib/utils/leaderboardColumns.js';
import { AGE_GROUPS, POSITION_GROUPS } from '../src/lib/utils/leaderboardViews.js';
import { seasonRows } from '../src/lib/utils/playerSeasons.js';
import { latestDate } from '../src/lib/utils/timeMachine.js';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');
const OPTIONS = {
	teams: ['Denver Nuggets', 'Boston Celtics'],
	positions: POSITION_GROUPS.map((group) => group.key),
	ages: AGE_GROUPS.map((group) => group.key),
	dists: ['dpm', 'x_fg3_pct'],
	columnSets: COLUMN_SETS.map((set) => set.key)
};

test('a leaderboard URL reads back into the question it asks, unknowns falling back', () => {
	const params = new URLSearchParams(
		'team=den&pos=guards&age=u24&watch=1&q=jok&sort=x_minutes&dir=asc&dist=x_fg3_pct&cols=shooting&dpm_min=2&age_max=25&asof=2025-01-01'
	);
	assert.deepEqual(readLeaderboardState(params, OPTIONS), {
		team: 'Denver Nuggets',
		position: 'guards',
		age: 'u24',
		watch: true,
		q: 'jok',
		sort: 'x_minutes',
		dir: 'asc',
		dist: 'x_fg3_pct',
		cols: 'shooting',
		ranges: { age: { min: null, max: 25 }, dpm: { min: 2, max: null } }
	});

	const junk = readLeaderboardState(new URLSearchParams('team=XYZ&pos=wings&dist=nope&cols=everything&sort=1;drop&dir=up&dpm_min=abc'), OPTIONS);
	assert.deepEqual(
		[junk.team, junk.position, junk.dist, junk.cols, junk.sort, junk.dir, junk.ranges],
		['all', 'all', 'dpm', 'all', 'dpm', 'desc', {}]
	);
});

test('the question writes to the URL without defaults, leaving the page’s own parameters', () => {
	const state = {
		team: 'Denver Nuggets',
		position: 'all',
		age: 'all',
		watch: false,
		q: '  jok ',
		sort: 'dpm',
		dir: 'desc',
		dist: 'dpm',
		cols: 'impact',
		ranges: { mpg: { min: 25, max: null }, off: { min: null, max: null } }
	};
	const params = leaderboardSearchParams(state, 'asof=2025-01-01&team=BOS&pos=centers');
	assert.equal(params.toString(), 'asof=2025-01-01&team=DEN&q=jok&cols=impact&mpg_min=25');
	// Read back, it is the same question.
	const again = readLeaderboardState(params, OPTIONS);
	assert.deepEqual([again.team, again.q, again.cols, again.ranges], ['Denver Nuggets', 'jok', 'impact', { mpg: { min: 25, max: null } }]);
	assert.equal(leaderboardSearchParams({ ...state, team: 'all', q: '', cols: 'all', ranges: {} }).toString(), '');
});

test('stat ranges keep players inside every bound, counting ages in whole years', () => {
	const ranges = cleanRanges({ age: { min: null, max: 24 }, dpm: { min: 1, max: 5 }, def: { min: '', max: null } });
	assert.deepEqual(Object.keys(ranges), ['age', 'dpm']);
	assert.ok(matchesRanges({ age: 24.9, dpm: 3 }, ranges), '24.9 is 24');
	assert.ok(!matchesRanges({ age: 25.1, dpm: 3 }, ranges));
	assert.ok(!matchesRanges({ age: 22, dpm: 5.5 }, ranges));
	assert.ok(!matchesRanges({ age: 22, dpm: null }, ranges), 'without the stat, outside the range');
	assert.ok(matchesRanges({ age: 30 }, {}), 'no ranges keep everyone');
	assert.equal(RANGE_FILTERS.map((filter) => filter.field).join(','), 'age,x_minutes,dpm,o_dpm,d_dpm');
});

test('each filter in force is a chip, labelled as a reader would say it', () => {
	const dpm = RANGE_FILTERS.find((filter) => filter.key === 'dpm');
	assert.equal(rangeLabel(dpm, { min: 2, max: null }), 'DPM ≥ +2');
	assert.equal(rangeLabel(dpm, { min: -1, max: 3 }), 'DPM -1 to +3');
	assert.equal(rangeLabel(RANGE_FILTERS[1], { min: null, max: 30 }), 'MPG ≤ 30');
	const chips = filterChips(
		{ team: 'Denver Nuggets', position: 'guards', age: 'u24', watch: true, q: 'jok', ranges: { dpm: { min: 2, max: null } } },
		{ positions: POSITION_GROUPS, ages: AGE_GROUPS }
	);
	assert.deepEqual(
		chips.map((chip) => `${chip.key}:${chip.label}`),
		['team:DEN', 'position:Guards', 'age:Under 24', 'watch:Watchlist', 'q:“jok”', 'range:dpm:DPM ≥ +2']
	);
	assert.deepEqual(filterChips({ team: 'all', position: 'all', age: 'all', watch: false, q: '', ranges: {} }), []);
});

test('column sets keep the player and DPM, and group headings span their columns', () => {
	const keys = (columns) => columns.map((column) => column.key);
	assert.deepEqual(keys(leaderboardTableColumns({ set: 'shooting' })), ['_rank', 'player_name', 'team_name', 'dpm', 'x_pts_100', 'x_fg_pct', 'x_fg3_pct', 'x_ft_pct']);
	// The sparkline and the Time Machine's columns stay with DPM in every set.
	assert.deepEqual(keys(leaderboardTableColumns({ set: 'value', trends: true, asOf: true })).slice(3, 7), ['dpm', '_trend', 'now_dpm', 'since_dpm']);
	assert.equal(leaderboardTableColumns({ set: 'unknown' }).length, leaderboardTableColumns().length);

	const cells = columnGroupCells(leaderboardTableColumns({ set: 'impact' }));
	assert.deepEqual(
		cells.map((cell) => `${cell.label || '-'}:${cell.span}:${cell.alignClass}`),
		['-:1:rank', '-:1:name', '-:1:team', 'Impact:5:group', 'Role:1:group']
	);
	const all = columnGroupCells(leaderboardTableColumns());
	assert.deepEqual(all.filter((cell) => cell.label).map((cell) => cell.label), ['Impact', 'Role', 'Per 100', 'Shooting', 'Value']);
	assert.equal(all.reduce((sum, cell) => sum + cell.span, 0), leaderboardTableColumns().length);
});

test('ratings dates: the latest among rows, and each season’s last game day', () => {
	assert.equal(latestDate([{ date: '2026-07-20' }, { date: '2026-07-26T00:00:00' }, { date: null }, {}]), '2026-07-26');
	assert.equal(latestDate([]), null);
	const rows = seasonRows([{ season: 2025, date: '2025-04-13', tm_id: 1610612743, games: 70, dpm: 7.1, o_dpm: 5 }]);
	assert.equal(rows[0].date, '2025-04-13');
	assert.equal(seasonRows([{ season: 2025, date: 'x', dpm: 1 }])[0].date, null);
});

test('the leaderboard keeps its question in the URL, with Modern-only tools and a picking tray', async () => {
	const [board, server] = await Promise.all([read('src/routes/+page.svelte'), read('src/routes/+page.server.js')]);
	// Written in place a moment after a change, and never after the reader has left.
	assert.match(board, /applyUrlState\(\$page\.url\.searchParams\);/);
	assert.match(board, /goto\(href, \{ replaceState: true, keepFocus: true, noScroll: true \}\), 300\)/);
	assert.match(board, /beforeNavigate\(\(\{ to \}\) => \{\s*if \(to\?\.url\.pathname !== \$page\.url\.pathname\) clearTimeout\(urlSyncTimer\);/);
	assert.match(board, /if \(\(type === 'link' \|\| type === 'popstate'\) && to\?\.url\.pathname === '\/'\) applyUrlState\(to\.url\.searchParams\);/);
	// The ranges and column sets are the Modern view's; Shiny keeps every column and its own filters.
	assert.match(board, /const activeRanges = \$derived\(isShinyView \? \{\} : cleanRanges\(ranges\)\);/);
	assert.match(board, /set: isShinyView \? 'all' : columnSet/);
	assert.match(board, /:global\(:root\[data-view='shiny'\]\) \.modern-only \{\s*display: none;/);
	// The group row is a sizing row with set heights, so the sticky header's sum can't feed itself.
	assert.match(board, /<tr class="group-row table-sizing-row">/);
	assert.match(board, /\.grouped \.group-row th \{\s*height: 22px;/);
	assert.match(board, /\.grouped \.header-row th \{\s*height: 40px;/);
	// Up to four picks go on together.
	assert.match(board, /href="\/compare\?ids=\{pickedIds\}"/);
	assert.match(board, /href="\/trajectories\?ids=\{pickedIds\}"/);
	assert.match(board, /href="\/scatterplot\?ids=\{pickedIds\}"/);
	assert.match(board, /disabled=\{!isPicked\(player\) && picked\.length >= MAX_PICKS\}/);
	// Today's board says how fresh it is.
	assert.match(server, /ratingsThrough: asOf \|\| selectedSeason !== null \? null : latestDate\(snapshot\)/);
	assert.match(board, /Ratings through \{formatAsOfDate\(data\.ratingsThrough\)\}\./);
});

test('the Scatterplot, Compare, player and team pages take the handoffs', async () => {
	const [scatter, chart, compare, player, seasons, team] = await Promise.all([
		read('src/routes/scatterplot/+page.svelte'),
		read('src/lib/components/ScatterplotChart.svelte'),
		read('src/routes/compare/+page.svelte'),
		read('src/routes/player/[nbaId]/+page.svelte'),
		read('src/lib/components/SeasonBySeason.svelte'),
		read('src/lib/components/TeamDetailView.svelte')
	]);
	assert.match(scatter, /put\('ids', highlightIds\.join\(','\), ''\);/);
	assert.match(scatter, /highlight=\{highlightIds\}/);
	assert.match(chart, /highlighted\.size > 0 && !isHighlighted\(d\) \? 0\.22/);
	assert.match(compare, /\{#if selectedPlayers\.length === 2\}\s*<HeadToHead/);
	assert.match(compare, /const careersHref = \$derived\(`\/trajectories\?ids=\$\{excludeIds\.join\(','\)\}`\);/);
	// The section links stay in view (Modern), marking the section being read.
	assert.match(player, /\.profile-jump \{\s*position: sticky;\s*top: var\(--nav-sticky-offset, 64px\);/);
	assert.match(player, /aria-current=\{activeSection === section\.id \? 'location' : undefined\}/);
	assert.match(player, /:global\(:root\[data-view='shiny'\]\) \.profile-jump \{\s*position: static;/);
	assert.match(player, /Rated through \{currentDate\}/);
	assert.match(seasons, /return row\.date \? `\/\?\$\{AS_OF_PARAM\}=\$\{row\.date\}` : null;/);
	assert.match(team, /Ratings through \{formatAsOfDate\(ratingsThrough, \{ short: true \}\)\}/);
});
