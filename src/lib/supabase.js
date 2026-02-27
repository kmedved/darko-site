import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { resolveSupabaseConfig } from '$lib/utils/supabaseConfig.js';

const { supabaseUrl, supabaseAnonKey } = resolveSupabaseConfig({
    url: PUBLIC_SUPABASE_URL,
    key: PUBLIC_SUPABASE_ANON_KEY
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get all active players — most recent row per player from the last 7 days.
 */
export async function getActivePlayers(options = {}) {
    const { teamName } = options;
    // Get date from 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);

    // Fetch recent data for active players
    let query = supabase
        .from('darko_shiny_history')
        .select('nba_id, player_name, team_name, dpm, o_dpm, d_dpm, box_dpm, box_odpm, box_ddpm, position, age, tr_minutes, tr_fg3_pct, tr_ft_pct, seconds_played, active_roster, date')
        .eq('active_roster', 1)
        .gte('date', weekAgoStr)
        .order('date', { ascending: false });

    if (teamName) {
        query = query.eq('team_name', teamName);
    }

    const { data, error } = await query
        .limit(10000);

    if (error) throw error;

    // Keep only the most recent row per player
    const seen = new Set();
    const unique = [];
    for (const row of data) {
        if (!seen.has(row.nba_id)) {
            seen.add(row.nba_id);
            unique.push(row);
        }
    }

    // Sort by DPM descending
    unique.sort((a, b) => b.dpm - a.dpm);
    return unique;
}

/**
 * Get a single player's full history for charts.
 */
export async function getPlayerHistory(nbaId, limit = 500) {
    const { data, error } = await supabase
        .from('darko_shiny_history')
        .select('*')
        .eq('nba_id', nbaId)
        .order('date', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data.reverse();
}

/**
 * Search all players (including retired/inactive) by name.
 * Returns up to 15 unique matches with most recent data.
 */
export async function searchAllPlayers(searchTerm) {
    const { data, error } = await supabase
        .from('darko_shiny_history')
        .select('nba_id, player_name, team_name, position, dpm, date')
        .ilike('player_name', `%${searchTerm}%`)
        .order('date', { ascending: false })
        .limit(200);

    if (error) throw error;

    const seen = new Set();
    const unique = [];
    for (const row of data) {
        if (!seen.has(row.nba_id)) {
            seen.add(row.nba_id);
            unique.push(row);
        }
    }
    return unique.slice(0, 15);
}

/**
 * Get a player's complete career history (all rows, paginated).
 * Returns rows in chronological order.
 */
export async function getFullPlayerHistory(nbaId) {
    let allData = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('darko_shiny_history')
            .select('nba_id, player_name, team_name, dpm, o_dpm, d_dpm, box_dpm, box_odpm, box_ddpm, age, career_game_num, date, tr_fg3_pct, tr_ft_pct, position')
            .eq('nba_id', nbaId)
            .order('date', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        allData = allData.concat(data);
        if (data.length < pageSize) break;
        page++;
    }

    return allData;
}

/**
 * Get current snapshot for a specific player.
 */
export async function getPlayerCurrent(nbaId) {
    const { data, error } = await supabase
        .from('darko_shiny_history')
        .select('*')
        .eq('nba_id', nbaId)
        .order('date', { ascending: false })
        .limit(1);

    if (error) throw error;
    if (data.length === 0) throw new Error('Player ' + nbaId + ' not found');
    return data[0];
}
