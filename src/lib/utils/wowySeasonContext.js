export const WOWY_OPENING_GAME_SNAPSHOT = 'opening-game';
export const WOWY_SEASON_AVERAGE_SNAPSHOT = 'season-average';

/**
 * Historical WOWY data can briefly be served by either the opening-game or
 * season-average RPC contract during a rolling deployment. Unknown or empty
 * historical payloads intentionally fall back to the established
 * opening-game presentation so the UI never labels snapshots as averages.
 */
export function getWowyHistoricalSnapshotContext(players = [], isHistoricalSeason = false) {
    if (!isHistoricalSeason) return null;

    const rows = Array.isArray(players) ? players : [];
    const context = rows.find((player) => typeof player?.snapshot_context === 'string')
        ?.snapshot_context;
    return context === WOWY_SEASON_AVERAGE_SNAPSHOT
        ? WOWY_SEASON_AVERAGE_SNAPSHOT
        : WOWY_OPENING_GAME_SNAPSHOT;
}

export function isWowySeasonAverageContext(context) {
    return context === WOWY_SEASON_AVERAGE_SNAPSHOT;
}
