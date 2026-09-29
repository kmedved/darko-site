/**
 * A WOWY all-time search that finds nothing as typed ("jokíc nik", "wembanyana") looks again by
 * player (lib/server/supabase.js): these are its pieces that don't touch the database.
 */

import { matchName, searchableName } from './nameSearch.js';

/**
 * The query's longest word to search the WOWY rows with, when the query is more than that word
 * ("chamberlain" for "chamberlain wilt", "jokic" for "jokíc"); null when it would search the same.
 */
export function wowySearchWord(query) {
	const words = searchableName(query)
		.split(' ')
		.filter((word) => word.length >= 3)
		.sort((a, b) => b.length - a.length);
	const longest = words[0] ?? null;
	return longest && longest !== String(query ?? '').trim().toLowerCase() ? longest : null;
}

/** The names among `rows` that the query names, as every player search matches (no typos). */
export function namesMatching(query, rows) {
	const names = [];
	for (const row of rows ?? []) {
		if (row?.player_name && matchName(query, row.player_name, { typos: false })) names.push(row.player_name);
	}
	return [...new Set(names)];
}

/** The database's order for a WOWY page (nulls last, names without case), for merged pages. */
export function wowyRowOrder(column, direction) {
	const sign = direction === 'asc' ? 1 : -1;
	const value = (row) => {
		const raw = row?.[column];
		if (raw === null || raw === undefined || raw === '') return null;
		return typeof raw === 'string' ? raw.toLowerCase() : Number(raw);
	};
	return (a, b) => {
		const left = value(a);
		const right = value(b);
		if (left === null || right === null) {
			if (left !== right) return left === null ? 1 : -1;
		} else if (left !== right) {
			const order = typeof left === 'string' ? left.localeCompare(right) : left - right;
			if (order !== 0) return sign * order;
		}
		return (Number(b.wowy_rapm) || 0) - (Number(a.wowy_rapm) || 0) || (Number(b.season) || 0) - (Number(a.season) || 0);
	};
}

/**
 * One page from the pages of several players' seasons: each row once, in the requested order,
 * `limit` rows from `offset`, with the count of them all.
 */
export function mergeWowyPages(pages, { sortColumn, sortDirection, offset = 0, limit }) {
	const seen = new Set();
	const rows = [];
	for (const row of (pages ?? []).flatMap((page) => page?.players ?? [])) {
		const key = `${row.nba_id}:${row.season}:${row.team_sort_label}`;
		if (seen.has(key)) continue;
		seen.add(key);
		rows.push(row);
	}
	rows.sort(wowyRowOrder(sortColumn, sortDirection));
	const end = offset + limit;
	return { players: rows.slice(offset, end), totalCount: rows.length, hasMore: end < rows.length, activated: true };
}
