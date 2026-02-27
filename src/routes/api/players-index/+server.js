import { error, json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

const PLAYERS_INDEX_COLUMNS =
    'nba_id, player_name, team_name, position, dpm, o_dpm, d_dpm, box_dpm, box_odpm, box_ddpm, tr_fg3_pct, tr_ft_pct, date';

export async function GET({ setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 86400,
        swr: 86400,
        sie: 86400
    });

    const { data, error: qerr } = await supabase
        .from('darko_shiny_history')
        .select(PLAYERS_INDEX_COLUMNS)
        .order('date', { ascending: false })
        .limit(8000);

    if (qerr) {
        throw error(500, qerr.message || 'Failed to load players index');
    }

    const seen = new Set();
    const rows = [];

    for (const row of data || []) {
        if (!row || !row.nba_id) continue;
        if (seen.has(row.nba_id)) continue;
        seen.add(row.nba_id);
        rows.push(row);
    }

    rows.sort((a, b) => {
        const aName = a.player_name || '';
        const bName = b.player_name || '';
        return aName.localeCompare(bName);
    });

    return json(rows);
}
