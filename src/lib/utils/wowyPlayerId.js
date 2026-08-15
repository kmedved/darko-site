/**
 * WOWY preserves official positive NBA IDs and uses stable negative IDs for
 * historical players who have no NBA identifier. Zero is never a player ID.
 */
export function isWowyPlayerId(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed !== 0;
}
