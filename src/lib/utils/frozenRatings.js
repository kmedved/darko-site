/**
 * Every player as of their own last game, for now. Between seasons DARKO publishes an offseason
 * row for each player (no game ahead, team -999) with a rating pulled toward average; until each
 * player's rating after their last game is published, the site shows the rating going into that
 * game instead, as the season table (player_seasons) does. An offseason row keeps its projections,
 * salary and team and takes its ratings from the player's last game-day row. In season the latest
 * row is the next game's forecast, with a real team, and passes through.
 */

export const OFFSEASON_TEAM_ID = -999;

export const FROZEN_RATING_FIELDS = Object.freeze([
	'dpm',
	'o_dpm',
	'd_dpm',
	'box_dpm',
	'box_odpm',
	'box_ddpm',
	'on_off_dpm',
	'on_off_odpm',
	'on_off_ddpm'
]);

export function isOffseasonRow(row) {
	return Number(row?.tm_id) === OFFSEASON_TEAM_ID;
}

/** An offseason `row` with its ratings from `lastGame`; any other row, or no last game, as it is. */
export function freezeRow(row, lastGame) {
	if (!lastGame || !isOffseasonRow(row)) return row;
	const frozen = { ...row };
	for (const field of FROZEN_RATING_FIELDS) {
		if (lastGame[field] !== undefined) frozen[field] = lastGame[field];
	}
	return frozen;
}

/** A player's rows, oldest first: an offseason row takes its ratings from the game day before it. */
export function freezeHistory(rows) {
	let lastGame = null;
	return (rows ?? []).map((row) => {
		if (!isOffseasonRow(row)) {
			lastGame = row;
			return row;
		}
		return freezeRow(row, lastGame);
	});
}
