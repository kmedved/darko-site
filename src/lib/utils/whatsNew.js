/**
 * What's new: the features ported from the 2026 redesign prototype (reference/redesign-2026,
 * src/20-new.js), each shown for NEW_FOR_DAYS after it went live. `launched` is the time of
 * the first production deploy that carried the feature, from Vercel's deployment record.
 * Add a feature here when it ships; it leaves the page and the menu on its own.
 */

export const NEW_FOR_DAYS = 30;
const DAY_MS = 86_400_000;

export const WHATS_NEW = Object.freeze([
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
