/**
 * Every offseason the season simulation keeps publishing the finished season, so its "odds" are
 * all 0 or 100. The standings page shows that season as final standings instead: records, seeds
 * and how each team's season ended, read from the same rows.
 */

const CERTAIN = 99.5;

function at(row, key) {
	const value = Number.parseFloat(row?.[key]);
	return Number.isFinite(value) ? value : 0;
}

/** A simulated season with no games left (every team's remaining record is 0-0) is over. */
export function isSeasonComplete(rows) {
	return (
		Array.isArray(rows) &&
		rows.length > 0 &&
		rows.every((row) => /^0\s*-\s*0$/.test(String(row?.Remain ?? '').trim()))
	);
}

/** A team's final seed, 1 to 10, from the simulation's seed columns; null below 10th. */
export function finalSeed(row) {
	for (let seed = 1; seed <= 10; seed += 1) {
		if (at(row, `seed_${seed}`) >= CERTAIN) return seed;
	}
	return null;
}

export const RESULTS = Object.freeze({
	champion: 'Champion',
	finals: 'Lost Finals',
	playoffs: 'Playoffs',
	playIn: 'Play-in',
	lottery: 'Lottery'
});

/** How a finished season ended for a team. Seeds 7 to 10 that didn't reach the playoffs went out in the play-in. */
export function seasonResult(row) {
	if (at(row, 'Win Finals') >= CERTAIN) return RESULTS.champion;
	if (at(row, 'Win Conf') >= CERTAIN) return RESULTS.finals;
	if (at(row, 'Playoffs') >= CERTAIN) return RESULTS.playoffs;
	const seed = finalSeed(row);
	return seed !== null && seed >= 7 ? RESULTS.playIn : RESULTS.lottery;
}

/** The finished season's rows with each team's seed and result. */
export function finalStandingsRows(rows) {
	return (rows ?? []).map((row) => ({ ...row, seed: finalSeed(row), result: seasonResult(row) }));
}

/** Counts of each result, playoff teams split by whether they came through the play-in. */
export function resultCounts(rows) {
	const final = finalStandingsRows(rows);
	const playoffTeams = final.filter((row) => [RESULTS.champion, RESULTS.finals, RESULTS.playoffs].includes(row.result));
	return {
		playoffs: playoffTeams.length,
		throughPlayIn: playoffTeams.filter((row) => row.seed !== null && row.seed >= 7).length,
		playIn: final.filter((row) => row.result === RESULTS.playIn).length,
		lottery: final.filter((row) => row.result === RESULTS.lottery).length
	};
}
