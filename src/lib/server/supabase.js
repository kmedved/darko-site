import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { resolveSupabaseConfig } from '$lib/utils/supabaseConfig.js';

const { supabaseUrl, supabaseAnonKey } = resolveSupabaseConfig({
    url: PUBLIC_SUPABASE_URL,
    key: PUBLIC_SUPABASE_ANON_KEY
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

const cacheStore = new Map();
const inFlightStore = new Map();
const MAX_CACHE_ENTRIES = 300;

const CACHE_MS = {
    activePlayers: 60_000,
    playersIndex: 300_000,
    playerCurrent: 60_000,
    playerHistory: 300_000,
    fullPlayerHistory: 1_800_000,
    searchPlayers: 120_000,
    longevityRows: 300_000,
    longevityTrajectory: 600_000,
    conferenceStandings: 60_000,
    teamSimulation: 60_000,
    teamWinDistribution: 60_000
};

function cacheKey(prefix, value = '') {
    return `${prefix}:${value}`;
}

function readCache(key, maxAgeMs) {
    const entry = cacheStore.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > maxAgeMs) {
        cacheStore.delete(key);
        return undefined;
    }

    return entry.value;
}

function writeCache(key, value) {
    // Keep cache bounded to avoid unbounded growth from high-cardinality keys.
    if (cacheStore.size >= MAX_CACHE_ENTRIES && !cacheStore.has(key)) {
        const oldestKey = cacheStore.keys().next().value;
        if (oldestKey) {
            cacheStore.delete(oldestKey);
        }
    }

    cacheStore.set(key, {
        timestamp: Date.now(),
        value
    });
}

async function runCached(key, maxAgeMs, loader) {
    const cached = readCache(key, maxAgeMs);
    if (cached !== undefined) {
        return cached;
    }

    const inFlight = inFlightStore.get(key);
    if (inFlight) {
        return inFlight;
    }

    const request = loader()
        .then((value) => {
            writeCache(key, value);
            return value;
        })
        .finally(() => {
            inFlightStore.delete(key);
        });

    inFlightStore.set(key, request);
    return request;
}

const RATING_COLUMNS = [
    'nba_id',
    'date',
    'season',
    'team_name',
    'tm_id',
    'future_game',
    'active_roster',
    'available',
    'poss',
    'dpm',
    'o_dpm',
    'd_dpm',
    'box_dpm',
    'box_odpm',
    'box_ddpm',
    'on_off_dpm',
    'on_off_odpm',
    'on_off_ddpm',
    'age',
    'career_game_num',
    'seconds_played',
    'position',
    'position_num',
    'x_position',
    'bayes_rapm_off',
    'bayes_rapm_def',
    'bayes_rapm_total',
    'rapm_exposure',
    'x_minutes',
    'x_pace',
    'x_pts_100',
    'x_ast_100',
    'x_orb_100',
    'x_drb_100',
    'x_stl_100',
    'x_blk_100',
    'x_tov_100',
    'x_fga_100',
    'x_fg3a_100',
    'x_fta_100',
    'x_fg_pct',
    'x_fg3_pct',
    'x_ft_pct',
    'tr_minutes',
    'tr_starter',
    'tr_fg3_pct',
    'tr_ft_pct',
    'projected_years_remaining',
    'projected_years_remaining_cal',
    'x_retirement_age',
    'x_retirement_age_cal',
    's1',
    's2',
    's3',
    's4',
    's5',
    's6',
    's7',
    's8',
    's9',
    's10',
    's11',
    's12',
    's13',
    's14',
    's15'
].join(', ');

function sortByDpmDesc(rows = []) {
    return rows
        .slice()
        .sort((a, b) => {
            const left = Number.parseFloat(a?.dpm);
            const right = Number.parseFloat(b?.dpm);
            if (!Number.isFinite(left) && !Number.isFinite(right)) return 0;
            if (!Number.isFinite(left)) return 1;
            if (!Number.isFinite(right)) return -1;
            return right - left;
        });
}

function firstFiniteNumber(...values) {
    for (const value of values) {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

function normalizeProbability(value) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return null;
    return parsed <= 1 ? parsed * 100 : parsed;
}

function formatSeasonLabel(startYear) {
    const endSuffix = String((startYear + 1) % 100).padStart(2, '0');
    return `${startYear}-${endSuffix}`;
}

function mergeWithPlayerDim(row, playerDim) {
    return {
        ...row,
        player_name: row.player_name ?? playerDim?.player_name ?? null,
        team_name: row.team_name ?? playerDim?.current_team ?? null,
        position: row.position ?? playerDim?.position ?? null,
        rookie_season: row.rookie_season ?? playerDim?.rookie_season ?? null
    };
}

async function getPlayersMapByIds(ids = []) {
    const filteredIds = (ids || []).filter((id) => Number.isInteger(id) && id > 0);
    if (filteredIds.length === 0) {
        return new Map();
    }

    const { data, error } = await supabase
        .from('players')
        .select('*')
        .in('nba_id', filteredIds);

    if (error) throw error;

    const map = new Map();
    for (const row of data || []) {
        map.set(row.nba_id, row);
    }
    return map;
}

async function getLatestActiveDate() {
    const key = cacheKey('latestActiveDate', 'active');
    return runCached(key, CACHE_MS.activePlayers, async () => {
        const { data, error } = await supabase
            .from('player_ratings')
            .select('date')
            .eq('active_roster', 1)
            .order('date', { ascending: false })
            .limit(1);

        if (error) throw error;
        return data?.[0]?.date ?? null;
    });
}

/**
 * Get all active players — most recent row per player from the last 7 days.
 * Uses a date range and deduplicates per nba_id to handle cases where
 * the data pipeline updates teams at different times.
 */
export async function getActivePlayers(options = {}) {
    const normalizedTeam = (options.teamName || '').trim();
    const key = cacheKey('activePlayers', normalizedTeam || 'all');
    return runCached(key, CACHE_MS.activePlayers, async () => {
        const latestDate = await getLatestActiveDate();
        if (!latestDate) {
            return [];
        }

        // Use a 7-day window back from the latest date to capture all players
        const latest = new Date(latestDate);
        const weekAgo = new Date(latest);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().slice(0, 10);

        const { data, error } = await supabase
            .from('player_ratings')
            .select(RATING_COLUMNS)
            .eq('active_roster', 1)
            .gte('date', weekAgoStr)
            .order('date', { ascending: false })
            .limit(10_000);

        if (error) throw error;

        // Keep only the most recent row per player
        const seen = new Set();
        const unique = [];
        for (const row of data || []) {
            if (!seen.has(row.nba_id)) {
                seen.add(row.nba_id);
                unique.push(row);
            }
        }

        const ids = unique.map((row) => row.nba_id);
        const playersMap = await getPlayersMapByIds(ids);
        let merged = unique.map((row) => mergeWithPlayerDim(row, playersMap.get(row.nba_id)));

        if (normalizedTeam) {
            merged = merged.filter((row) => {
                const rowTeam = String(row.team_name || '').trim();
                return rowTeam === normalizedTeam;
            });
        }

        return sortByDpmDesc(merged);
    });
}

/**
 * Get a single player's history for charts.
 */
export async function getPlayerHistory(nbaId, limit = 500) {
    const key = cacheKey('playerHistory', `${nbaId}:${limit}`);
    return runCached(key, CACHE_MS.playerHistory, async () => {
        const { data, error } = await supabase
            .from('player_ratings')
            .select(RATING_COLUMNS)
            .eq('nba_id', nbaId)
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw error;
        const playersMap = await getPlayersMapByIds([nbaId]);
        const playerDim = playersMap.get(nbaId);
        return (data || []).slice().reverse().map((row) => mergeWithPlayerDim(row, playerDim));
    });
}

/**
 * Search all players (including retired/inactive) by name.
 * Returns up to 15 unique matches with most recent data.
 */
export async function searchAllPlayers(searchTerm) {
    const normalizedTerm = (searchTerm || '').trim().toLowerCase();
    if (normalizedTerm.length < 2) {
        return [];
    }

    const key = cacheKey('searchPlayers', normalizedTerm);
    return runCached(key, CACHE_MS.searchPlayers, async () => {
        const rows = await getPlayersIndex();
        return rows
            .filter((row) => String(row.player_name || '').toLowerCase().includes(normalizedTerm))
            .slice(0, 15);
    });
}

/**
 * Get a player's complete career history (all rows, paginated).
 * Returns rows in chronological order.
 */
export async function getFullPlayerHistory(nbaId) {
    const key = cacheKey('fullPlayerHistory', nbaId);
    return runCached(key, CACHE_MS.fullPlayerHistory, async () => {
        let allData = [];
        let page = 0;
        const pageSize = 1_000;

        while (true) {
            const { data, error } = await supabase
                .from('player_ratings')
                .select(RATING_COLUMNS)
                .eq('nba_id', nbaId)
                .order('date', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;

            allData = allData.concat(data || []);
            if (!data || data.length < pageSize) break;
            page += 1;
        }

        const playersMap = await getPlayersMapByIds([nbaId]);
        const playerDim = playersMap.get(nbaId);
        return allData.map((row) => mergeWithPlayerDim(row, playerDim));
    });
}

/**
 * Get current snapshot for a specific player.
 */
export async function getPlayerCurrent(nbaId) {
    const key = cacheKey('playerCurrent', nbaId);
    return runCached(key, CACHE_MS.playerCurrent, async () => {
        const { data, error } = await supabase
            .from('player_ratings')
            .select(RATING_COLUMNS)
            .eq('nba_id', nbaId)
            .order('date', { ascending: false })
            .limit(1);

        if (error) throw error;
        if (!data || data.length === 0) throw new Error(`Player ${nbaId} not found`);

        const playersMap = await getPlayersMapByIds([nbaId]);
        return mergeWithPlayerDim(data[0], playersMap.get(nbaId));
    });
}

export async function getPlayersIndex() {
    const key = cacheKey('playersIndex', 'all');
    return runCached(key, CACHE_MS.playersIndex, async () => {
        const [{ data: players, error }, activePlayers] = await Promise.all([
            supabase
                .from('players')
                .select('*')
                .order('player_name', { ascending: true })
                .limit(10_000),
            getActivePlayers()
        ]);

        if (error) throw error;

        const activeById = new Map();
        for (const row of activePlayers || []) {
            activeById.set(row.nba_id, row);
        }

        const rows = (players || [])
            .filter((player) => Number.isInteger(player?.nba_id) && player.nba_id > 0)
            .map((player) => {
                const active = activeById.get(player.nba_id);
                return {
                    nba_id: player.nba_id,
                    player_name: player.player_name,
                    team_name: active?.team_name ?? player.current_team ?? null,
                    position: active?.position ?? player.position ?? null,
                    dpm: active?.dpm ?? null,
                    o_dpm: active?.o_dpm ?? null,
                    d_dpm: active?.d_dpm ?? null,
                    box_dpm: active?.box_dpm ?? null,
                    box_odpm: active?.box_odpm ?? null,
                    box_ddpm: active?.box_ddpm ?? null,
                    on_off_dpm: active?.on_off_dpm ?? null,
                    bayes_rapm_total: active?.bayes_rapm_total ?? null,
                    tr_fg3_pct: active?.tr_fg3_pct ?? null,
                    tr_ft_pct: active?.tr_ft_pct ?? null,
                    x_minutes: active?.x_minutes ?? null,
                    x_pace: active?.x_pace ?? null,
                    x_pts_100: active?.x_pts_100 ?? null,
                    date: active?.date ?? null
                };
            });

        rows.sort((a, b) => {
            const left = a.player_name || '';
            const right = b.player_name || '';
            return left.localeCompare(right);
        });

        return rows;
    });
}

export async function getLongevityRows(options = {}) {
    const activeOnly = options.activeOnly !== false;
    const key = cacheKey('longevityRows', activeOnly ? 'active' : 'all');
    return runCached(key, CACHE_MS.longevityRows, async () => {
        const rows = activeOnly ? await getActivePlayers() : await getPlayersIndex();
        const longevityRows = [];

        for (const row of rows) {
            const yearsRemaining = firstFiniteNumber(
                row.projected_years_remaining_cal,
                row.projected_years_remaining
            );
            const estRetirementAge = firstFiniteNumber(
                row.x_retirement_age_cal,
                row.x_retirement_age
            );

            longevityRows.push({
                nba_id: row.nba_id,
                player_name: row.player_name,
                rookie_season: row.rookie_season ?? null,
                career_games: row.career_game_num ?? null,
                age: row.age ?? null,
                est_retirement_age: estRetirementAge,
                years_remaining: yearsRemaining,
                p1: normalizeProbability(row.s1),
                p2: normalizeProbability(row.s2),
                p3: normalizeProbability(row.s3),
                p4: normalizeProbability(row.s4),
                p5: normalizeProbability(row.s5),
                p6: normalizeProbability(row.s6),
                p7: normalizeProbability(row.s7),
                p8: normalizeProbability(row.s8),
                p9: normalizeProbability(row.s9),
                p10: normalizeProbability(row.s10),
                p11: normalizeProbability(row.s11),
                p12: normalizeProbability(row.s12)
            });
        }

        longevityRows.sort((a, b) => {
            const left = Number.parseFloat(a.years_remaining);
            const right = Number.parseFloat(b.years_remaining);
            if (Number.isFinite(left) && Number.isFinite(right)) {
                if (right !== left) return right - left;
            }
            return String(a.player_name || '').localeCompare(String(b.player_name || ''));
        });

        return longevityRows;
    });
}

export async function getLongevityTrajectory(nbaId) {
    const key = cacheKey('longevityTrajectory', nbaId);
    return runCached(key, CACHE_MS.longevityTrajectory, async () => {
        const { data, error } = await supabase
            .from('player_ratings')
            .select('season, date, x_retirement_age, x_retirement_age_cal')
            .eq('nba_id', nbaId)
            .order('season', { ascending: true })
            .order('date', { ascending: true })
            .limit(10_000);

        if (error) throw error;

        const bySeason = new Map();
        for (const row of data || []) {
            const season = Number.parseInt(row.season, 10);
            if (!Number.isFinite(season)) continue;
            bySeason.set(season, row);
        }

        const points = [];
        for (const [season, row] of [...bySeason.entries()].sort((a, b) => a[0] - b[0])) {
            const retirementAge = firstFiniteNumber(row.x_retirement_age_cal, row.x_retirement_age);
            if (!Number.isFinite(retirementAge)) continue;
            const seasonStartYear = season - 1;
            if (!Number.isFinite(seasonStartYear)) continue;

            points.push({
                season_start: formatSeasonLabel(seasonStartYear),
                season_start_year: seasonStartYear,
                projected_retirement_age: Math.round(retirementAge * 10) / 10
            });
        }

        return points;
    });
}

export async function getConferenceStandings(conference) {
    const normalizedConference = (conference || '').trim();
    if (!normalizedConference) {
        return [];
    }

    const key = cacheKey('conferenceStandings', normalizedConference);
    return runCached(key, CACHE_MS.conferenceStandings, async () => {
        const { data, error } = await supabase
            .from('season_sim')
            .select('*')
            .eq('conference', normalizedConference)
            .order('Rk', { ascending: true });

        if (error) throw error;
        return data || [];
    });
}

export async function getTeamSimulation(teamName) {
    const normalizedTeam = (teamName || '').trim();
    if (!normalizedTeam) {
        return null;
    }

    const key = cacheKey('teamSimulation', normalizedTeam);
    return runCached(key, CACHE_MS.teamSimulation, async () => {
        const { data, error } = await supabase
            .from('season_sim')
            .select('*')
            .eq('team_name', normalizedTeam)
            .limit(1);

        if (error) throw error;
        return data && data.length > 0 ? data[0] : null;
    });
}

export async function getTeamWinDistribution(teamName) {
    const normalizedTeam = (teamName || '').trim();
    if (!normalizedTeam) {
        return [];
    }

    const key = cacheKey('teamWinDistribution', normalizedTeam);
    return runCached(key, CACHE_MS.teamWinDistribution, async () => {
        const { data, error } = await supabase
            .from('win_distribution')
            .select('*')
            .eq('team_name', normalizedTeam)
            .order('wins', { ascending: true });

        if (error) throw error;
        return data || [];
    });
}

export async function getTeamPageData(teamName) {
    const normalizedTeam = (teamName || '').trim();
    if (!normalizedTeam) {
        return {
            players: [],
            sim: null,
            winDist: []
        };
    }

    const [players, sim, winDist] = await Promise.all([
        getActivePlayers({ teamName: normalizedTeam }),
        getTeamSimulation(normalizedTeam),
        getTeamWinDistribution(normalizedTeam)
    ]);

    return {
        players: players || [],
        sim: sim || null,
        winDist: winDist || []
    };
}
