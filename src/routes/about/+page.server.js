import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { getModelTotals, getPlayerSeasons } from '$lib/server/daily.js';
import { getActivePlayers, getPlayerSeasonRows, getRookieStarts } from '$lib/server/supabase.js';
import { BLEND_EXAMPLES, LEARN_EXAMPLES } from '$lib/utils/aboutDarko.js';
import { leagueTeamRatings } from '$lib/utils/teamDna.js';
import { teamAbbr } from '$lib/utils/teamAbbreviations.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

// Four places: a rating rounded to two first prints a tenth off (7.35021 as +7.3, not +7.4).
const round = (value, digits = 4) => {
    const n = Number(value);
    return Number.isFinite(n) ? Number(n.toFixed(digits)) : null;
};

/**
 * The About page's live data: today's players (the DPM scale, the "+1 worth" calculator and the
 * DPM blend's examples), what the season table covers, the first "Watch DARKO learn" season and
 * the latest draft class's starting points. Each part fails on its own; the page says less.
 */
export async function load({ setHeaders }) {
    setEdgeCache(setHeaders, { edgeSMaxAge: 3600, swr: 86400, sie: 86400 });

    const example = LEARN_EXAMPLES[0];
    const [active, totals, learnRows, learnSeasons] = await Promise.all([
        getActivePlayers().catch(() => []),
        getModelTotals().catch(() => null),
        getPlayerSeasonRows(example.nba_id, example.season).catch(() => []),
        getPlayerSeasons(example.nba_id).catch(() => null)
    ]);

    const players = (active ?? [])
        .filter((player) => Number.isFinite(Number(player?.dpm)))
        .map((player) => ({
            nba_id: player.nba_id,
            player_name: player.player_name,
            team: teamAbbr(player.team_name) || null,
            dpm: round(player.dpm),
            o_dpm: round(player.o_dpm),
            d_dpm: round(player.d_dpm),
            box_dpm: round(player.box_dpm),
            on_off_dpm: round(player.on_off_dpm),
            minutes: round(player.x_minutes, 1) ?? 0,
            salary: Number.isFinite(Number(player.sal_market_fixed)) ? Math.round(Number(player.sal_market_fixed)) : null
        }));
    const teams = leagueTeamRatings(active ?? []).filter((team) => team.minutes > 0);
    const leagueMean = teams.length ? teams.reduce((sum, team) => sum + team.rating, 0) / teams.length : 0;

    // The latest class with games played: the one drafted before the latest season.
    const latestSeason = Math.max(0, ...(active ?? []).map((player) => Number(player.season) || 0));
    const rookieYear = (latestSeason || totals?.lastSeason || new Date().getUTCFullYear()) - 1;
    const rookies = await getRookieStarts(rookieYear).catch(() => []);

    const byId = new Map(players.map((player) => [player.nba_id, player]));
    const blend = BLEND_EXAMPLES.map((entry) => {
        const player = byId.get(entry.nba_id);
        return player ? { ...entry, ...player } : null;
    }).filter(Boolean);

    return {
        players,
        leagueMean: round(leagueMean, 3) ?? 0,
        totals,
        learn: {
            ...example,
            seasons: (learnSeasons ?? []).map((row) => Number(row.season)).filter(Number.isInteger).sort((a, b) => b - a),
            rows: learnRows ?? []
        },
        rookies: { year: rookieYear, players: rookies ?? [] },
        blend
    };
}
