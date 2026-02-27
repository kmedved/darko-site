import { getConferenceStandings } from '$lib/supabase.js';

export async function load({ setHeaders }) {
    setHeaders({
        'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400'
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
