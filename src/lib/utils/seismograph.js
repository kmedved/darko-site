/**
 * Seismograph: how much each game moved a player's DARKO rating.
 *
 * Each player_ratings row is DARKO's forecast going into that day's game, built from games
 * before it. A game's update therefore shows up in the player's next row:
 * update = next row - game row. Rows the player sat out (seconds_played = 0) still drift a
 * little with league and schedule adjustments; that drift is not credited to any game.
 * Offseason rows (tm_id -999) also carry aging and other offseason adjustments, so they end
 * the season: a season's last game has no update of its own.
 */

import { formatSeasonEndYearLabel, getSeasonStartYear } from './seasonUtils.js';
import { teamAbbrFromId } from './teamAbbreviations.js';

export const OFFSEASON_TEAM_ID = -999;
export const UPDATE_WINDOW_GAMES = 20;
const MIN_WINDOW_GAMES = 5;

function toNumber(value) {
    const n = typeof value === 'number' ? value : Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
}

function dateOnly(value) {
    if (typeof value !== 'string') return null;
    const date = value.trim().split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

/** Season ending year for a row (2026 for 2025-26), from `season` or else the date. */
export function seasonOfRow(row) {
    const season = Number.parseInt(row?.season, 10);
    if (Number.isInteger(season)) return season;
    const startYear = getSeasonStartYear(dateOnly(row?.date));
    return Number.isInteger(startYear) ? startYear + 1 : null;
}

function isOffseasonRow(row) {
    return toNumber(row?.tm_id) === OFFSEASON_TEAM_ID;
}

function isUpcomingRow(row) {
    return toNumber(row?.future_game) === 1;
}

function playedGame(row) {
    return !isUpcomingRow(row) && (toNumber(row?.seconds_played) ?? 0) > 0;
}

function ratingOf(row) {
    const dpm = toNumber(row?.dpm);
    const o = toNumber(row?.o_dpm);
    let d = toNumber(row?.d_dpm);
    if (d === null && dpm !== null && o !== null) d = dpm - o;
    return dpm === null || o === null || d === null ? null : { dpm, o, d };
}

/** Seasons (ending years) with at least one game played, newest first. */
export function getSeismographSeasons(rows) {
    const seasons = new Set();
    for (const row of rows ?? []) {
        if (isOffseasonRow(row) || !playedGame(row)) continue;
        const season = seasonOfRow(row);
        if (season !== null) seasons.add(season);
    }
    return [...seasons].sort((a, b) => b - a);
}

export function seasonLabel(season) {
    return formatSeasonEndYearLabel(season) ?? String(season);
}

function meanAbsUpdate(games) {
    if (!games.length) return null;
    return games.reduce((total, game) => total + Math.abs(game.update.dpm), 0) / games.length;
}

function summarize(points, games) {
    if (!points.length) return null;
    const first = points[0];
    const last = points.at(-1);
    let best = null;
    let worst = null;
    for (const game of games) {
        if (!best || game.update.dpm > best.update.dpm) best = game;
        if (!worst || game.update.dpm < worst.update.dpm) worst = game;
    }
    const window = Math.min(UPDATE_WINDOW_GAMES, Math.floor(games.length / 2));
    const hasWindows = window >= MIN_WINDOW_GAMES;
    return {
        start: first.dpm,
        end: last.dpm,
        change: last.dpm - first.dpm,
        endStatus: last.status,
        gamesPlayed: points.filter((point) => point.played).length,
        best,
        worst,
        typicalUpdate: meanAbsUpdate(games),
        window: hasWindows ? window : 0,
        earlyUpdate: hasWindows ? meanAbsUpdate(games.slice(0, window)) : null,
        recentUpdate: hasWindows ? meanAbsUpdate(games.slice(-window)) : null
    };
}

/**
 * One season of a player's rating, game by game.
 *
 * points: every in-season row in date order, with the rating going into that day and a
 *   status: 'played' (with its update), 'final' (played, but the update is folded into the
 *   offseason), 'dnp' or 'upcoming' (the forecast for the next game).
 * games: the played points that have an update.
 */
export function buildSeismograph(rows, season) {
    const entries = [];
    for (const row of rows ?? []) {
        if (seasonOfRow(row) !== season || isOffseasonRow(row)) continue;
        const date = dateOnly(row?.date);
        const rating = ratingOf(row);
        if (date && rating) entries.push({ row, date, rating });
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));

    const points = entries.map(({ row, date, rating }, index) => {
        const next = entries[index + 1];
        const played = playedGame(row);
        let status = isUpcomingRow(row) ? 'upcoming' : played ? 'played' : 'dnp';
        let update = null;
        if (played) {
            if (next) {
                update = {
                    dpm: next.rating.dpm - rating.dpm,
                    o: next.rating.o - rating.o,
                    d: next.rating.d - rating.d
                };
            } else {
                status = 'final';
            }
        }
        return {
            index,
            date,
            team: row.team_name ?? null,
            opponent: teamAbbrFromId(row.opp_id) || null,
            minutes: played ? (toNumber(row.seconds_played) ?? 0) / 60 : 0,
            played,
            status,
            ...rating,
            update
        };
    });
    const games = points.filter((point) => point.update);

    return { season, label: seasonLabel(season), points, games, summary: summarize(points, games) };
}

/** Signed number for display: +0.12, -0.30, 0.00. */
export function formatSigned(value, digits = 2) {
    const n = toNumber(value);
    if (n === null) return '—';
    const rounded = Number(n.toFixed(digits));
    if (rounded === 0) return (0).toFixed(digits);
    return `${rounded > 0 ? '+' : ''}${rounded.toFixed(digits)}`;
}

export function formatGameDate(date, { year = false } = {}) {
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date ?? '';
    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        ...(year ? { year: 'numeric' } : {})
    });
}
