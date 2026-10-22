/**
 * A player's newest row can be an offseason projection (tm_id -999) with no team name. Keep that
 * row's ratings and fill in the team from the latest row that names a real team, so a player
 * between seasons still shows where they last played. The -999 team id stays: it is what marks
 * the offseason for the season logic. A free agent has no current team, so his team stays empty and
 * the last one is kept as last_team_name.
 */
export function withLatestTeam(currentRow, rows = []) {
	if (!currentRow || currentRow.team_name) return currentRow;
	for (let index = rows.length - 1; index >= 0; index -= 1) {
		const row = rows[index];
		if (row?.team_name && Number(row.tm_id) > 0) {
			return currentRow.free_agent
				? { ...currentRow, last_team_name: row.team_name }
				: { ...currentRow, team_name: row.team_name };
		}
	}
	return currentRow;
}
