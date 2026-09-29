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
import { isIncomingNavigation, keepsPendingState, markDateChange, pathAndSearch } from '../src/lib/utils/urlSync.js';
import { leaderCard, leadMargin } from '../src/lib/utils/leaderCards.js';
import { formatPercent } from '../src/lib/utils/csvPresets.js';
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
	assert.deepEqual(games.map((entry) => `${entry.label}:${entry.left}:${entry.right}`), [
		'Regular-season games:1,346:984',
		'Playoff games:220:91'
	]);
	assert.ok(!HEAD_TO_HEAD_ROWS.some((entry) => entry.key === 'career_game_num'));

	// A player whose latest ratings are over a year old is dated; anyone current isn't.
	const now = new Date('2026-09-29T12:00:00Z');
	assert.equal(snapshotNote({ date: '2016-04-13' }, now), 'Ratings as of Apr 13, 2016');
	assert.equal(snapshotNote({ date: '2026-07-26' }, now), null);
	assert.equal(snapshotNote({}, now), null);
});

test('a filter change still to be written survives a Time Machine date change, and nothing else', () => {
	const url = (href) => new URL(href, 'https://www.darko.app');
	const keeps = (type, href, writePending = true) =>
		keepsPendingState({ writePending, type, to: { url: url(href) }, pathname: '/' });

	// Inside the write's 300ms: the Time Machine's address, built from the URL before the change,
	// lacks it, so the change stands.
	const landed = markDateChange(url('/?pos=guards&dpm_min=2&asof=2025-01-01'));
	assert.equal(keeps('goto', '/?pos=guards&dpm_min=2&asof=2025-01-01'), true);
	// Nothing waiting: nothing to keep. Back/Forward to the same address is history, not the Time Machine.
	assert.equal(keeps('goto', '/?pos=guards&dpm_min=2&asof=2025-01-01', false), false);
	assert.equal(keeps('popstate', '/?pos=guards&dpm_min=2&asof=2025-01-01'), false);
	// Active Leaderboard (a reset), Back/Forward, Ask DARKO and links elsewhere bring their own question.
	assert.equal(keeps('link', '/'), false);
	assert.equal(keeps('popstate', '/?pos=guards&dpm_min=2'), false);
	assert.equal(keeps('goto', '/?pos=bigs&age_max=25&sort=d_dpm'), false);
	assert.equal(keeps('link', '/player/2544'), false);
	landed();
	// Once it has landed, a link to the same address is just a link.
	assert.equal(keeps('link', '/?pos=guards&dpm_min=2&asof=2025-01-01'), false);
	assert.equal(keeps('goto', '/?pos=guards&dpm_min=2&asof=2025-01-01'), false);

	// A second date change started before the first lands stays marked when the first one lands.
	const first = markDateChange(url('/?asof=2024-01-01'));
	const second = markDateChange(url('/?asof=2023-01-01'));
	first();
	assert.equal(keeps('goto', '/?asof=2023-01-01'), true);
	second();
	assert.equal(keeps('goto', '/?asof=2023-01-01'), false);
});

test('the Time Machine marks its date changes, and the board asks with the navigation type', async () => {
	const [machine, board] = await Promise.all([read('src/lib/components/TimeMachine.svelte'), read('src/routes/+page.svelte')]);
	assert.match(
		machine,
		/const target = withAsOf\(\$page\.url, date \?\? null\);\s*const landed = markDateChange\(target\);\s*void goto\(relativeHref\(target\), \{ noScroll: true, keepFocus: true \}\)\.finally\(landed\);/
	);
	assert.match(board, /beforeNavigate\(\(\{ type, to \}\) => \{[^}]*keepLocalQuestion = keepsPendingState\(\{ writePending, type, to, pathname: '\/' \}\);/);
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
	assert.match(
		server,
		/\[snapshot, ratingsThrough, seasonGames\] = await Promise\.all\(\[\s*getActivePlayers\(\),\s*getLatestGameDate\(\)\.catch\(\(\) => null\),/
	);

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
	assert.match(board, /leaderCard\(teamScopedPlayers, 'Top 3PT%', 'x_fg3_pct', formatPercent\)/);
	assert.doesNotMatch(board, /function (buildLeaderCard|leadMargin)/);
	assert.match(cards, /style:--team-color=\{teamColor\(card\.player\?\.team_name\) \?\? 'var\(--accent\)'\}/);
	assert.match(cards, /grid-template-columns: minmax\(300px, 1\.45fr\) repeat\(4, minmax\(0, 1fr\)\);/);
	assert.match(cards, /:global\(:root\[data-view='shiny'\]\) \.leader-card::before,\s*:global\(:root\[data-view='shiny'\]\) \.leader-margin \{\s*display: none;/);
	// A card too narrow for its headshot drops it, and the text takes the room it kept.
	assert.match(
		cards,
		/@container \(max-width: 175px\) \{\s*\.leader-photo \{\s*display: none;\s*\}\s*\.leader-card \.leader-player,\s*\.leader-card \.leader-margin \{\s*max-width: none;/
	);
	// ...and it comes after the lead card's reserved width, which has the same specificity.
	assert.ok(cards.indexOf('@container (max-width: 175px)') > cards.indexOf('.leader-card--lead .leader-margin {'));
	// The Shiny tiles hide every headshot, so their names keep no room for one.
	assert.match(cards, /:global\(:root\[data-view='shiny'\]\) \.leader-card \.leader-player \{\s*max-width: none;/);
});

test('a leader card reads its lead from the figures as printed, as Compare does', () => {
	const player = (name, stats) => ({ player_name: name, ...stats });
	// +6.9 against +6.8 is a lead of 0.1, though the raw gap is 0.02.
	const dpm = leaderCard([player('Nikola Jokic', { dpm: 6.86 }), player('Victor Wembanyama', { dpm: 6.84 })], 'Top DPM', 'dpm');
	assert.deepEqual([dpm.displayValue, dpm.margin], ['+6.9', '0.1 ahead of Wembanyama']);
	// 37.44% and 37.36% both print as 37.4%: level, not 0.1 pp ahead.
	const threes = leaderCard(
		[player('Jamal Murray', { x_fg3_pct: 0.3736 }), player('Cameron Johnson', { x_fg3_pct: 0.3744 })],
		'Top 3PT%',
		'x_fg3_pct',
		formatPercent
	);
	assert.deepEqual([threes.player.player_name, threes.displayValue, threes.margin], ['Cameron Johnson', '37.4%', 'Level with Murray']);
	assert.equal(leadMargin('41.2%', '39.8%', player('Stephen Curry'), 'x_fg3_pct'), '1.4 pp ahead of Curry');
	assert.equal(leadMargin('+3.1', '+1.9', player('Shai Gilgeous-Alexander'), 'o_dpm'), '1.2 ahead of Gilgeous-Alexander');
	// One player, or none with the stat: no margin to give.
	assert.equal(leaderCard([player('Nikola Jokic', { dpm: 6.86 })], 'Top DPM', 'dpm').margin, null);
	assert.deepEqual(leaderCard([player('Nikola Jokic', {})], 'Top DPM', 'dpm'), {
		title: 'Top DPM',
		metric: 'dpm',
		player: null,
		value: null,
		displayValue: '\u2014',
		margin: null
	});
});

test('Compare says what its figures are for any number of players', async () => {
	const [page, table, card] = await Promise.all([
		read('src/routes/compare/+page.svelte'),
		read('src/lib/components/HeadToHead.svelte'),
		read('src/lib/components/PlayerCard.svelte')
	]);
	// The note sits with the players, shown for one to four of them, not only in the two-player table.
	assert.match(
		page,
		/\{#if selectedPlayers\.length > 0\}[\s\S]*?<p class="compare-note">\s*Each player's latest available DARKO projections\. Games are counted from 1996-97, when\s*DARKO's data begins\.\s*<\/p>\s*\{\/if\}/
	);
	assert.match(table, /<p class="h2h-caption">Shooting gaps are in percentage points \(pp\)\.<\/p>/);
	assert.match(card, /<span class="label">Regular-season games<\/span>/);
	assert.doesNotMatch(card, /<span class="label">Games<\/span>/);
});

test('every team has an accent colour, and a player without a team has none', async () => {
	const { contrastRatio, teamColor, teamInk } = await import('../src/lib/utils/teamColors.js');
	const { NBA_TEAMS } = await import('../src/lib/utils/teamAbbreviations.js');
	for (const team of NBA_TEAMS) {
		assert.match(teamColor(team.name) ?? '', /^#[0-9a-f]{6}$/, team.name);
		// Text set on the colour (the podium's blocks) reads at WCAG's 4.5:1 or better.
		assert.ok(contrastRatio(teamColor(team.name), teamInk(team.name)) >= 4.5, team.name);
	}
	assert.equal(teamInk('Denver Nuggets'), '#0a0b0d');
	assert.equal(teamInk('Los Angeles Lakers'), '#ffffff');
	assert.equal(teamColor(null), null);
	assert.equal(teamInk(null), null);
	assert.equal(teamColor('Seattle SuperSonics'), null);
});

test('the rail\'s podium cards: by position and by year in the league, the archived list in Shiny', async () => {
	const [board, podium, shiny] = await Promise.all([
		read('src/routes/+page.svelte'),
		read('src/lib/components/LeaderPodium.svelte'),
		read('src/shiny-view.css')
	]);
	// One card, twice: a podium in the Modern view and the archived list in Shiny.
	assert.match(
		board,
		/<div class="modern-only">\s*<LeaderPodium\s*players=\{card\.players\}\s*href=\{\(player\) => datedHref\(`\/player\/\$\{player\.nba_id\}`\)\}\s*photo=\{playerHeadshotUrl\}\s*\/>\s*<\/div>\s*<div class="position-list shiny-only">/
	);
	assert.match(board, /title: 'Top DPM by Position',[\s\S]*?tabs: positionTabs,[\s\S]*?players: topPositionPlayers/);
	assert.match(board, /title: 'Top DPM by Experience',[\s\S]*?tabs: EXPERIENCE_GROUPS,[\s\S]*?players: topExperiencePlayers/);
	assert.match(board, /topFiveByDpm\(teamScopedPlayers\.filter\(\(player\) => leagueYear\(player\) === experienceYear\)\)/);
	// Guards, forwards and centers, opening on guards; the leader cards have the whole board.
	assert.match(board, /let positionView = \$state\('guards'\);/);
	assert.doesNotMatch(board, /\{ key: 'all', label: 'All' \}/);
	// Regulars only (podiumRule), with the note the rule writes.
	assert.match(board, /\.filter\(podium\.qualifies\)/);
	assert.match(board, /<p class="insight-note">\{podium\.note\}<\/p>/);
	assert.doesNotMatch(board, /Minimum 20 games played/);
	// Three cards a row under the table, two below 1100px with the last across both.
	assert.match(board, /@media \(max-width: 1839px\) \{[\s\S]*?\.insight-rail \{\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
	assert.match(board, /@media \(max-width: 1099px\) \{\s*\.insight-rail \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);\s*\}\s*\.insight-rail > :last-child \{\s*grid-column: 1 \/ -1;/);
	assert.match(shiny, /\.insight-rail \{\s*position: static;\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
	// The list reads 1-2-3 while the winner stands in the middle; a new five raises it again.
	assert.match(podium, /\{#key lineup\}/);
	assert.match(podium, /\.podium-place--1 \{\s*grid-column: 2;/);
	assert.match(podium, /\.podium-place--2 \{\s*grid-column: 1;/);
	assert.match(podium, /\.podium-place--3 \{\s*grid-column: 3;/);
	assert.match(podium, /style:--ink=\{teamInk\(player\.team_name\) \?\? '#ffffff'\}/);
	assert.match(podium, /@media \(prefers-reduced-motion: reduce\) \{[^}]*\.podium-block,[^}]*animation: none;/);
});

test('the podium cards count regulars: 18+ MPG and half the most games anyone has played', async () => {
	const { podiumRule } = await import('../src/lib/utils/leaderboardViews.js');
	const board = [
		{ player_name: 'Dylan Harper', x_minutes: 24.6, season_games: 70, career_game_num: 103 },
		{ player_name: 'Kasparas Jakucionis', x_minutes: 15.1, season_games: 53, career_game_num: 83 },
		{ player_name: 'Oso Ighodaro', x_minutes: 17.0, season_games: 82, career_game_num: 171 },
		{ player_name: 'Cormac Ryan', x_minutes: 37.8, season_games: 11, career_game_num: 25 },
		{ player_name: 'Tyrese Haliburton', x_minutes: 24.1, season_games: 0, career_game_num: 524 },
		{ player_name: 'Javon Small', x_minutes: 20.1, season_games: 41, career_game_num: 60 },
		{ player_name: 'Ausar Thompson', x_minutes: 18.5, season_games: 73, career_game_num: 267 }
	];
	const rule = podiumRule(board);
	// Once a season is over (82 games), 41; minutes from the table's MPG.
	assert.equal(rule.minGames, 41);
	assert.deepEqual(board.filter(rule.qualifies).map((player) => player.player_name), ['Dylan Harper', 'Javon Small', 'Ausar Thompson']);
	assert.equal(rule.note, 'Regulars: 18+ MPG and 41+ games this season');
	// Ten games into a season, half is five; 83 (a mid-season trade) still asks 41.
	assert.equal(podiumRule([{ season_games: 10 }, { season_games: 3 }]).minGames, 5);
	assert.equal(podiumRule([{ season_games: 83 }]).minGames, 41);
	assert.equal(podiumRule([{ season_games: 1 }]).minGames, 1);

	// Without this season's games (a Time Machine date), 20 games in DARKO's data.
	const past = podiumRule(board.map(({ season_games, ...player }) => player));
	assert.equal(past.minGames, null);
	assert.deepEqual(board.map(({ season_games, ...player }) => player).filter(past.qualifies).map((player) => player.player_name), [
		'Dylan Harper',
		'Cormac Ryan',
		'Tyrese Haliburton',
		'Javon Small',
		'Ausar Thompson'
	]);
	assert.equal(past.note, "Regulars: 18+ MPG and 20+ games in DARKO's data");

	// Today's board carries this season's games from the season table; the others don't.
	const server = await read('src/routes/+page.server.js');
	assert.match(server, /seasons\.length > 0 \? getSeasonGames\(Math\.max\(\.\.\.seasons\)\)\.catch\(\(\) => null\) : null/);
	assert.match(server, /\.\.\.\(seasonGames \? \{ season_games: seasonGames\.get\(Number\(player\.nba_id\)\) \?\? 0 \} : \{\}\)/);
});

test('a player\'s year in the league counts from the first season DARKO lists', async () => {
	const { EXPERIENCE_GROUPS, isRotationPlayer, leagueYear, ROTATION_MINUTES } = await import('../src/lib/utils/leaderboardViews.js');
	// The rotation line Ask DARKO answers with, on projected minutes (the table's MPG).
	assert.equal(ROTATION_MINUTES, 12);
	assert.equal(isRotationPlayer({ x_minutes: 1.6 }), false);
	assert.equal(isRotationPlayer({ x_minutes: 12 }), true);
	assert.equal(isRotationPlayer({ x_minutes: '14.3' }), true);
	assert.equal(isRotationPlayer({}), false);
	assert.deepEqual(EXPERIENCE_GROUPS.map((group) => `${group.label}:${group.year}`), ['Rookies:1', 'Sophomores:2', '3rd Year:3']);
	assert.equal(leagueYear({ season: 2026, rookie_season: 2026 }), 1);
	assert.equal(leagueYear({ season: 2026, rookie_season: 2025 }), 2);
	assert.equal(leagueYear({ season: '2026', rookie_season: '2024' }), 3);
	assert.equal(leagueYear({ season: 2026 }), null);
	assert.equal(leagueYear({ rookie_season: 2024 }), null);
});
