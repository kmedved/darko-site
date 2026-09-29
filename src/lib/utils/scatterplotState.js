/**
 * The Scatterplot's controls in its URL: the two axes, the minutes minimum, whether dots are
 * coloured by position, and the highlighted players (?ids=, as the leaderboard's picks send them).
 */

export const DEFAULT_SCATTER_STATE = Object.freeze({
	x: 'o_dpm',
	y: 'd_dpm',
	mpg: 0,
	color: true,
	ids: Object.freeze([])
});

const MAX_HIGHLIGHTS = 8;

/** The state a URL asks for; an unknown stat or out-of-range minimum falls back to the default. */
export function readScatterState(params, stats = []) {
	const get = (key) => params?.get(key)?.trim() ?? '';
	const stat = (key, fallback) => (stats.includes(get(key)) ? get(key) : fallback);
	const mpg = Number.parseInt(get('mpg'), 10);
	const ids = get('ids')
		.split(',')
		.map((id) => Number.parseInt(id, 10))
		.filter((id) => Number.isInteger(id) && id > 0);
	return {
		x: stat('x', DEFAULT_SCATTER_STATE.x),
		y: stat('y', DEFAULT_SCATTER_STATE.y),
		mpg: Number.isInteger(mpg) && mpg > 0 && mpg <= 40 ? mpg : 0,
		color: get('color') !== '0',
		ids: [...new Set(ids)].slice(0, MAX_HIGHLIGHTS)
	};
}

/** `base` with the state's parameters in place of any old ones; defaults are left out. */
export function scatterSearchParams(state, base = '') {
	const params = new URLSearchParams(base);
	const put = (key, value, fallback) => (value === fallback ? params.delete(key) : params.set(key, String(value)));
	put('x', state.x, DEFAULT_SCATTER_STATE.x);
	put('y', state.y, DEFAULT_SCATTER_STATE.y);
	put('mpg', Number(state.mpg) || 0, 0);
	put('color', state.color ? '1' : '0', '1');
	put('ids', (state.ids ?? []).join(','), '');
	return params;
}

/** The query as the page writes it: commas left as commas, as Compare and Career Trajectories write them. */
export function scatterSearch(state, base = '') {
	return scatterSearchParams(state, base).toString().replaceAll('%2C', ',');
}
