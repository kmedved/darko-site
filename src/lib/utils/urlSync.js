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

// The address of the Time Machine's date change under way, from the moment it starts until it lands.
let dateChange = null;

/**
 * The Time Machine marks a date change as it starts one, and calls the function this returns once
 * the change has landed (see keepsPendingState).
 */
export function markDateChange(url) {
	const href = pathAndSearch(url);
	dateChange = href;
	return () => {
		if (dateChange === href) dateChange = null;
	};
}

/**
 * Whether a navigation starting while the page still has a change to write should leave that
 * change standing. Only a Time Machine date change on the page does: its address was built from
 * the URL before the change, so reading it back would undo what the reader just did. Anything
 * else brings the question the reader asked for (a link such as Active Leaderboard, Back/Forward,
 * Ask DARKO), and the season menu builds its address from the change itself.
 */
export function keepsPendingState({ writePending, type, to, pathname }) {
	if (!writePending || type === 'popstate' || !to?.url || to.url.pathname !== pathname) return false;
	return dateChange !== null && pathAndSearch(to.url) === dateChange;
}
