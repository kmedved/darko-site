import { getConferenceStandings } from '$lib/supabase.js';

export async function load({ setHeaders }) {
    setHeaders({
        'cache-control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300'
    });

    const [eastStandings, westStandings] = await Promise.all([
        getConferenceStandings('East'),
        getConferenceStandings('West')
    ]);

    return {
        eastStandings,
        westStandings
    };
}
