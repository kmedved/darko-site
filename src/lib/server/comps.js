import { isMissingTable, readLocalTable } from './history.js';
import { supabase } from './supabase.js';

/**
 * A player's historical comps from nba_darko's `player_comps` table, closest first: the 25
 * nearest player-seasons at the same age and what each did over the next five seasons.
 * Before the pipeline first publishes the table, players simply have no comps.
 */
const COMP_COLUMNS = [
    'season',
    'as_of',
    'age',
    'dpm',
    'rank',
    'comp_id',
    'comp_name',
    'comp_season',
    'comp_age',
    'comp_dpm',
    'comp_o_dpm',
    'comp_d_dpm',
    'similarity',
    'weight',
    'dpm_next_1',
    'dpm_next_2',
    'dpm_next_3',
    'dpm_next_4',
    'dpm_next_5'
].join(', ');

export async function getPlayerComps(nbaId) {
    const local = await readLocalTable('player_comps');
    if (local) {
        return local
            .filter((row) => Number(row.nba_id) === nbaId)
            .sort((a, b) => Number(a.rank) - Number(b.rank));
    }
    const { data, error } = await supabase
        .from('player_comps')
        .select(COMP_COLUMNS)
        .eq('nba_id', nbaId)
        .order('rank', { ascending: true });
    if (error) {
        if (isMissingTable(error)) return [];
        throw error;
    }
    return data ?? [];
}
