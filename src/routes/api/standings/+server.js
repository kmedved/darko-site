import { error, json } from '@sveltejs/kit';

import { getConferenceStandings } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET({ setHeaders, url }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    const conference = url.searchParams.get('conference')?.trim();
    const normalizedConference = conference?.toLowerCase();
    if (normalizedConference && normalizedConference !== 'east' && normalizedConference !== 'west') {
        throw error(400, "Invalid conference. Use 'East' or 'West'.");
    }

    try {
        if (normalizedConference) {
            const canonicalConference = normalizedConference === 'east' ? 'East' : 'West';
            const standings = await getConferenceStandings(canonicalConference);
            return json(standings);
        }

        const [east, west] = await Promise.all([
            getConferenceStandings('East'),
            getConferenceStandings('West')
        ]);

        return json({ east, west });
    } catch (e) {
        throw error(500, e?.message || 'Failed to load standings data');
    }
}
