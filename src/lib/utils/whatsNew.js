/**
 * What's new: the features ported from the 2026 redesign prototype (reference/redesign-2026,
 * src/20-new.js), each shown for NEW_FOR_DAYS after it went live. `launched` is the time of
 * the first production deploy that carried the feature, from Vercel's deployment record.
 * Add a feature here when it ships; it leaves the page and the menu on its own.
 */

import { DAILY_RETURNS } from './daily.js';

export const NEW_FOR_DAYS = 30;
const DAY_MS = 86_400_000;

export const WHATS_NEW = Object.freeze([
	{
		key: 'rail-podiums',
		title: 'Podiums for positions and young players',
		launched: '2026-09-29T12:29:27Z',
		text: "Beside the leaderboard, the best guards, forwards and centers stand on a podium in their teams' colours, and so do the best rookies, sophomores and third-year players. Both count regulars: 20 or more minutes a game and at least half the season's games.",
		cta: 'Open the leaderboard',
		href: '/'
	},
	{
		key: 'leaderboard-look',
		kind: 'design',
		title: 'A calmer leaderboard',
		launched: '2026-09-29T04:10:04Z',
		text: "The leaders stand in their teams' colours, each with the margin over the next player; the controls fit one row, with the filters in a panel; and the column sets are tabs on the table."
	},
	{
		key: 'leaderboard-views',
		title: 'Leaderboard views you can share',
		launched: '2026-09-29T02:51:13Z',
		text: 'Filter the leaderboard by ranges of age, minutes, DPM, offense and defense, narrow it to a set of columns, and copy a link that opens the same view. Tick up to four players to open them together in Compare, Career Trajectories or the Scatterplot.',
		cta: 'Open the leaderboard',
		href: '/'
	},
	{
		key: 'head-to-head',
		title: 'Two players, head to head',
		launched: '2026-09-29T02:51:13Z',
		text: 'Compare two players and a table sets their ratings, shooting and fair salary side by side, marking who leads where more is better, and by how much.',
		cta: 'Compare Jokic and Wembanyama',
		href: '/compare?ids=203999,1641705'
	},
	{
		key: 'player-sections',
		title: 'Player pages that keep your place',
		launched: '2026-09-29T02:51:13Z',
		text: "A player page's section links stay in view as you scroll and mark where you are, and each past season's DPM opens the leaderboard as it stood on that season's last game day.",
		cta: "See Jokic's page",
		href: '/player/203999'
	},
	{
		key: 'ratings-dates',
		kind: 'design',
		title: 'Dated ratings',
		launched: '2026-09-29T02:51:13Z',
		text: 'The leaderboard, player pages and team pages say the date their ratings run through.'
	},
	{
		key: 'trajectories-news',
		title: 'Players in the news',
		launched: '2026-09-29T02:02:23Z',
		text: "Career Trajectories opens on the players most in the day's NBA news, with a line over the chart on why each one is in it.",
		cta: 'Open Career Trajectories',
		href: '/trajectories'
	},
	{
		key: 'page-headers',
		title: 'Player and team pages, rearranged',
		launched: '2026-09-28T23:17:09Z',
		text: "Player pages open on the player: photo, facts and the rating split into offense and defense, with each chart's controls over the chart. Team pages lead with the rating and where it comes from, ahead of the roster.",
		cta: "See Wembanyama's page",
		href: '/player/1641705'
	},
	{
		key: 'distribution-motion',
		title: 'The Distribution, in motion',
		launched: '2026-09-28T23:17:09Z',
		text: "Pick a new stat under the leaderboard's Distribution and every player's dot travels to its new place, while the mean, median and top-10% figures count to theirs.",
		cta: 'Try it on the leaderboard',
		href: '/'
	},
	{
		key: 'easier-reading',
		kind: 'design',
		title: 'Easier to read',
		launched: '2026-09-28T23:17:09Z',
		text: 'Titles, names and headline numbers are set in Archivo, figures in DM Mono at its own weights, and the small print is brighter in the dark themes, on every surface.'
	},
	{
		key: 'leaderboard-tools',
		title: 'Leaderboard filters, stars and trends',
		launched: '2026-09-28T19:36:44Z',
		text: "Filter the leaderboard by position and age, star players to follow them, switch on a sparkline of each player's season, and with the Time Machine set, sort by who has risen or fallen since that date.",
		cta: 'Open the leaderboard',
		href: '/'
	},
	{
		key: 'player-pages',
		title: 'Player pages, filled in',
		launched: '2026-09-28T19:36:44Z',
		text: "Every player page opens with a menu of its sections and shows the player's rank on today's board, a Contract & longevity panel, and how the latest season ranks among every season at that age since 1996-97.",
		cta: "See Jokic's page",
		href: '/player/203999'
	},
	{
		key: 'teams',
		title: 'Teams overview',
		launched: '2026-09-28T17:43:21Z',
		text: "All 30 teams on one chart, DARKO offense against defense, and the power order by DARKO rating with each team's record, SRS, and its playoff odds or how its season ended.",
		cta: 'See the teams',
		href: '/teams'
	},
	{
		key: 'seasons',
		title: 'Season by season and Echoes today',
		launched: '2026-09-28T17:43:21Z',
		text: "Player pages list every season since 1996-97 with team, games, minutes and DPM, and where it ranks among all players that age. Echoes today names the current players whose closest comps include one of a player's seasons.",
		cta: "See Kobe Bryant's echoes",
		href: '/player/977#echoes'
	},
	{
		key: 'box-score',
		title: 'Projected box score',
		launched: '2026-09-28T17:43:21Z',
		text: "Current players' pages turn DARKO's per-100 projections into a per-game line at their projected minutes and pace, with shooting percentages, using the Fantasy Lab's math.",
		cta: "See Wembanyama's line",
		href: '/player/1641705#box-score'
	},
	{
		key: 'daily',
		title: 'The Daily',
		// Off the site between seasons, so it counts as new from its return (utils/daily.js).
		launched: DAILY_RETURNS,
		text: "A front page DARKO's ratings write themselves: who's on top, the biggest risers and fallers over the past week, month or season, the largest single-game updates, and seasons among the best ever at a player's age. Star a player on their page to follow them there.",
		cta: 'Read The Daily',
		href: '/daily'
	},
	{
		key: 'comps',
		title: 'Comps & futures',
		launched: '2026-09-28T11:44:44Z',
		text: "The ten player-seasons since 1996-97 most like a player's latest, at the same age, and a fan chart of what the 25 closest did over the next five seasons, including how many were still in the league.",
		cta: "See Wembanyama's comps",
		href: '/player/1641705#comps'
	},
	{
		key: 'team-dna',
		title: 'Team DNA',
		launched: '2026-09-28T01:53:36Z',
		text: 'Every team page shows where its DARKO rating comes from, player by player and three ways, how long its core is projected to last, and its payroll against DARKO value.',
		cta: 'Open a team',
		href: '/standings',
		// The page links to the top-rated team when it knows it.
		team: true
	},
	{
		key: 'ask',
		title: 'Ask DARKO',
		launched: '2026-09-28T01:53:36Z',
		text: 'Press ⌘K, Ctrl K or / anywhere and ask for “best rim protectors under 25”, “trade Giannis to the Knicks”, “Jokic vs Wembanyama”, “comps for Wembanyama” or “rewind to 2016”. You get an answer, not a search page.',
		cta: 'Try it',
		ask: 'best rim protectors under 25'
	},
	{
		key: 'lab',
		title: 'Roster Lab',
		launched: '2026-09-27T18:37:56Z',
		text: "Start from any team's rotation in DARKO's projected minutes, trade or sign players between two teams, drag minutes, and watch the rating, projected wins, league rank and head-to-head odds update.",
		cta: 'Open the Roster Lab',
		href: '/lab'
	},
	{
		key: 'rewind',
		title: 'Rewind and the Time Machine',
		launched: '2026-09-27T18:37:56Z',
		text: 'The Time Machine under the menu takes the whole site to any date since November 1996. Rewind plays the top 15 of every regular season, one week per beat.',
		cta: 'Play Rewind',
		href: '/rewind'
	},
	{
		key: 'seismograph',
		title: 'Seismograph',
		launched: '2026-09-27T02:07:34Z',
		text: "DARKO re-estimates every player after every game. The Seismograph plots each update under the season's rating line, split into offense and defense, so you can see which nights moved the needle.",
		cta: "See Cooper Flagg's season",
		href: '/player/1642843#seismograph'
	},
	{
		key: 'fantasy',
		title: 'Fantasy Lab',
		launched: '2026-09-27T02:07:34Z',
		text: "DARKO's per-100 projections become per-game fantasy values under ESPN, Yahoo, DraftKings, 9-cat or your own scoring.",
		cta: 'Rank players',
		href: '/projections'
	},
	{
		key: 'offense-defense',
		kind: 'design',
		title: 'Offense and defense, drawn',
		launched: '2026-09-27T02:07:34Z',
		text: 'Offense is orange and marked with a circle, defense is blue and marked with a cross, the way coaches diagram plays, so a split reads at a glance and still works without color.'
	}
]);

/** When an item leaves: NEW_FOR_DAYS after it launched. */
export function newUntil(item) {
	return new Date(Date.parse(item.launched) + NEW_FOR_DAYS * DAY_MS);
}

/** The items launched in the NEW_FOR_DAYS before `now`, newest first. */
export function currentNews(now = new Date(), items = WHATS_NEW) {
	const time = now.getTime();
	return items
		.filter((item) => {
			const launched = Date.parse(item.launched);
			return launched <= time && time < newUntil(item).getTime();
		})
		.sort((a, b) => Date.parse(b.launched) - Date.parse(a.launched));
}

/** How many new features (design notes aside) the menus count. */
export function newFeatureCount(now = new Date()) {
	return currentNews(now).filter((item) => item.kind !== 'design').length;
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** "Seven new things to do with DARKO", in words up to ten. */
export function newThingsTitle(count) {
	const number = WORDS[count] ?? String(count);
	return `${number} new ${count === 1 ? 'thing' : 'things'} to do with DARKO`;
}
