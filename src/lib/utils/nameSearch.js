/**
 * Finding players by name, for every player search on the site. Accents, case and punctuation
 * don't count; each typed word matches the start of a word in the name, in any order ("alex sa"
 * finds Alexandre Sarr); initials work ("sga"); and when nothing matches that way, names a
 * letter or two off do ("wembanyana", "wemby").
 */

/** A name as searches compare it: no accents, lower case, words split at spaces and hyphens. */
export function searchableName(value) {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/['’‘`.]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

/** How strongly a name matches, strongest first. Typos count only when nothing matches better. */
export const MATCH = Object.freeze({ EXACT: 6, START: 5, WORDS: 4, INITIALS: 3, INSIDE: 2, TYPO: 1 });

const parsed = new Map();

function parse(name) {
	const key = String(name ?? '');
	let entry = parsed.get(key);
	if (!entry) {
		const text = searchableName(key);
		const words = text ? text.split(' ') : [];
		entry = { text, words, initials: words.map((word) => word[0]).join('') };
		if (parsed.size > 20_000) parsed.clear();
		parsed.set(key, entry);
	}
	return entry;
}

/** Whether each query word can take a different name word, by `fits(queryWord, nameWord)`. */
function assign(queryWords, nameWords, fits, index = 0, used = new Set()) {
	if (index === queryWords.length) return true;
	for (let at = 0; at < nameWords.length; at += 1) {
		if (used.has(at) || !fits(queryWords[index], nameWords[at])) continue;
		used.add(at);
		if (assign(queryWords, nameWords, fits, index + 1, used)) return true;
		used.delete(at);
	}
	return false;
}

/** Edit distance counting a swap of neighbours as one (optimal string alignment). */
export function editDistance(a, b) {
	const rows = a.length + 1;
	const cols = b.length + 1;
	const d = Array.from({ length: rows }, (_, i) => {
		const row = new Array(cols).fill(0);
		row[0] = i;
		return row;
	});
	for (let j = 0; j < cols; j += 1) d[0][j] = j;
	for (let i = 1; i < rows; i += 1) {
		for (let j = 1; j < cols; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
			}
		}
	}
	return d[a.length][b.length];
}

// A letter off in four to six, two in seven or more; shorter words have to be right.
function allowedTypos(word) {
	return word.length >= 7 ? 2 : word.length >= 4 ? 1 : 0;
}

/** A typed word against a name word: against its start (wemby, wemba) or the whole word. */
function typoDistance(queryWord, nameWord) {
	if (nameWord.startsWith(queryWord)) return 0;
	const allowed = allowedTypos(queryWord);
	if (allowed === 0) return null;
	const distance = Math.min(
		editDistance(queryWord, nameWord.slice(0, queryWord.length)),
		editDistance(queryWord, nameWord)
	);
	return distance <= allowed ? distance : null;
}

/**
 * How `query` matches `name`: { level } from MATCH, with the typo distance for a typo match, or
 * null for no match. `typos` false leaves typo matches out.
 */
export function matchName(query, name, { typos = true } = {}) {
	const q = parse(query);
	const n = parse(name);
	if (!q.text || !n.text) return null;
	if (n.text === q.text) return { level: MATCH.EXACT, distance: 0 };
	if (n.text.startsWith(q.text)) return { level: MATCH.START, distance: 0 };
	if (assign(q.words, n.words, (queryWord, nameWord) => nameWord.startsWith(queryWord))) {
		return { level: MATCH.WORDS, distance: 0 };
	}
	if (q.words.length === 1 && q.text.length >= 2 && n.words.length >= 2 && n.initials.startsWith(q.text)) {
		return { level: MATCH.INITIALS, distance: 0 };
	}
	if (n.text.includes(q.text)) return { level: MATCH.INSIDE, distance: 0 };
	if (!typos || q.text.replace(/ /g, '').length < 3) return null;
	let total = 0;
	const fits = (queryWord, nameWord) => typoDistance(queryWord, nameWord) !== null;
	if (!assign(q.words, n.words, fits)) return null;
	for (const queryWord of q.words) {
		const best = Math.min(...n.words.map((nameWord) => typoDistance(queryWord, nameWord) ?? Infinity));
		total += best;
	}
	return { level: MATCH.TYPO, distance: total };
}

/**
 * The entries of `pool` whose names match `query`, best first. Typo matches come back only when
 * no name matches better. At equal strength, `rank` (higher first) and then the name decide.
 */
export function searchByName(pool, query, { name = (entry) => entry?.player_name, rank = () => 0, limit = Infinity } = {}) {
	if (!parse(query).text) return [];
	const strict = [];
	const typos = [];
	for (const entry of pool ?? []) {
		const match = matchName(query, name(entry), { typos: strict.length === 0 });
		if (!match) continue;
		const scored = { entry, ...match, rank: rank(entry) ?? 0, name: parse(name(entry)).text };
		(match.level === MATCH.TYPO ? typos : strict).push(scored);
	}
	const matches = strict.length > 0 ? strict : typos;
	matches.sort(
		(a, b) => b.level - a.level || a.distance - b.distance || b.rank - a.rank || a.name.localeCompare(b.name)
	);
	return matches.slice(0, limit).map((match) => match.entry);
}
