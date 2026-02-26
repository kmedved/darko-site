import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lomejyvfcwmchejdjqbj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uLi6DWIMye_QmWMuJ71hJA_TNW5uae-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Get all active players — most recent row per player from the last 7 days.
 */
export async function getActivePlayers() {
    // Get date from 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);

    // Fetch recent data for active players
    const { data, error } = await supabase
        .from('darko_shiny_history')
        .select('nba_id, player_name, team_name, dpm, o_dpm, d_dpm, box_dpm, box_odpm, box_ddpm, position, age, tr_minutes, tr_fg3_pct, tr_ft_pct, seconds_played, active_roster, date')
        .eq('active_roster', 1)
        .gte('date', weekAgoStr)
        .order('date', { ascending: false })
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
