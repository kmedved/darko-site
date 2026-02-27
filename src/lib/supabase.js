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
    playerCurrent: 60_000,
    playerHistory: 300_000,
    fullPlayerHistory: 1_800_000,
    searchPlayers: 120_000,
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

function getWeekAgoString() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return weekAgo.toISOString().slice(0, 10);
}

function keepLatestPlayerRows(rows = []) {
    const seen = new Set();
    const unique = [];

    for (const row of rows) {
        if (!seen.has(row.nba_id)) {
            seen.add(row.nba_id);
            unique.push(row);
        }
    }

    unique.sort((a, b) => b.dpm - a.dpm);
    return unique;
}

/**
 * Get all active players — most recent row per player from the last 7 days.
 */
export async function getActivePlayers(options = {}) {
    const normalizedTeam = (options.teamName || '').trim();

    if (normalizedTeam) {
        const cachedAll = readCache(cacheKey('activePlayers', 'all'), CACHE_MS.activePlayers);
        if (cachedAll) {
            return cachedAll.filter((player) => player.team_name === normalizedTeam);
        }
    }

    const key = cacheKey('activePlayers', normalizedTeam || 'all');
    return runCached(key, CACHE_MS.activePlayers, async () => {
        let query = supabase
            .from('darko_shiny_history')
            .select('nba_id, player_name, team_name, dpm, o_dpm, d_dpm, box_dpm, box_odpm, box_ddpm, position, age, tr_minutes, tr_fg3_pct, tr_ft_pct, seconds_played, active_roster, date')
            .eq('active_roster', 1)
            .gte('date', getWeekAgoString())
            .order('date', { ascending: false });

        if (normalizedTeam) {
            query = query.eq('team_name', normalizedTeam);
        }

        const { data, error } = await query.limit(10_000);

        if (error) throw error;

        const players = keepLatestPlayerRows(data || []);

        if (!normalizedTeam) {
            writeCache(cacheKey('activePlayers', 'all'), players);
        }

        return players;
    });
}

/**
 * Get a single player's history for charts.
 */
export async function getPlayerHistory(nbaId, limit = 500) {
    const key = cacheKey('playerHistory', `${nbaId}:${limit}`);
    return runCached(key, CACHE_MS.playerHistory, async () => {
        const { data, error } = await supabase
            .from('darko_shiny_history')
            .select('*')
            .eq('nba_id', nbaId)
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []).slice().reverse();
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
        const { data, error } = await supabase
            .from('darko_shiny_history')
            .select('nba_id, player_name, team_name, position, dpm, date')
            .ilike('player_name', `%${normalizedTerm}%`)
            .order('date', { ascending: false })
            .limit(200);

        if (error) throw error;

        const unique = [];
        const seen = new Set();

        for (const row of data || []) {
            if (!seen.has(row.nba_id)) {
                seen.add(row.nba_id);
                unique.push(row);
            }
        }

        return unique.slice(0, 15);
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
                .from('darko_shiny_history')
                .select('nba_id, player_name, team_name, dpm, o_dpm, d_dpm, box_dpm, box_odpm, box_ddpm, age, career_game_num, date, tr_fg3_pct, tr_ft_pct, position')
                .eq('nba_id', nbaId)
                .order('date', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;

            allData = allData.concat(data || []);
            if (!data || data.length < pageSize) break;
            page += 1;
        }

        return allData;
    });
}

/**
 * Get current snapshot for a specific player.
 */
export async function getPlayerCurrent(nbaId) {
    const key = cacheKey('playerCurrent', nbaId);
    return runCached(key, CACHE_MS.playerCurrent, async () => {
        const { data, error } = await supabase
            .from('darko_shiny_history')
            .select('*')
            .eq('nba_id', nbaId)
            .order('date', { ascending: false })
            .limit(1);

        if (error) throw error;
        if (!data || data.length === 0) throw new Error(`Player ${nbaId} not found`);

        return data[0];
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
