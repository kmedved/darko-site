import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { getPlayersAsOf, supabase } from './supabase.js';

/**
 * DARKO's history tables, published by nba_darko's pipeline_scripts/publish/website.py
 * (formerly 1_historic_darko/push_website.py):
 * - season_calendar: first game, last regular-season game and last game of every season;
 * - rating_frames: the weekly top 20 by DPM in every regular season since 1996-97.
 *
 * A local preview can read them from files the same builder wrote (DARKO_LOCAL_DATA_DIR)
 * before they are published. Production builds never read local files.
 */

const HISTORY_CACHE_MS = 3_600_000;

// Past dates change only when the pipeline republishes, so dated pages can cache longer.
export const AS_OF_EDGE_CACHE = Object.freeze({ edgeSMaxAge: 21_600, swr: 604_800, sie: 604_800 });
const PAGE_SIZE = 1_000;
const cache = new Map();

function cached(key, loader) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.at < HISTORY_CACHE_MS) return entry.value;
    const value = loader().catch((error) => {
        cache.delete(key);
        throw error;
    });
    cache.set(key, { at: Date.now(), value });
    return value;
}

export async function readLocalTable(name) {
    if (!dev || !env.DARKO_LOCAL_DATA_DIR) return null;
    try {
        const file = path.resolve(env.DARKO_LOCAL_DATA_DIR, `${name}.json`);
        return JSON.parse(await readFile(file, 'utf8'));
    } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
    }
}

async function readTable(name, columns, order) {
    const local = await readLocalTable(name);
    if (local) return local;

    const page = (index, count = false) => {
        let query = supabase.from(name).select(columns, count ? { count: 'exact' } : undefined);
        for (const column of order) query = query.order(column, { ascending: true });
        return query.range(index * PAGE_SIZE, (index + 1) * PAGE_SIZE - 1);
    };
    const first = await page(0, true);
    if (first.error) throw first.error;
    const pages = Math.ceil((first.count ?? first.data.length) / PAGE_SIZE);
    const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => page(index + 1)));
    for (const result of rest) if (result.error) throw result.error;
    return [first, ...rest].flatMap((result) => result.data ?? []);
}

/** A missing table (before the pipeline first publishes it) reads as unavailable, not an error. */
export function isMissingTable(error) {
    return error?.code === 'PGRST205' || error?.code === '42P01';
}

export function getSeasonCalendar() {
    return cached('season_calendar', async () => {
        try {
            const rows = await readTable(
                'season_calendar',
                'season, first_game, earliest_team_finale, regular_season_end, last_game',
                ['season']
            );
            return rows.map((row) => ({ ...row, season: Number(row.season) }));
        } catch (error) {
            if (isMissingTable(error)) return null;
            throw error;
        }
    });
}

export function getRatingFrames() {
    return cached('rating_frames', async () => {
        try {
            return await readTable(
                'rating_frames',
                'frame_date, season, rank, nba_id, player_name, tm_id, team_name, dpm, o_dpm, d_dpm, games',
                ['frame_date', 'rank']
            );
        } catch (error) {
            if (isMissingTable(error)) return null;
            throw error;
        }
    });
}

/** Every player's latest rating on a Time Machine date, using the calendar when it is published. */
export async function getPlayersOnDate(asOfDate) {
    const calendar = await getSeasonCalendar().catch(() => null);
    return getPlayersAsOf(asOfDate, calendar);
}

/**
 * Frames grouped by date: [{ date, season, players: [[nba_id, dpm, o_dpm, tm_id, games]] }]
 * plus a name for every player who appears, for compact transfer to the browser.
 */
export async function getCompactFrames() {
    const rows = await getRatingFrames();
    if (!rows) return null;
    const frames = [];
    const names = {};
    let current = null;
    for (const row of rows) {
        if (!current || current.date !== row.frame_date) {
            current = { date: row.frame_date, season: Number(row.season), players: [] };
            frames.push(current);
        }
        current.players.push([
            Number(row.nba_id),
            Math.round(Number(row.dpm) * 100) / 100,
            Math.round(Number(row.o_dpm) * 100) / 100,
            Number(row.tm_id),
            Number(row.games)
        ]);
        names[row.nba_id] ??= row.player_name ?? `Player ${row.nba_id}`;
    }
    return { frames, names };
}
