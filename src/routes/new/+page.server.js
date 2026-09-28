import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { getActivePlayers } from '$lib/server/supabase.js';
import { ASK_TEAMS } from '$lib/utils/askDarko.js';
import { leagueTeamRatings } from '$lib/utils/teamDna.js';
import { currentNews } from '$lib/utils/whatsNew.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function load({ setHeaders }) {
    // Items drop the moment they turn 30 days old, so the edge keeps a page for an hour at most.
    setEdgeCache(setHeaders, { edgeSMaxAge: 3600, swr: 3600, sie: 86400 });
    const items = currentNews(new Date());
    return { items, topTeam: items.some((item) => item.team) ? await topRatedTeam() : null };
}

/** The team with the best DARKO rating, for the Team DNA card; null if ratings don't load. */
async function topRatedTeam() {
    try {
        const league = leagueTeamRatings((await getActivePlayers()) ?? []).filter((team) => team.minutes > 0);
        if (!league.length) return null;
        const best = league.reduce((top, team) => (team.rating > top.rating ? team : top));
        const team = ASK_TEAMS.find((entry) => entry.abbr === best.abbr);
        return team ? { abbr: team.abbr, nickname: team.nickname } : null;
    } catch {
        return null;
    }
}
