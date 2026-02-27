import { error, json } from '@sveltejs/kit';

import { supabase } from '$lib/supabase.js';

export async function GET({ params, setHeaders }) {
    setHeaders({
        'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    });

    const nbaId = Number(params.id);
    if (!Number.isInteger(nbaId) || nbaId <= 0) {
        throw error(400, 'Invalid nba_id');
    }

    const { data, error: queryError } = await supabase
        .from('player_ratings')
        .select('*')
        .eq('nba_id', nbaId)
        .order('date', { ascending: true });

    if (queryError) {
        throw error(500, queryError.message || 'Failed to load player history');
    }

    return json(data || []);
}
