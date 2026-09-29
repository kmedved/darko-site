/**
 * Pages that keep their controls in the URL (the leaderboard, the Scatterplot) write it in place
 * a moment after a change. Every other arrival on the page brings a URL to read back: a link,
 * Back/Forward, Ask DARKO, the Time Machine. These helpers tell the two apart.
 */

/** The path and query of a URL, the part a page writes. */
export function pathAndSearch(url) {
	return url ? `${url.pathname}${url.search}` : '';
}

/**
 * Whether a finished navigation brings state to apply: one that lands on `pathname`, other than
 * the page's first load (already read) and the address the page wrote itself (`ownHref`).
 */
export function isIncomingNavigation({ type, to, pathname, ownHref = null }) {
	if (!to?.url || type === 'enter' || to.url.pathname !== pathname) return false;
	return pathAndSearch(to.url) !== ownHref;
}
