import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
	BLEND_EXAMPLES,
	DPM_BLEND,
	HALF_LIVES,
	HOOPSHYPE_SURVEY,
	LEARN_EXAMPLES,
	SITE_TOOLS,
	atOrAbove,
	describeHalfLife,
	memoryWeight,
	onOffShare,
	playerWorth,
	quantile
} from '../src/lib/utils/aboutDarko.js';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');
const near = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;

test('each stat forgets at its own speed: role within days, shooting over seasons', () => {
	assert.equal(HALF_LIVES.length, 36);
	assert.equal(HALF_LIVES.filter((stat) => stat.featured).length, 16);
	const byKey = new Map(HALF_LIVES.map((stat) => [stat.key, stat]));
	// The decay model's own half-lives for a 31-year-old (decay_coefs.csv), and in games.
	assert.deepEqual([byKey.get('minutes').days, byKey.get('minutes').games], [5.1, 2.3]);
	assert.deepEqual([byKey.get('fg3_pct').days, byKey.get('fg3_pct').games], [264.5, 126.7]);
	assert.equal(byKey.get('corner_fg3_pct').games, 694.0);
	// Stats whose gaps count at most a day have the same half-life in days and games.
	assert.equal(byKey.get('ft_ar').games, byKey.get('ft_ar').days);
	assert.ok(HALF_LIVES.every((stat) => stat.days > 0 && stat.games > 0), 'every stat has a half-life');
	// Starting is what DARKO forgets fastest; the corner three, slowest.
	const games = HALF_LIVES.map((stat) => stat.games);
	assert.equal(Math.min(...games), byKey.get('starter').games);
	assert.equal(Math.max(...games), byKey.get('corner_fg3_pct').games);

	assert.equal(memoryWeight(10, 0), 1);
	assert.ok(near(memoryWeight(10, 10), 0.5));
	assert.ok(near(memoryWeight(10, 20), 0.25));
	assert.equal(memoryWeight(0, 5), 0);
	assert.equal(describeHalfLife(0.9), 'about a game');
	assert.equal(describeHalfLife(12.6), 'about 13 games');
	assert.equal(describeHalfLife(126.7), 'about 1.5 seasons');
	assert.equal(describeHalfLife(694), 'about 8 seasons');
});

test('DPM trusts on/off more as a career grows, sooner on defense', () => {
	assert.deepEqual({ ...DPM_BLEND }, { offense: 10_000, defense: 6_000 });
	assert.equal(onOffShare(0, DPM_BLEND.offense), 0);
	// About a season as a starter.
	assert.ok(near(onOffShare(5_000, DPM_BLEND.offense), 1 / 3));
	assert.ok(near(onOffShare(5_000, DPM_BLEND.defense), 5 / 11));
	assert.ok(onOffShare(50_000, DPM_BLEND.defense) > 0.89);
	assert.equal(onOffShare(-5, DPM_BLEND.offense), 0);
	assert.deepEqual(BLEND_EXAMPLES.map((entry) => entry.nba_id), [1642843, 1641705, 203999]);
});

test("the DPM scale's readouts and what a player is worth to an average team", () => {
	const values = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7];
	assert.deepEqual(atOrAbove(values, 5), { count: 3, total: 10, share: 0.3 });
	assert.deepEqual(atOrAbove([], 1), { count: 0, total: 0, share: 0 });
	assert.equal(quantile(values, 0.5), 2.5);
	assert.ok(near(quantile(values, 0.9), 6.1));
	assert.equal(quantile([], 0.5), null);

	// Jokic today: +7.35 over 31.66 projected minutes, a league of +1.2 teams (0.24 a teammate).
	const worth = playerWorth({ dpm: 7.35, minutes: 31.66 }, 1.2);
	assert.ok(near(worth.share, 31.66 / 48));
	assert.ok(near(worth.lift, (7.35 - 0.24) * (31.66 / 48)));
	assert.ok(near(worth.wins, 41 + 2.7 * worth.lift));
	// An average player adds nothing; nobody wins more than 82.
	assert.ok(near(playerWorth({ dpm: 0.24, minutes: 30 }, 1.2).wins, 41));
	assert.equal(playerWorth({ dpm: 40, minutes: 48 }, 0).wins, 82);
	assert.equal(playerWorth({ dpm: 3, minutes: 0 }, 0), null);
});

test("HoopsHype's 2021 survey, as reported", () => {
	assert.equal(HOOPSHYPE_SURVEY.respondents, 29);
	assert.equal(HOOPSHYPE_SURVEY.date, '2021-09-17');
	assert.match(HOOPSHYPE_SURVEY.url, /^https:\/\/www\.hoopshype\.com\/story\/sports\/nba\/2021\/09\/17\//);
	const [first, ...rest] = HOOPSHYPE_SURVEY.metrics;
	assert.deepEqual({ ...first }, { key: 'dpm', name: 'DPM', preferred: 8, trust: 10, distrust: 1 });
	// More respondents preferred DPM than any other metric.
	assert.ok(rest.every((metric) => metric.preferred < first.preferred));
	assert.deepEqual(HOOPSHYPE_SURVEY.metrics.map((metric) => metric.name), [
		'DPM', 'EPM', 'LEBRON', 'RAPTOR', 'RAPM', 'BPM', 'RPM', 'WPA', 'FIC', 'WS/48', 'PER'
	]);
	assert.equal(HOOPSHYPE_SURVEY.metrics.at(-1).distrust, 22);
});

test('the About page keeps its methodology and accuracy claim, and says the rest plainly', async () => {
	const page = await read('src/routes/about/+page.svelte');
	// The model section stays as written until the refit.
	assert.match(page, /<a href="https:\/\/en\.wikipedia\.org\/wiki\/Kalman_filter">modified Kalman filter<\/a>/);
	assert.match(page, /A differential\s+evolution optimizer is used to calculate each &beta;\./);
	assert.match(page, /DARKO also accounts for several sports statistics phenomena\. These include:/);
	// ...except the coverage line, which the season table counts.
	assert.doesNotMatch(page, /since the 2001 season/);
	assert.match(page, /DARKO's ratings cover every player's games since the 1996-97 season:\s*\{count\(totals\.playerGames\)\} of them so far\./);
	// The accuracy claim, word for word, then the survey.
	assert.match(page, /With one exception, DARKO beat both sites in every stat tested\s+\(minutes, points, rebounds, assists, blocks, turnovers, and threes made\), some by\s+substantial margins\./);
	assert.match(page, /The only stat where DARKO lost was in minutes projections\./);
	assert.match(page, /<SurveyChart \/>/);
	assert.match(page, /HoopsHype also reported that DPM beat the other public metrics in predictive power/);
	// Rookies start from age, draft slot and height.
	assert.match(page, /his rating comes from his age, draft slot and height/);
	assert.doesNotMatch(page, /initialized to essentially the same starting point/);
	// Credits.
	assert.match(page, /Thanks to <a href="https:\/\/twitter\.com\/anpatt7">Andrew Patton<\/a> for building the\s+original Shiny app\./);
	assert.match(page, /<a href="https:\/\/github\.com\/rd11490">Ryan Davis<\/a>/);
	assert.match(page, /<a href="https:\/\/github\.com\/canzhiye">Canzhi Ye<\/a>/);
	assert.doesNotMatch(page, /http:\/\/@EricEsq503|callin\.com|projects\.fivethirtyeight\.com|Further Improvements/);
	assert.match(page, /const PODCAST = 'https:\/\/open\.spotify\.com\/episode\/2S4dqtsdntTNwxdlYuA7pr';/);
	assert.match(page, /DARKO \(Daily Adjusted and Regressed Kalman Optimized projections\) is an attempt to fill\s+that gap\./);
	// The interactive pieces, and a way to each section.
	for (const component of ['DpmScale', 'DpmWorth', 'LearnDemo', 'MemoryChart', 'ModelFlow', 'BlendSlider', 'RookieStarts']) {
		assert.match(page, new RegExp(`<${component}[ />]`), component);
	}
	for (const id of ['dpm', 'learn', 'memory', 'model', 'box-to-dpm', 'rookies', 'accuracy', 'tour', 'faq', 'glossary', 'origins']) {
		assert.match(page, new RegExp(`<section id="${id}">`), id);
	}
	assert.ok(SITE_TOOLS.every((tool) => tool.href.startsWith('/')));
	assert.deepEqual(LEARN_EXAMPLES.map((entry) => [entry.nba_id, entry.season]), [
		[1642851, 2026],
		[1641706, 2026],
		[203999, 2026]
	]);
});

test("the About page's data: live counts, a season at a time, a draft class", async () => {
	const loader = await read('src/routes/about/+page.server.js');
	assert.match(loader, /getActivePlayers\(\)\.catch\(\(\) => \[\]\)/);
	assert.match(loader, /getModelTotals\(\)\.catch\(\(\) => null\)/);
	assert.match(loader, /getPlayerSeasonRows\(example\.nba_id, example\.season\)/);
	assert.match(loader, /const rookies = await getRookieStarts\(rookieYear\)/);
	// Ratings keep four places, so +7.35021 prints +7.4 as it does on the leaderboard.
	assert.match(loader, /const round = \(value, digits = 4\) =>/);

	const daily = await read('src/lib/server/daily.js');
	assert.match(daily, /export async function getModelTotals\(now = Date\.now\(\)\)/);
	assert.match(daily, /playerGames: games \+ playoffGames/);

	const supabase = await read('src/lib/server/supabase.js');
	assert.match(supabase, /\.eq\('career_game_num', 1\)/);
	assert.match(supabase, /\.is\('draft_year', null\)\.eq\('rookie_season', year \+ 1\)/);
	assert.match(supabase, /const SEASON_ROW_COLUMNS = 'nba_id, date, season, team_name, tm_id, opp_id, dpm, o_dpm, d_dpm, seconds_played, future_game';/);

	const seasonRoute = await read('src/routes/api/player/[id]/season/+server.js');
	assert.match(seasonRoute, /throw error\(400, 'Invalid season'\)/);
	const rookieRoute = await read('src/routes/api/about/rookies/+server.js');
	assert.match(rookieRoute, /throw error\(400, 'Invalid draft year'\)/);
});
