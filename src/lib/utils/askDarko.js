/**
 * Ask DARKO: the site-wide command bar. It reads a typed question and returns what to offer:
 * direct answers (a trade, a comparison, a leaderboard slice, a date), then matching teams,
 * players and pages. Every action is a site URL; nothing here touches the page.
 *
 * Players are the current active roster (the /api/active-players "ask" view). Historical players
 * come from the player search API and are merged in by the component.
 */

import { getPositionCategory } from './positionCategories.js';
import { NBA_TEAMS } from './teamAbbreviations.js';
import { formatAsOfDate, HISTORY_START, parseAsOfDate, seasonLabelFromEndYear } from './timeMachine.js';
import { formatSigned } from './seismograph.js';
import { dailyListed } from './daily.js';
import { isRotationPlayer } from './leaderboardViews.js';
import { searchByName } from './nameSearch.js';

export const ASK_EXAMPLES = Object.freeze([
	'best defenders under 25',
	'trade Giannis to the Knicks',
	'Jokic vs Wembanyama',
	'rewind to 2016',
	'OKC',
	'rookies',
	'overpaid',
	'3-point shooters',
	'fantasy 9-cat',
	'payroll Knicks',
	'comps for Wembanyama'
]);

const MAX_ROWS = 25;

export function normalizeAskText(value) {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[’‘]/g, "'")
		.replace(/[^a-z0-9 .'%+-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function toNumber(value) {
	const n = typeof value === 'number' ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------- teams

const NICKNAME_OVERRIDES = { 'Portland Trail Blazers': 'Trail Blazers' };

export const ASK_TEAMS = Object.freeze(
	NBA_TEAMS.map((team) => {
		const nickname = NICKNAME_OVERRIDES[team.name] ?? team.name.split(' ').at(-1);
		const city = team.name.slice(0, team.name.length - nickname.length).trim();
		return Object.freeze({ ...team, nickname, city });
	})
);

const TEAM_BY_ABBR = new Map(ASK_TEAMS.map((team) => [team.abbr, team]));

const TEAM_ALIASES = {
	sixers: 'PHI',
	blazers: 'POR',
	wolves: 'MIN',
	twolves: 'MIN',
	cavs: 'CLE',
	mavs: 'DAL',
	dubs: 'GSW',
	'la lakers': 'LAL',
	'la clippers': 'LAC',
	clips: 'LAC',
	pels: 'NOP',
	grizz: 'MEM',
	nets: 'BKN',
	bklyn: 'BKN',
	'new york': 'NYK',
	'golden state': 'GSW',
	'san antonio': 'SAS',
	'oklahoma city': 'OKC',
	'new orleans': 'NOP'
};

// Abbreviations that are also ordinary words; they count only when typed in capitals.
const TEAM_ABBR_WORDS = new Set(['was', 'min', 'den', 'ind', 'hou', 'mem', 'sac', 'cha', 'chi', 'mil', 'por', 'det']);

function teamExact(normalized, raw = '') {
	const q = normalized.replace(/^the /, '');
	if (TEAM_ALIASES[q]) return TEAM_BY_ABBR.get(TEAM_ALIASES[q]);
	for (const team of ASK_TEAMS) {
		if (q === team.abbr.toLowerCase() && (!TEAM_ABBR_WORDS.has(q) || raw.includes(team.abbr))) return team;
		if (q === normalizeAskText(team.nickname) || q === normalizeAskText(team.name)) return team;
		// "Los Angeles" alone is two teams.
		if (q === normalizeAskText(team.city) && team.city !== 'Los Angeles') return team;
	}
	return null;
}

/** A team named by abbreviation, nickname, city, full name, alias or an unambiguous 4+ letter prefix. */
export function findTeam(query, raw = query) {
	const q = normalizeAskText(query).replace(/^the /, '');
	const exact = teamExact(q, raw);
	if (exact) return exact;
	if (q.length < 4) return null;
	const prefixed = ASK_TEAMS.filter(
		(team) => normalizeAskText(team.nickname).startsWith(q) || normalizeAskText(team.city).startsWith(q)
	);
	return prefixed.length === 1 ? prefixed[0] : null;
}

// ---------------------------------------------------------------- players

/**
 * Best name matches, strongest first, as every player search matches (nameSearch.js): exact, the
 * name's start, every word in any order, initials, anywhere, and typos when nothing else matches.
 * Current players rank ahead of former ones, and better players ahead of worse at equal match.
 * `pool` rows are { id, name, current, dpm }.
 */
export function matchPlayers(query, pool, { limit = 6, currentOnly = false } = {}) {
	const q = normalizeAskText(query);
	if (q.length < 2) return [];
	return searchByName(currentOnly ? (pool ?? []).filter((player) => player.current) : pool, query, {
		name: (player) => player.name,
		rank: (player) => (player.current ? 10 : 0) + (toNumber(player.dpm) ?? -2) * 0.6,
		limit
	});
}

/** The ask pool for active players: { id, name, normalized, current, dpm, row }. */
export function activePlayerPool(players) {
	return (players ?? []).map((row) => ({
		id: row.nba_id,
		name: row.player_name,
		normalized: normalizeAskText(row.player_name),
		current: true,
		dpm: toNumber(row.dpm),
		team: row.team_name ?? null,
		row
	}));
}

// ---------------------------------------------------------------- leaderboard questions

function pct(value) {
	const n = toNumber(value);
	return n === null ? '—' : `${(n * 100).toFixed(1)}%`;
}

function fixed1(value) {
	const n = toNumber(value);
	return n === null ? '—' : n.toFixed(1);
}

export function formatMoney(value, signed = false) {
	const n = toNumber(value);
	if (n === null) return '—';
	const text = `$${(Math.abs(n) / 1e6).toFixed(1)}M`;
	if (n < 0) return `-${text}`;
	return signed && n > 0 ? `+${text}` : text;
}

function trueShooting(row) {
	const pts = toNumber(row.x_pts_100);
	const fga = toNumber(row.x_fga_100);
	const fta = toNumber(row.x_fta_100) ?? 0;
	if (pts === null || fga === null || fga + 0.44 * fta <= 0) return null;
	return pts / (2 * (fga + 0.44 * fta));
}

function rebounds(row) {
	const orb = toNumber(row.x_orb_100);
	const drb = toNumber(row.x_drb_100);
	return orb === null && drb === null ? null : (orb ?? 0) + (drb ?? 0);
}

const ASK_SORTS = [
	{ re: /\b(defen[cs]e|defenders?|defensive|stoppers?)\b/, label: 'defense', value: (r) => toNumber(r.d_dpm), format: (v) => formatSigned(v, 1) },
	{ re: /\b(offen[cs]e|offensive)\b/, label: 'offense', value: (r) => toNumber(r.o_dpm), format: (v) => formatSigned(v, 1) },
	{ re: /\b(scorers?|scoring|points)\b/, label: 'points per 100', value: (r) => toNumber(r.x_pts_100), format: fixed1 },
	{
		re: /\b(shooters?|shooting|snipers?|threes?|3pt|3-point|3 point)\b/,
		label: '3-point accuracy (4+ attempts per 100)',
		value: (r) => toNumber(r.x_fg3_pct),
		format: pct,
		keep: (r) => (toNumber(r.x_fg3a_100) ?? 0) >= 4
	},
	{ re: /\b(passers?|passing|playmakers?|playmaking|assists?)\b/, label: 'assists per 100', value: (r) => toNumber(r.x_ast_100), format: fixed1 },
	{ re: /\b(rebounders?|rebounding|boards|rebounds)\b/, label: 'rebounds per 100', value: rebounds, format: fixed1 },
	{ re: /\b(rim protectors?|shot blockers?|blocks?|blockers?)\b/, label: 'blocks per 100', value: (r) => toNumber(r.x_blk_100), format: fixed1 },
	{ re: /\b(steals?|thieves|pickpockets?)\b/, label: 'steals per 100', value: (r) => toNumber(r.x_stl_100), format: fixed1 },
	{
		re: /\b(overpaid|worst contracts?)\b/,
		label: 'surplus value, lowest first',
		value: (r) => {
			const surplus = toNumber(r.surplus_value);
			return surplus === null ? null : -surplus;
		},
		format: (v) => formatMoney(-v, true)
	},
	{
		re: /\b(bargains?|underpaid|best contracts?|surplus|value)\b/,
		label: 'surplus value',
		value: (r) => toNumber(r.surplus_value),
		format: (v) => formatMoney(v, true)
	},
	{ re: /\b(efficient|efficiency|true shooting)\b/, label: 'true shooting', value: trueShooting, format: pct }
];

const POSITION_GROUPS = {
	G: { label: 'guards', categories: new Set(['G', 'G-F']) },
	F: { label: 'forwards', categories: new Set(['F', 'G-F', 'F-C']) },
	C: { label: 'centers', categories: new Set(['C', 'F-C']) }
};

/** The filters a leaderboard question asks for; `hit` says whether it is one at all. */
export function parseLeaderboardQuestion(normalized, raw = normalized) {
	const filter = { n: 10, position: null, maxAge: null, minAge: null, team: null, rookies: false, sort: null, hit: false };
	let match;
	if ((match = normalized.match(/\b(?:top|best) (\d{1,2})\b/)) || (match = normalized.match(/\b(\d{1,2}) (?:best|top)\b/))) {
		filter.n = Math.min(Math.max(Number(match[1]), 1), MAX_ROWS);
		filter.hit = true;
	}
	if (/\b(best|top|who|which|most|leaders?|highest|lowest|worst|good|great)\b/.test(normalized)) filter.hit = true;
	if (/\b(guards?|pgs?|sgs?)\b/.test(normalized)) filter.position = 'G';
	if (/\b(forwards?|wings?|sfs?|pfs?)\b/.test(normalized)) filter.position = 'F';
	if (/\b(centers?|centres?|bigs?|big men)\b/.test(normalized)) filter.position = 'C';
	if (filter.position) filter.hit = true;
	if ((match = normalized.match(/\b(?:under|younger than|below) (\d{2})\b/))) {
		filter.maxAge = Number(match[1]);
		filter.hit = true;
	}
	if ((match = normalized.match(/\b(?:over|older than|above) (\d{2})\b/))) {
		filter.minAge = Number(match[1]);
		filter.hit = true;
	}
	if (/\byoung\b/.test(normalized)) {
		filter.maxAge ??= 24;
		filter.hit = true;
	}
	if (/\b(veterans?|vets)\b/.test(normalized)) {
		filter.minAge ??= 31;
		filter.hit = true;
	}
	if (/\brookies?\b/.test(normalized)) {
		filter.rookies = true;
		filter.hit = true;
	}
	filter.sort = ASK_SORTS.find((sort) => sort.re.test(normalized)) ?? null;
	if (filter.sort) filter.hit = true;
	const words = normalized.split(' ');
	outer: for (let length = 3; length >= 1; length -= 1) {
		for (let start = 0; start + length <= words.length; start += 1) {
			const team = teamExact(words.slice(start, start + length).join(' '), raw);
			if (team) {
				filter.team = team;
				break outer;
			}
		}
	}
	if (filter.team && words.length > 1) filter.hit = true;
	return filter;
}

/** Rows for a leaderboard question, with a title and the column it ranks by. */
export function runLeaderboardQuestion(filter, players, { season = null } = {}) {
	const sort = filter.sort;
	// Rotation players only, on a team or across the league, so a player with a few minutes a
	// game doesn't top a team's list.
	let rows = (players ?? []).filter(
		(row) => isRotationPlayer(row) && (!filter.team || row.team_name === filter.team.name)
	);
	if (filter.position) {
		const categories = POSITION_GROUPS[filter.position].categories;
		rows = rows.filter((row) => categories.has(getPositionCategory(row.position)));
	}
	if (filter.maxAge) rows = rows.filter((row) => (toNumber(row.age) ?? Infinity) < filter.maxAge);
	if (filter.minAge) rows = rows.filter((row) => (toNumber(row.age) ?? -Infinity) >= filter.minAge);
	if (filter.rookies) rows = rows.filter((row) => season !== null && Number(row.rookie_season) === season);
	if (sort?.keep) rows = rows.filter(sort.keep);
	const value = sort ? sort.value : (row) => toNumber(row.dpm);
	rows = rows
		.filter((row) => value(row) !== null)
		.sort((a, b) => value(b) - value(a))
		.slice(0, filter.n);

	const who = filter.rookies ? 'rookies' : filter.position ? POSITION_GROUPS[filter.position].label : 'players';
	const bits = [who];
	if (filter.team) bits.push(`on the ${filter.team.nickname}`);
	if (filter.maxAge) bits.push(`under ${filter.maxAge}`);
	if (filter.minAge) bits.push(`${filter.minAge} and older`);
	return {
		title: `Top ${rows.length} ${bits.join(' ')} by ${sort ? sort.label : 'DPM'}`,
		metric: sort ? sort.label.split(' (')[0] : 'DPM',
		rows: rows.map((row) => ({
			id: row.nba_id,
			name: row.player_name,
			team: row.team_name,
			age: toNumber(row.age),
			value: sort ? sort.format(value(row)) : formatSigned(row.dpm, 1),
			dpm: formatSigned(row.dpm, 1)
		}))
	};
}

// ---------------------------------------------------------------- dates

/**
 * A Time Machine date from typed text: YYYY-MM-DD, YYYY-MM (the 1st), a season ("2016" or
 * "2015-16", its last regular-season game), or today/now/latest. Returns
 * { date, season } or { today: true } or null.
 */
export function parseAskDate(text, { calendar = [], today = new Date().toISOString().slice(0, 10) } = {}) {
	const value = normalizeAskText(text);
	if (/^(today|now|latest|present)$/.test(value)) return { today: true };
	let match;
	if ((match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
		const date = parseAsOfDate(value);
		return date && date <= today ? { date, season: seasonOf(date, calendar) } : null;
	}
	if ((match = value.match(/^(\d{4})-(\d{2})$/))) {
		const start = Number(match[1]);
		const tail = Number(match[2]);
		if (tail === (start + 1) % 100) return seasonDate(start + 1, calendar, today);
		if (tail >= 1 && tail <= 12) {
			const date = parseAsOfDate(`${match[1]}-${match[2]}-01`) ?? (value >= HISTORY_START.slice(0, 7) ? HISTORY_START : null);
			return date && date <= today ? { date, season: seasonOf(date, calendar) } : null;
		}
		return null;
	}
	if ((match = value.match(/^(\d{4})$/))) return seasonDate(Number(match[1]), calendar, today);
	return null;
}

function seasonDate(season, calendar, today) {
	const row = (calendar ?? []).find((entry) => Number(entry.season) === season);
	if (!row) return null;
	const date = row.regular_season_end ?? row.last_game;
	if (!date) return null;
	// The season still being played: its last game has not happened yet, so it means today.
	if (date > today) return { today: true };
	return { date, season };
}

function seasonOf(date, calendar) {
	const row = (calendar ?? []).find((entry) => date >= entry.first_game && date <= (entry.last_game ?? entry.first_game));
	if (row) return Number(row.season);
	const later = (calendar ?? []).filter((entry) => entry.first_game > date).map((entry) => Number(entry.season));
	return later.length ? Math.min(...later) : null;
}

// ---------------------------------------------------------------- pages

export const ASK_PAGES = Object.freeze([
	{ re: /^(the daily|daily|today|movers|risers|fallers|news)$/, label: 'The Daily', href: '/daily' },
	{ re: /^(home|leaderboard|active leaderboard|players?|dpm|rankings?)$/, label: 'Active Leaderboard', href: '/' },
	{ re: /^(wowy|wowy rapm|rapm)$/, label: 'WOWY RAPM', href: '/wowy' },
	{ re: /^(standings|playoff odds|odds|sims?|simulations?)$/, label: 'Standings', href: '/standings' },
	{ re: /^(teams?|team ratings|power (order|rankings?)|offense (vs|against) defense)$/, label: 'Teams', href: '/teams' },
	{ re: /^(trajectories|trajectory|careers?|career arcs?)$/, label: 'Career Trajectories', href: '/trajectories' },
	{ re: /^(longevity|retirement|career length)$/, label: 'Longevity', href: '/longevity' },
	{ re: /^(lineups?|five-man|5-man)$/, label: 'Lineups', href: '/lineups' },
	{ re: /^(scatter|scatterplot|scatter plot)$/, label: 'Scatterplot', href: '/scatterplot' },
	{ re: /^(rewind|time machine|race|history)$/, label: 'Rewind', href: '/rewind' },
	{ re: /^(roster lab|lab|trade machine|trades?)$/, label: 'Roster Lab', href: '/lab' },
	{ re: /^(compare|comparison)$/, label: 'Compare', href: '/compare' },
	{ re: /^(fantasy|fantasy lab|projections|draft)$/, label: 'Fantasy Lab', href: '/projections' },
	{ re: /^(rate|rate a player|elo|vote)$/, label: 'Rate a Player', href: '/rate' },
	{ re: /^(about|faq|help|methodology)$/, label: 'About', href: '/about' },
	{ re: /^(what'?s new|new|features|tour|changelog)$/, label: "What's new", href: '/new' }
]);

/** The pages Ask DARKO offers at `now`: all of them, less The Daily between seasons. */
export function askPages(now = new Date()) {
	return dailyListed(now) ? ASK_PAGES : ASK_PAGES.filter((entry) => entry.href !== '/daily');
}

/** Opens Ask DARKO from anywhere on a page with `query` typed in; AskDarko.svelte listens. */
export function openAskDarko(query = '') {
	window.dispatchEvent(new CustomEvent('darko:ask', { detail: { query } }));
}

const FANTASY_SCORING = [
	[/9[ -]?cat|categor/, 'categories', '9-cat'],
	[/draftkings|\bdk\b/, 'draftkings', 'DraftKings'],
	[/yahoo/, 'yahoo', 'Yahoo points'],
	[/espn/, 'espn', 'ESPN points']
];

// ---------------------------------------------------------------- interpretation

/**
 * Everything to offer for `raw`. Context: `players` (active rows or null while loading),
 * `pool` (activePlayerPool of them), `calendar` (season calendar rows), `season` (the latest
 * season end year), `today` (YYYY-MM-DD). Answers carry an `href`, or `clearDate` for "today".
 */
export function interpretAsk(raw, { players = null, pool = [], calendar = [], season = null, today } = {}) {
	const normalized = normalizeAskText(raw);
	const result = { answers: [], teams: [], players: [], pages: [] };
	if (!normalized) return result;
	const byId = new Map((players ?? []).map((row) => [row.nba_id, row]));
	const current = (query) => {
		const found = matchPlayers(query, pool, { limit: 1, currentOnly: true })[0];
		return found ? byId.get(found.id) ?? null : null;
	};
	let match;

	if ((match = normalized.match(/^(?:trade|send|move|ship) (.+?) to (?:the )?(.+)$/))) {
		const player = current(match[1]);
		const team = findTeam(match[2], raw);
		if (player && team && player.team_name === team.name) {
			result.answers.push({
				kind: 'trade',
				title: `${player.player_name} already plays for the ${team.name}`,
				detail: 'Open the team in the Roster Lab to change its rotation or trade with anyone.',
				action: `Open the ${team.nickname} in the Roster Lab`,
				href: `/lab?a=${team.abbr}`
			});
		} else if (player && team) {
			const from = ASK_TEAMS.find((entry) => entry.name === player.team_name);
			result.answers.push({
				kind: 'trade',
				title: `Trade ${player.player_name} to the ${team.name}`,
				detail: `Opens the Roster Lab with ${from ? from.abbr : 'his team'} and ${team.abbr} side by side and the move made. Minutes rebalance to 240.`,
				action: 'Make the trade in the Roster Lab',
				href: `/lab?trade=${player.nba_id}&to=${team.abbr}`
			});
		}
	}

	if (!result.answers.length && (match = normalized.match(/^(?:compare )?(.+?) (?:vs\.?|versus|v\.?|or|against|and) (.+)$/))) {
		const a = current(match[1]);
		const b = current(match[2]);
		if (a && b && a.nba_id !== b.nba_id) {
			const ranked = [...(players ?? [])].sort((x, y) => (toNumber(y.dpm) ?? -99) - (toNumber(x.dpm) ?? -99));
			const rank = (row) => ranked.indexOf(row) + 1;
			result.answers.push({
				kind: 'compare',
				title: `${a.player_name} vs ${b.player_name}`,
				action: 'Open both in Compare',
				href: `/compare?ids=${a.nba_id},${b.nba_id}`,
				names: [a.player_name, b.player_name],
				stats: [
					['DPM', formatSigned(a.dpm, 1), formatSigned(b.dpm, 1), better(a.dpm, b.dpm)],
					['Offense', formatSigned(a.o_dpm, 1), formatSigned(b.o_dpm, 1), better(a.o_dpm, b.o_dpm)],
					['Defense', formatSigned(a.d_dpm, 1), formatSigned(b.d_dpm, 1), better(a.d_dpm, b.d_dpm)],
					['Rank', `#${rank(a)}`, `#${rank(b)}`, better(-rank(a), -rank(b))],
					['Age', ageText(a.age), ageText(b.age), 0],
					['Surplus', formatMoney(a.surplus_value, true), formatMoney(b.surplus_value, true), better(a.surplus_value, b.surplus_value)]
				]
			});
		}
	}

	if (
		(match = normalized.match(/^(?:rewind|go back|back|time machine|jump|go)(?: to)? (.+)$/)) ||
		(match = normalized.match(/^((?:19|20)\d\d(?:-\d\d)?(?:-\d\d)?|today|now)$/))
	) {
		const when = parseAskDate(match[1], { calendar, today });
		if (when?.today) {
			result.answers.push({
				kind: 'date',
				title: 'Back to today',
				detail: 'Every page shows the latest DARKO ratings again.',
				action: 'Return to today',
				clearDate: true
			});
		} else if (when?.date) {
			result.answers.push({
				kind: 'date',
				title: `Rewind to ${formatAsOfDate(when.date)}`,
				date: when.date,
				season: when.season,
				detail: `${when.season ? `${seasonLabelFromEndYear(when.season)} season. ` : ''}The whole site follows the date you pick until you return to today.`,
				action: 'Open Rewind at that week',
				href: `/rewind?asof=${when.date}`
			});
		}
	}

	if ((match = normalized.match(/^(?:lineups?|rotation|team dna|payroll|salar(?:y|ies)|dna)(?: for| of)? (.+)$/))) {
		const team = findTeam(match[1], raw);
		if (team) {
			result.answers.push({
				kind: 'team',
				title: `${team.name}: Team DNA`,
				detail: 'Where the rating comes from, the core outlook and payroll against DARKO value.',
				action: `Open the ${team.nickname}`,
				href: `/team/${team.abbr}#team-dna`
			});
		}
	}

	if (
		(match = normalized.match(/^(?:comps?|comparables?|historical comps|futures?|players? like|similar to)(?: for| of| to)? (.+)$/)) ||
		(match = normalized.match(/^(.+?)(?:'s)? (?:comps?|comparables?|futures?)$/))
	) {
		const player = current(match[1]);
		if (player) {
			result.answers.push({
				kind: 'comps',
				title: `${player.player_name}: comps & futures`,
				detail: 'The ten most similar player-seasons since 1996-97 at the same age, and what they did over the next five seasons.',
				action: `Open ${player.player_name}'s comps`,
				href: `/player/${player.nba_id}#comps`
			});
		}
	}

	if (/\b(fantasy|9[ -]?cat|categories|draftkings|yahoo|espn)\b/.test(normalized)) {
		const scoring = FANTASY_SCORING.find(([re]) => re.test(normalized));
		result.answers.push({
			kind: 'fantasy',
			title: `Fantasy Lab${scoring ? ` · ${scoring[2]}` : ''}`,
			detail: 'Per-game fantasy values from DARKO projections.',
			action: 'Open the Fantasy Lab',
			href: scoring ? `/projections?scoring=${scoring[1]}` : '/projections'
		});
	}

	if (!result.answers.length && players) {
		const filter = parseLeaderboardQuestion(normalized, raw);
		const onlyTeam =
			filter.team &&
			!filter.sort &&
			!filter.position &&
			!filter.maxAge &&
			!filter.minAge &&
			!filter.rookies &&
			normalized.split(' ').length <= 3 &&
			!/\b(best|top|who|which|most)\b/.test(normalized);
		if (filter.hit && !onlyTeam) {
			const board = runLeaderboardQuestion(filter, players, { season });
			if (board.rows.length) result.answers.push({ kind: 'board', ...board });
		}
	}

	const page = normalized.replace(/^(?:go to|open|show(?: me)?|take me to) (?:the )?/, '');
	for (const entry of askPages()) if (entry.re.test(page)) result.pages.push({ label: entry.label, href: entry.href });
	const team = findTeam(normalized, raw);
	if (team) result.teams.push(team);
	result.players = matchPlayers(raw, pool, { limit: 6 });
	return result;
}

function better(a, b) {
	const x = toNumber(a);
	const y = toNumber(b);
	if (x === null || y === null || x === y) return 0;
	return x > y ? 1 : 2;
}

function ageText(value) {
	const n = toNumber(value);
	return n === null ? '—' : String(Math.floor(n));
}
