import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lomejyvfcwmchejdjqbj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uLi6DWIMye_QmWMuJ71hJA_TNW5uae-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Get all active players from the most recent date in the database.
 * Returns: [{nba_id, player_name, team_name, dpm, o_dpm, d_dpm, position, age, tr_minutes}]
 */
export async function getActivePlayers() {
    // First get the max date
    const { data: dateData, error: dateErr } = await supabase
        .from('darko_shiny_history')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

    if (dateErr) throw dateErr;
    const maxDate = dateData[0].date;

    // Get all active players on that date
    const { data, error } = await supabase
        .from('darko_shiny_history')
        .select('nba_id, player_name, team_name, dpm, o_dpm, d_dpm, box_dpm, box_odpm, box_ddpm, position, age, tr_minutes, tr_fg3_pct, tr_ft_pct, seconds_played, active_roster')
        .eq('date', maxDate)
        .eq('active_roster', 1)
        .order('dpm', { ascending: false });

    if (error) throw error;
    return data;
}

/**
 * Get a single player's full history for charts.
 * Returns rows sorted by date ascending.
 */
export async function getPlayerHistory(nbaId, limit = 500) {
    const { data, error } = await supabase
        .from('darko_shiny_history')
        .select('*')
        .eq('nba_id', nbaId)
        .order('date', { ascending: false })
        .limit(limit);

    if (error) throw error;
    // Reverse so oldest first (for charts)
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
    if (data.length === 0) throw new Error(`Player ${nbaId} not found`);
    return data[0];
}
