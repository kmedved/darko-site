export const ADJUSTED_SEASON_FLOOR = 1978;

/**
 * Resolve the inclusive [seasonFrom, seasonThrough] bounds for the Season-Adjusted WOWY
 * leaderboard selector from `wowy_publication` and `wowy_season_adjusted_publication`.
 *
 * `seasonFrom` honors both publication floors (never below 1978). `seasonThrough` caps the
 * selector at `wowy_season_adjusted_publication.season_through` so advancing Daily/average
 * ratings into a new in-progress season never exposes an empty single-season leaderboard.
 */
export function resolveWowyAdjustedSeasonBounds(publication, adjustedPublication) {
    const floorCandidates = [publication?.season_adjusted_from, adjustedPublication?.season_from]
        .filter((value) => value !== null && value !== undefined && value !== '')
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= ADJUSTED_SEASON_FLOOR);
    const seasonFrom =
        floorCandidates.length > 0 ? Math.max(...floorCandidates) : ADJUSTED_SEASON_FLOOR;

    const rawThrough = adjustedPublication?.season_through;
    const parsedThrough =
        rawThrough !== null && rawThrough !== undefined && rawThrough !== ''
            ? Number(rawThrough)
            : Number.NaN;
    const seasonThrough =
        Number.isInteger(parsedThrough) && parsedThrough >= seasonFrom ? parsedThrough : null;

    return { seasonFrom, seasonThrough };
}

/**
 * Filter published WOWY seasons down to those covered by Season-Adjusted ratings.
 */
export function filterWowyAdjustedSeasons(publishedSeasons, publication, adjustedPublication) {
    const { seasonFrom, seasonThrough } = resolveWowyAdjustedSeasonBounds(
        publication,
        adjustedPublication
    );
    return (Array.isArray(publishedSeasons) ? publishedSeasons : []).filter(
        (season) =>
            season >= seasonFrom &&
            (seasonThrough === null || season <= seasonThrough)
    );
}
