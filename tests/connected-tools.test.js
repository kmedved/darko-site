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
	readLeaderboardState,
	sameLeaderboardState
} from '../src/lib/utils/leaderboardState.js';
import { columnGroupCells, COLUMN_SETS, leaderboardTableColumns } from '../src/lib/utils/leaderboardColumns.js';
import { AGE_GROUPS, POSITION_GROUPS } from '../src/lib/utils/leaderboardViews.js';
import { seasonBoardHref, seasonRows } from '../src/lib/utils/playerSeasons.js';
import { lastPlayedDate } from '../src/lib/utils/seismograph.js';
import { isIncomingNavigation, keepsPendingState, pathAndSearch } from '../src/lib/utils/urlSync.js';
import { readScatterState, scatterSearch } from '../src/lib/utils/scatterplotState.js';
import { HEAD_TO_HEAD_ROWS, headToHeadRows, snapshotNote } from '../src/lib/utils/headToHead.js';

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

test('freshness: a player is rated through their last game played, and each season links to its own day', () => {
	const rows = [
		{ date: '2026-05-30', tm_id: 1610612759, seconds_played: 2514, future_game: 0 },
		{ date: '2026-06-03', tm_id: 1610612759, seconds_played: 2268, future_game: 0 },
		// The forecast for a game not yet played, and a game sat out, are not games played.
		{ date: '2026-06-05', tm_id: 1610612759, seconds_played: 0, future_game: 1 }
	];
	assert.equal(lastPlayedDate(rows), '2026-06-03');
	assert.equal(lastPlayedDate([...rows, { date: '2026-07-26', tm_id: -999, seconds_played: 0 }]), '2026-06-03');
	assert.equal(lastPlayedDate([{ date: '2025-10-22', tm_id: 1, seconds_played: 0, future_game: 1 }]), null);
	// A retired player's history ends on their final game: the day they last played, though the
	// rating on that row is the one going into it (the page says "Last played", not "Rated through").
	const kobe = [
		{ date: '2016-04-11', tm_id: 1610612747, seconds_played: 1800, future_game: 0 },
		{ date: '2016-04-13', tm_id: 1610612747, seconds_played: 2520, future_game: 0 }
	];
	assert.equal(lastPlayedDate(kobe), '2016-04-13');

	// Every season, the one still being played included, opens the board on its own recorded day.
	const seasons = seasonRows([{ season: 2016, date: '2016-04-13', tm_id: 1610612747, games: 66, dpm: -1.87, o_dpm: -0.8 }], {
		inProgress: 2016
	});
	assert.equal(seasonBoardHref(seasons[0]), '/?asof=2016-04-13');
	assert.equal(seasonBoardHref({ date: null }), null);
	assert.equal(seasonRows([{ season: 2025, date: 'x', dpm: 1 }])[0].date, null);
});

test('navigation: the page’s own writes are skipped, and every other arrival is read back', () => {
	const at = (href) => ({ url: new URL(href, 'https://www.darko.app') });
	const own = '/?team=DEN&cols=impact';
	assert.equal(pathAndSearch(at(own).url), own);
	// The page's first load is already read, and its own in-place write isn't news.
	assert.equal(isIncomingNavigation({ type: 'enter', to: at('/?team=DEN'), pathname: '/' }), false);
	assert.equal(isIncomingNavigation({ type: 'goto', to: at(own), pathname: '/', ownHref: own }), false);
	// Ask DARKO's goto('/'), a link, Back/Forward and the Time Machine all bring a question.
	assert.equal(isIncomingNavigation({ type: 'goto', to: at('/'), pathname: '/', ownHref: own }), true);
	assert.equal(isIncomingNavigation({ type: 'link', to: at('/'), pathname: '/' }), true);
	assert.equal(isIncomingNavigation({ type: 'popstate', to: at('/?team=BOS'), pathname: '/' }), true);
	assert.equal(isIncomingNavigation({ type: 'goto', to: at('/?asof=2025-01-01&team=DEN'), pathname: '/', ownHref: own }), true);
	// Leaving the page isn't for it to read.
	assert.equal(isIncomingNavigation({ type: 'link', to: at('/player/2544'), pathname: '/' }), false);

	// Applying the same question again (the Time Machine carries it along) changes nothing.
	const state = readLeaderboardState(new URLSearchParams('team=DEN&dpm_min=2&sort=x_minutes'), OPTIONS);
	const carried = readLeaderboardState(new URLSearchParams('asof=2025-01-01&sort=x_minutes&dpm_min=2&team=DEN'), OPTIONS);
	assert.ok(sameLeaderboardState(state, carried));
	assert.ok(!sameLeaderboardState(state, readLeaderboardState(new URLSearchParams(''), OPTIONS)));
});

test('the Scatterplot’s URL reads back into its settings, unknowns falling back', () => {
	const stats = ['o_dpm', 'd_dpm', 'dpm', 'x_fg3_pct'];
	const state = readScatterState(new URLSearchParams('x=dpm&y=x_fg3_pct&mpg=20&color=0&ids=203999,1641705,203999,-1'), stats);
	assert.deepEqual(state, { x: 'dpm', y: 'x_fg3_pct', mpg: 20, color: false, ids: [203999, 1641705] });
	assert.equal(scatterSearch(state), 'x=dpm&y=x_fg3_pct&mpg=20&color=0&ids=203999,1641705');
	assert.deepEqual(readScatterState(new URLSearchParams(scatterSearch(state)), stats), state);
	// A clean address is the default chart: More → Scatterplot starts over.
	assert.deepEqual(readScatterState(new URLSearchParams(''), stats), { x: 'o_dpm', y: 'd_dpm', mpg: 0, color: true, ids: [] });
	assert.equal(scatterSearch(readScatterState(new URLSearchParams('x=nope&mpg=99'), stats)), '');
});

test('head to head: leads read from the printed values, gaps in the stat’s units, no verdict on volume', () => {
	const rows = headToHeadRows(
		{ dpm: 6.84, x_fg_pct: 0.534, x_fg3_pct: 0.3386, sal_market_fixed: 101.43e6, x_minutes: 31.7, x_pts_100: 31.2 },
		{ dpm: 6.41, x_fg_pct: 0.492, x_fg3_pct: 0.3394, sal_market_fixed: 82.8e6, x_minutes: 35, x_pts_100: 35 }
	);
	const row = (key) => rows.find((entry) => entry.key === key);
	assert.deepEqual([row('dpm').lead, row('dpm').edge], [0, '0.4']);
	assert.deepEqual([row('x_fg_pct').lead, row('x_fg_pct').edge], [0, '4.2 pp']);
	// 33.86% and 33.94% both print as 33.9%: a tie, not a lead of 0.1.
	assert.deepEqual([row('x_fg3_pct').left, row('x_fg3_pct').right, row('x_fg3_pct').lead], ['33.9%', '33.9%', null]);
	assert.equal(row('sal_market_fixed').edge, '$18.6M');
	assert.equal(row('x_minutes').label, 'Projected MPG');
	assert.equal(row('x_minutes').lead, null);
	assert.equal(row('x_pts_100').lead, null);
	assert.equal(row('box_dpm'), undefined, 'a stat neither player has is left out');

	// Games are games played (regular season, playoffs), never the model's row count.
	const games = headToHeadRows(
		{ games_regular: 1346, games_playoffs: 220, career_game_num: 1777 },
		{ games_regular: 984, games_playoffs: 91 }
	);
	assert.deepEqual(games.map((entry) => `${entry.label}:${entry.left}:${entry.right}`), ['Games:1,346:984', 'Playoff games:220:91']);
	assert.ok(!HEAD_TO_HEAD_ROWS.some((entry) => entry.key === 'career_game_num'));

	// A player whose latest ratings are over a year old is dated; anyone current isn't.
	const now = new Date('2026-09-29T12:00:00Z');
	assert.equal(snapshotNote({ date: '2016-04-13' }, now), 'Ratings as of Apr 13, 2016');
	assert.equal(snapshotNote({ date: '2026-07-26' }, now), null);
	assert.equal(snapshotNote({}, now), null);
});

test('a filter change still to be written survives a navigation that stays on the board', () => {
	const at = (href) => ({ url: new URL(href, 'https://www.darko.app') });
	// The Time Machine's address, built from the URL before the change: the change stands.
	assert.equal(keepsPendingState({ writePending: true, to: at('/?asof=2025-01-01'), pathname: '/' }), true);
	// Nothing waiting, leaving the board, or the page's own write: nothing to keep.
	assert.equal(keepsPendingState({ writePending: false, to: at('/?asof=2025-01-01'), pathname: '/' }), false);
	assert.equal(keepsPendingState({ writePending: true, to: at('/player/2544'), pathname: '/' }), false);
	assert.equal(keepsPendingState({ writePending: true, to: at('/?team=DEN'), pathname: '/', ownHref: '/?team=DEN' }), false);
});

test('the pages behind the fixes: freshness from games, picks that stay honest, Modern-only sharing', async () => {
	const [board, server, daily, teamLoader, team, player, seasons, scatter, chart] = await Promise.all([
		read('src/routes/+page.svelte'),
		read('src/routes/+page.server.js'),
		read('src/lib/server/daily.js'),
		read('src/lib/server/teamPage.js'),
		read('src/lib/components/TeamDetailView.svelte'),
		read('src/routes/player/[nbaId]/+page.svelte'),
		read('src/lib/components/SeasonBySeason.svelte'),
		read('src/routes/scatterplot/+page.svelte'),
		read('src/lib/components/ScatterplotChart.svelte')
	]);
	// "Ratings through" is the last game in the published updates, not a forecast row's date.
	assert.match(daily, /\.from\('game_updates'\)\.select\('date'\)\.order\('date', \{ ascending: false \}\)\.limit\(1\)/);
	assert.match(server, /\[snapshot, ratingsThrough\] = await Promise\.all\(\[getActivePlayers\(\), getLatestGameDate\(\)\.catch\(\(\) => null\)\]\)/);

	assert.match(team, /Ratings through \{formatAsOfDate\(ratingsThrough, \{ short: true \}\)\}/);
	assert.match(player, /const lastPlayed = \$derived\(lastPlayedDate\(historyRows\)\);/);
	assert.match(player, /Last played \{formatAsOfDate\(lastPlayed, \{ short: true \}\)\}/);
	assert.doesNotMatch(player, /Rated through/);
	// A date that can't be read leaves the label off rather than failing the page.
	assert.match(server, /getLatestGameDate\(\)\.catch\(\(\) => null\)/);
	assert.match(teamLoader, /getLatestGameDate\(\)\.catch\(\(\) => null\)/);
	// "So far" is for a current player's season, not a retired player's last.
	assert.match(player, /!asOfDate && isCurrentPlayer \? Number\(latest\.season\) : null/);
	assert.match(seasons, /href=\{seasonBoardHref\(row\)\}/);
	// The name joins the section bar only once the bar has reached its sticky offset.
	assert.match(player, /jumpStuck = Number\.isFinite\(stickyTop\) && Math\.abs\(bar\.top - stickyTop\) < 1;/);

	// Share (copy link), like the Filters panel and the column tabs, is the Modern view's.
	assert.match(board, /class="tool-action modern-only"\s*aria-label="Copy a link to this view"/);
	// From a past board the Scatterplot is off, with the reason in view.
	assert.match(board, /\{#if pastBoard\}\s*<button type="button" class="pick-action" disabled aria-describedby="pick-past-note">Scatterplot<\/button>/);
	assert.match(board, /\{#if showsValueColumn\}\s*<p class="leaderboard-value-note">/);
	assert.match(board, /\.grouped \.group-row th \{[^}]*font-size: 11px;/);
	// The Scatterplot draws only picks it has, and fades the rest only when one is drawn.
	assert.match(scatter, /highlight=\{highlightedPlayers\.map\(\(player\) => Number\(player\.nba_id\)\)\}/);
	assert.match(scatter, /\{#if highlightIds\.length > 0\}/);
	assert.match(chart, /picks\.length > 0 && !isHighlighted\(d\) \? 0\.22/);
});

test('the leaderboard toolbar: one row, Filters in a panel, column sets as tabs, Shiny as archived', async () => {
	const [board, cards] = await Promise.all([read('src/routes/+page.svelte'), read('src/lib/components/LeaderCards.svelte')]);
	// Position, age and the ranges live in a panel that closes on a press outside or Escape.
	assert.match(board, /<div class="filters-panel" id="leaderboard-filters" role="dialog" aria-label="Filters">/);
	assert.match(board, /<svelte:window onpointerdown=\{closeFiltersFromOutside\} onkeydown=\{closeFiltersOnEscape\} \/>/);
	assert.match(board, /const filterCount = \$derived\(\s*\(positionFilter !== 'all' \? 1 : 0\) \+ \(ageFilter !== 'all' \? 1 : 0\) \+ rangeCount\s*\);/);
	// The column sets are tabs on the table, with the season line beside them.
	assert.match(board, /<div class="view-bar modern-only">\s*<div class="column-tabs" role="group" aria-label="Columns">/);
	// The Shiny view keeps its position and age menus, trend toggle and CSV button.
	assert.equal((board.match(/class="control-field shiny-only"/g) ?? []).length, 2);
	assert.match(board, /class="toggle-chip shiny-only"/);
	assert.match(board, /class="btn shiny-only"/);
	assert.match(board, /:global\(:root:not\(\[data-view='shiny'\]\)\) \.shiny-only \{\s*display: none;/);
	// The $ Value note is the table's footnote now.
	assert.ok(board.indexOf('class="leaderboard-value-note"') > board.indexOf('class="leaderboard-pagination"'));

	// Leader cards: the lead one widest, each in its team's colour, with its margin over the next.
	assert.match(board, /margin: leader && next \? leadMargin\(leader\.value - next\.value, next\.player, metric\) : null/);
	assert.match(cards, /style:--team-color=\{teamColor\(card\.player\?\.team_name\) \?\? 'var\(--accent\)'\}/);
	assert.match(cards, /grid-template-columns: minmax\(300px, 1\.45fr\) repeat\(4, minmax\(0, 1fr\)\);/);
	assert.match(cards, /:global\(:root\[data-view='shiny'\]\) \.leader-card::before,\s*:global\(:root\[data-view='shiny'\]\) \.leader-margin \{\s*display: none;/);
});

test('every team has an accent colour, and a player without a team has none', async () => {
	const { teamColor } = await import('../src/lib/utils/teamColors.js');
	const { NBA_TEAMS } = await import('../src/lib/utils/teamAbbreviations.js');
	for (const team of NBA_TEAMS) assert.match(teamColor(team.name) ?? '', /^#[0-9a-f]{6}$/, team.name);
	assert.equal(teamColor(null), null);
	assert.equal(teamColor('Seattle SuperSonics'), null);
});
