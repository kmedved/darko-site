import { getConferenceStandings, getLatestPlayedSeason, getLeagueWinDistribution } from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { leagueWinDistributions } from '$lib/utils/winDistribution.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function load({ setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 3600,
        swr: 86400,
        sie: 86400
    });

    // The season's label, for when the simulation has nothing left to play (a finished season).
    // The win ranges are a side panel: a failed or incomplete read leaves them out, not the page.
    const [eastStandings, westStandings, playedSeason, winRows] = await Promise.all([
        getConferenceStandings('East'),
        getConferenceStandings('West'),
        getLatestPlayedSeason().catch(() => null),
        getLeagueWinDistribution().catch(() => null)
    ]);
    const teamNames = [...(eastStandings || []), ...(westStandings || [])].map((row) => row.team_name);

    return {
        eastStandings,
        westStandings,
        playedSeason,
        winDistributions: winRows ? leagueWinDistributions(winRows, teamNames) : null
    };
}
