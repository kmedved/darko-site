/**
 * The About page's numbers: DARKO's per-stat memory, the DPM blend, HoopsHype's survey and the
 * arithmetic behind the page's calculators. Model parameters here are the current fit's
 * (nba_darko's decay_coefs.csv and 19_create_dpm_projections.py); a refit only changes numbers.
 */

import { WINS_PER_POINT } from './rosterLab.js';

/**
 * How long DARKO's decay model remembers each stat: the half-life, the time until a game counts
 * half as much as last night's. `days` is the model's own (per-day decay for a 31-year-old, which
 * DARKO adjusts with age); `games` is the same in games during a season, with the model's cap on
 * each gap between games, over the 2025-26 schedule. `featured` stats show by default.
 */
export const HALF_LIVES = Object.freeze([
	{ key: 'starter', label: 'Starting', group: 'role', days: 1.9, games: 0.9, featured: true },
	{ key: 'minutes', label: 'Minutes', group: 'role', days: 5.1, games: 2.3, featured: true },
	{ key: 'dnp', label: 'Playing at all', group: 'role', days: 6.5, games: 3.0, featured: true },
	{ key: 'fg3_ar', label: 'Share of shots from three', group: 'volume', days: 27.3, games: 12.6, featured: true },
	{ key: 'fg3a_100', label: 'Three-point attempts', group: 'volume', days: 32.5, games: 15.0 },
	{ key: 'pace', label: 'Pace', group: 'volume', days: 35.7, games: 16.5 },
	{ key: 'usg_pct', label: 'Usage', group: 'volume', days: 35.9, games: 16.6, featured: true },
	{ key: 'fga_100', label: 'Shot attempts', group: 'volume', days: 36.8, games: 17.0 },
	{ key: 'fg2a_dist', label: 'Two-point shot distance', group: 'volume', days: 38.5, games: 17.8 },
	{ key: 'ft_ar', label: 'Free-throw rate', group: 'volume', days: 39.9, games: 39.9 },
	{ key: 'blk_100', label: 'Blocks', group: 'defense', days: 40.6, games: 40.6, featured: true },
	{ key: 'ast_pct', label: 'Assist rate', group: 'playmaking', days: 52.3, games: 24.2, featured: true },
	{ key: 'fg3a_dist', label: 'Three-point shot distance', group: 'volume', days: 53.0, games: 53.0 },
	{ key: 'rim_fga_100', label: 'Shots at the rim', group: 'volume', days: 58.1, games: 26.8 },
	{ key: 'ast_100', label: 'Assists', group: 'playmaking', days: 59.3, games: 27.4 },
	{ key: 'pts_100', label: 'Points', group: 'scoring', days: 66.5, games: 30.7, featured: true },
	{ key: 'fta_100', label: 'Free-throw attempts', group: 'volume', days: 78.0, games: 36.0 },
	{ key: 'drb_100', label: 'Defensive rebounds', group: 'rebounding', days: 98.6, games: 45.5, featured: true },
	{ key: 'fg2_pct', label: 'Two-point %', group: 'shooting', days: 106.4, games: 79.9 },
	{ key: 'blk_pct', label: 'Block rate', group: 'defense', days: 107.9, games: 49.8 },
	{ key: 'orb_pct', label: 'Offensive rebound rate', group: 'rebounding', days: 116.6, games: 53.8, featured: true },
	{ key: 'drb_pct', label: 'Defensive rebound rate', group: 'rebounding', days: 118.5, games: 54.7 },
	{ key: 'orb_100', label: 'Offensive rebounds', group: 'rebounding', days: 119.8, games: 55.3 },
	{ key: 'stl_pct', label: 'Steal rate', group: 'defense', days: 130.4, games: 74.6, featured: true },
	{ key: 'fg_pct', label: 'Field-goal %', group: 'shooting', days: 133.2, games: 72.8 },
	{ key: 'solo_fg_pct', label: 'Unassisted field-goal %', group: 'shooting', days: 135.0, games: 62.3 },
	{ key: 'pf_100', label: 'Fouls', group: 'defense', days: 156.1, games: 72.1 },
	{ key: 'tov_100', label: 'Turnovers', group: 'playmaking', days: 204.1, games: 94.2, featured: true },
	{ key: 'solo_fg3_pct', label: 'Unassisted three-point %', group: 'shooting', days: 204.2, games: 94.3 },
	{ key: 'tov_pct', label: 'Turnover rate', group: 'playmaking', days: 233.9, games: 108.0 },
	{ key: 'ft_pct', label: 'Free-throw %', group: 'shooting', days: 249.2, games: 115.0, featured: true },
	{ key: 'fg3_pct', label: 'Three-point %', group: 'shooting', days: 264.5, games: 126.7, featured: true },
	{ key: 'stl_100', label: 'Steals', group: 'defense', days: 273.3, games: 126.2 },
	{ key: 'rim_fg_pct', label: '% at the rim', group: 'shooting', days: 448.3, games: 207.0, featured: true },
	{ key: 'arc_fg3_pct', label: 'Above-the-break three %', group: 'shooting', days: 598.2, games: 276.2 },
	{ key: 'corner_fg3_pct', label: 'Corner three %', group: 'shooting', days: 1503.2, games: 694.0, featured: true }
]);

export const HALF_LIFE_GROUPS = Object.freeze({
	role: 'Role',
	volume: 'Shot volume',
	scoring: 'Scoring',
	playmaking: 'Playmaking',
	rebounding: 'Rebounding',
	defense: 'Defense',
	shooting: 'Shooting'
});

/** How much a game from `gamesAgo` games back counts against last night's, 0 to 1. */
export function memoryWeight(halfLifeGames, gamesAgo) {
	if (!(halfLifeGames > 0) || !(gamesAgo >= 0)) return gamesAgo === 0 ? 1 : 0;
	return 0.5 ** (gamesAgo / halfLifeGames);
}

/** A half-life in words: "about a game", "about 13 games", "about 1.5 seasons". */
export function describeHalfLife(games) {
	if (!(games > 0)) return '';
	if (games < 1.5) return 'about a game';
	if (games < 82) return `about ${Math.round(games)} games`;
	const seasons = games / 82;
	return `about ${seasons < 3 ? seasons.toFixed(1) : Math.round(seasons)} seasons`;
}

/**
 * DPM blends Box DPM with On/Off DPM, trusting on/off more as a player's career possessions pile
 * up: on/off's share is possessions / (possessions + prior), offense and defense apart.
 */
export const DPM_BLEND = Object.freeze({ offense: 10_000, defense: 6_000 });

export function onOffShare(possessions, prior) {
	const poss = Math.max(0, Number(possessions) || 0);
	return prior > 0 ? poss / (poss + prior) : 0;
}

/**
 * HoopsHype's survey of all-in-one metrics (29 respondents, NBA team staff and media members), in
 * which DPM ranked first: 8 named it their preferred metric, 10 more trusted it, 1 did not.
 */
export const HOOPSHYPE_SURVEY = Object.freeze({
	respondents: 29,
	url: 'https://www.hoopshype.com/story/sports/nba/2021/09/17/advanced-stats-nba-real-plus-minus-rapm-win-shares-analytics/75615174007/'
});

function finite(value) {
	const n = typeof value === 'number' ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

/** Of `values`, how many are at or above `value`, and that share of all of them. */
export function atOrAbove(values, value) {
	const list = (values ?? []).map(finite).filter((n) => n !== null);
	const count = list.filter((n) => n >= value - 1e-9).length;
	return { count, total: list.length, share: list.length ? count / list.length : 0 };
}

/** The value `share` of the way up `values` (0.5 the median, 0.9 the top 10% line). */
export function quantile(values, share) {
	const list = (values ?? []).map(finite).filter((n) => n !== null).sort((a, b) => a - b);
	if (!list.length) return null;
	const at = (list.length - 1) * Math.min(Math.max(share, 0), 1);
	const low = Math.floor(at);
	const high = Math.ceil(at);
	return list[low] + (list[high] - list[low]) * (at - low);
}

/**
 * One player among four teammates who make an average team, as the Roster Lab rates rosters: the
 * team's rating moves by (DPM - the average teammate's) x minutes / 48, and each point of rating
 * is worth WINS_PER_POINT wins over 82 games. `leagueMean` is the league's mean team rating.
 */
export function playerWorth({ dpm, minutes }, leagueMean = 0) {
	const rating = finite(dpm);
	const played = finite(minutes);
	if (rating === null || played === null || played <= 0) return null;
	const share = Math.min(played, 48) / 48;
	const teammate = (finite(leagueMean) ?? 0) / 5;
	const lift = (rating - teammate) * share;
	return { share, lift, wins: Math.min(Math.max(41 + WINS_PER_POINT * lift, 0), 82) };
}

/** "Watch DARKO learn" opens on a rookie; the other two are a breakout and the No. 1. */
export const LEARN_EXAMPLES = Object.freeze([
	{ nba_id: 1642851, player_name: 'Kon Knueppel', season: 2026, tag: 'a rookie' },
	{ nba_id: 1641706, player_name: 'Brandon Miller', season: 2026, tag: 'a breakout' },
	{ nba_id: 203999, player_name: 'Nikola Jokic', season: 2026, tag: 'the No. 1' }
]);

/** Players at three points of a career, for the DPM blend: their Box, On/Off and DPM today. */
export const BLEND_EXAMPLES = Object.freeze([
	{ nba_id: 1642843, stage: 'Rookie season' },
	{ nba_id: 1641705, stage: 'Third season' },
	{ nba_id: 203999, stage: 'Eleventh season' }
]);

/** The site's tools, for the About page's tour. */
export const SITE_TOOLS = Object.freeze([
	{ href: '/', label: 'Active Leaderboard', text: "Every player's DPM today, with filters, column sets, views you can share and CSV downloads." },
	{ href: '/player/203999', label: 'Player pages', text: 'Every game in the Seismograph, every season since 1996-97, comps and a projected box score.' },
	{ href: '/daily', label: 'The Daily', text: 'What moved in the ratings, game by game, while the season is on.', daily: true },
	{ href: '/compare', label: 'Compare', text: 'Up to four players side by side, head to head.' },
	{ href: '/trajectories', label: 'Career Trajectories', text: 'Careers against each other by game, age or season.' },
	{ href: '/teams', label: 'Teams', text: "Every team's rating and where it comes from, player by player." },
	{ href: '/standings', label: 'Standings', text: "The standings, with DARKO's season simulations while it is on." },
	{ href: '/lab', label: 'Roster Lab', text: 'Trade players, set minutes and see the rating and wins move.' },
	{ href: '/projections', label: 'Fantasy Lab', text: "Projected per-game stats under your league's scoring." },
	{ href: '/wowy', label: 'WOWY RAPM', text: 'Impact from with-or-without data, built the same way back to 1956-57.' },
	{ href: '/lineups', label: 'Lineups', text: 'Two- to five-man units and how they project together.' },
	{ href: '/rewind', label: 'Rewind', text: 'Replay a season week by week, or set the Time Machine to any day since 1996-97.' },
	{ href: '/scatterplot', label: 'Scatterplot', text: 'Any two numbers against each other.' },
	{ href: '/longevity', label: 'Longevity', text: 'How many seasons each player has left, and when he might retire.' },
	{ href: '/rate', label: 'Rate a Player', text: 'Two players, one vote: who would you rather have?' },
	{ href: '/new', label: "What's new", text: 'The latest features on the site.' }
]);
