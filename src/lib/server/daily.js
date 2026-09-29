import { isMissingTable, readLocalTable } from './history.js';
import { supabase } from './supabase.js';
import { careerGamesById } from '../utils/playerProfile.js';

/**
 * The Daily's tables, published by nba_darko's pipeline_scripts/publish/website.py (formerly
 * 1_historic_darko/push_website.py) and built in pipeline_scripts/publish/website_daily.py:
 * - rating_moves: every player's rating change into the latest date over 7 days, 30 days and
 *   the season (`period`), with the games played in between;
 * - game_updates: the latest season's games, each with the rating going in and coming out
 *   (the Seismograph's updates);
 * - player_seasons: every player-season since 1996-97 at its last game day, ranked by DPM
 *   among the seasons at the same age.
 * Until the pipeline first publishes them, each read returns null and the page says so. A local
 * preview reads the builder's own files (DARKO_LOCAL_DATA_DIR, as history.js does).
 */

const PAGE_SIZE = 1_000;
const MOVE_COLUMNS = 'period, start_date, end_date, nba_id, player_name, tm_id, games, dpm_from, o_from, dpm_to, o_to, delta, o_delta';
const UPDATE_COLUMNS =
    'nba_id, player_name, date, game_type, tm_id, opp_id, minutes, dpm_before, o_before, dpm_after, dpm_update, o_update, d_update, abs_update';
const SEASON_COLUMNS = 'nba_id, season, player_name, tm_id, age, dpm, o_dpm, d_dpm, games, age_rank, age_count';

async function missingAsNull(read) {
    try {
        return await read();
    } catch (error) {
        if (isMissingTable(error)) return null;
        throw error;
    }
}

async function readPages(makeQuery) {
    const rows = [];
    for (let page = 0; ; page += 1) {
        const { data, error } = await makeQuery().range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if ((data ?? []).length < PAGE_SIZE) return rows;
    }
}

/**
 * The last game day in the published updates: the latest game today's ratings take in. The
 * ratings' own dates can't say this, since in season each player's latest row is the forecast
 * for their next game, dated that day.
 */
export async function getLatestGameDate() {
    const local = await readLocalTable('game_updates');
    if (local) {
        const dates = local.map((row) => String(row?.date ?? '').slice(0, 10)).filter(Boolean).sort();
        return dates.at(-1) ?? null;
    }
    return missingAsNull(async () => {
        const { data, error } = await supabase.from('game_updates').select('date').order('date', { ascending: false }).limit(1);
        if (error) throw error;
        return data?.[0]?.date ? String(data[0].date).slice(0, 10) : null;
    });
}

/** Every rating_moves row: about 550 players in each of three periods. */
export async function getRatingMoves() {
    const local = await readLocalTable('rating_moves');
    if (local) return local;
    return missingAsNull(() =>
        readPages(() => supabase.from('rating_moves').select(MOVE_COLUMNS).order('period').order('nba_id'))
    );
}

/**
 * The biggest single-game updates after `start` and on or before `end`, largest first, from
 * games of at least `minMinutes`.
 */
export async function getBiggestUpdates(start, end, limit, { minMinutes = 0 } = {}) {
    const local = await readLocalTable('game_updates');
    if (local) {
        return local
            .filter((row) => row.dpm_update !== null && row.date > start && row.date <= end && row.minutes >= minMinutes)
            .sort((a, b) => b.abs_update - a.abs_update)
            .slice(0, limit);
    }
    return missingAsNull(async () => {
        const { data, error } = await supabase
            .from('game_updates')
            .select(UPDATE_COLUMNS)
            .gt('date', start)
            .lte('date', end)
            .gte('minutes', minMinutes)
            .not('dpm_update', 'is', null)
            .order('abs_update', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data ?? [];
    });
}

/**
 * Each player's rating going into every game from `from` on, and after the last one:
 * { [nba_id]: [[date, dpm], ...] }, for sparklines.
 */
export async function getRatingSeries(ids, from) {
    const wanted = [...new Set(ids.map(Number).filter(Number.isInteger))];
    if (!wanted.length) return {};
    const local = await readLocalTable('game_updates');
    const rows = local
        ? local.filter((row) => wanted.includes(Number(row.nba_id)) && row.date >= from)
        : await missingAsNull(() =>
              readPages(() =>
                  supabase
                      .from('game_updates')
                      .select('nba_id, date, dpm_before, dpm_after')
                      .in('nba_id', wanted)
                      .gte('date', from)
                      .order('nba_id')
                      .order('date')
              )
          );
    const series = {};
    const latest = new Map();
    for (const row of [...(rows ?? [])].sort((a, b) => a.date.localeCompare(b.date))) {
        (series[row.nba_id] ??= []).push([row.date, Number(row.dpm_before)]);
        latest.set(String(row.nba_id), row);
    }
    // The rating coming out of the latest game, where the season has one.
    for (const [id, row] of latest) {
        if (row.dpm_after !== null) series[id].push([row.date, Number(row.dpm_after)]);
    }
    return series;
}

/** Seasons in `season` that rank among the best `maxRank` for their age, rarest first. */
export async function getAgeRecords(season, { maxRank = 5, minCount = 25, limit = 5 } = {}) {
    const local = await readLocalTable('player_seasons');
    if (local) {
        return local
            .filter((row) => row.season === season && row.age_rank !== null && row.age_rank <= maxRank && row.age_count >= minCount)
            .sort((a, b) => a.age_rank - b.age_rank || a.age - b.age)
            .slice(0, limit);
    }
    return missingAsNull(async () => {
        const { data, error } = await supabase
            .from('player_seasons')
            .select(SEASON_COLUMNS)
            .eq('season', season)
            .lte('age_rank', maxRank)
            .gte('age_count', minCount)
            .order('age_rank', { ascending: true })
            .order('age', { ascending: true })
            .limit(limit);
        if (error) throw error;
        return data ?? [];
    });
}

/** A season's best season-end DPMs among players with `minGames` regular-season games. */
export async function getSeasonLeaders(season, { minGames = 20, limit = 8 } = {}) {
    const local = await readLocalTable('player_seasons');
    if (local) {
        return local
            .filter((row) => row.season === season && row.games >= minGames)
            .sort((a, b) => b.dpm - a.dpm)
            .slice(0, limit);
    }
    return missingAsNull(async () => {
        const { data, error } = await supabase
            .from('player_seasons')
            .select(SEASON_COLUMNS)
            .eq('season', season)
            .gte('games', minGames)
            .order('dpm', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data ?? [];
    });
}

/**
 * Games played since 1996-97, regular season and playoffs, for each of `nbaIds` (careerGames, as
 * profiles and Compare count them): a Map by nba_id, without the players who have no seasons yet;
 * null until the season table is published.
 */
export async function getCareerGames(nbaIds) {
    const ids = [...new Set((nbaIds ?? []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    const local = await readLocalTable('player_seasons');
    if (local) {
        const wanted = new Set(ids);
        return careerGamesById(local.filter((row) => wanted.has(Number(row.nba_id))));
    }
    return missingAsNull(async () => {
        const chunks = [];
        for (let start = 0; start < ids.length; start += 150) chunks.push(ids.slice(start, start + 150));
        const pages = await Promise.all(
            chunks.map((chunk) =>
                readPages(() =>
                    supabase
                        .from('player_seasons')
                        .select('nba_id, season, games, playoff_games')
                        .in('nba_id', chunk)
                        .order('nba_id', { ascending: true })
                        .order('season', { ascending: true })
                )
            )
        );
        return careerGamesById(pages.flat());
    });
}

/**
 * Regular-season games each player has played in `season` (the season table), a Map by nba_id;
 * null until the table is published.
 */
export async function getSeasonGames(season) {
    const wanted = Number(season);
    const local = await readLocalTable('player_seasons');
    const byId = (rows) => new Map(rows.map((row) => [Number(row.nba_id), Number(row.games) || 0]));
    if (local) return byId(local.filter((row) => Number(row.season) === wanted));
    return missingAsNull(async () =>
        byId(
            await readPages(() =>
                supabase
                    .from('player_seasons')
                    .select('nba_id, games')
                    .eq('season', wanted)
                    .order('nba_id', { ascending: true })
            )
        )
    );
}

/** A player's seasons since 1996-97, each at its last game day, oldest first. */
export async function getPlayerSeasons(nbaId) {
    const local = await readLocalTable('player_seasons');
    if (local) {
        return local.filter((row) => Number(row.nba_id) === nbaId).sort((a, b) => a.season - b.season);
    }
    return missingAsNull(async () => {
        const { data, error } = await supabase
            .from('player_seasons')
            .select('season, date, tm_id, age, dpm, o_dpm, d_dpm, games, minutes, playoff_games, age_rank, age_count')
            .eq('nba_id', nbaId)
            .order('season', { ascending: true });
        if (error) throw error;
        return data ?? [];
    });
}
