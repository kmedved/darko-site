import { json } from '@sveltejs/kit';

import { setEdgeCache } from '$lib/server/cacheHeaders.js';
import { metricDefinitions } from '$lib/utils/metricDefinitions.js';
import { metricDisplayLabels } from '$lib/utils/csvPresets.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

function buildColumnGlossary() {
    const glossary = {};
    for (const [key, label] of Object.entries(metricDisplayLabels)) {
        glossary[key] = {
            label,
            description: metricDefinitions[key] || null
        };
    }
    return glossary;
}

export async function GET({ setHeaders }) {
    setEdgeCache(setHeaders, {
        edgeSMaxAge: 86400,
        swr: 86400,
        sie: 86400
    });

    const docs = {
        name: 'DARKO NBA Analytics API',
        description:
            'DARKO (Daily Adjusted and Regressed Kalman Optimized) is a machine learning-driven NBA player projection system. This API provides player ratings, box-score projections, salary valuations, longevity estimates, team standings simulations, and community Elo ratings.',
        base_url: 'https://darko.app',
        endpoints: [
            {
                path: '/api/active-players',
                method: 'GET',
                description:
                    'All active NBA players with current DPM ratings, projected box-score stats, salary valuations, and longevity estimates. Returns ~500 rows, one per active player, sorted by DPM descending.',
                params: {
                    query: {
                        team: {
                            type: 'string',
                            required: false,
                            description:
                                "Filter by exact team name (e.g., 'Denver Nuggets', 'Boston Celtics'). Returns all teams if omitted."
                        }
                    }
                },
                response:
                    'Array of player objects. Each object includes: nba_id, player_name, team_name, position, age, dpm, o_dpm, d_dpm, box_dpm, on_off_dpm, bayes_rapm_total, tr_minutes, x_minutes, x_pace, x_pts_100, x_ast_100, x_orb_100, x_drb_100, x_stl_100, x_blk_100, x_tov_100, x_fga_100, x_fg3a_100, x_fta_100, x_fg_pct, x_fg3_pct, x_ft_pct, tr_fg3_pct, tr_ft_pct, sal_market_fixed, surplus_value, and survivorship columns (s1-s15).',
                cache: '1 hour edge, 24h stale-while-revalidate'
            },
            {
                path: '/api/search-players',
                method: 'GET',
                description:
                    'Full-text search for players by name. Returns up to 15 matching players with current snapshot metrics when available.',
                params: {
                    query: {
                        q: {
                            type: 'string',
                            required: true,
                            description:
                                "Search query, minimum 2 characters (e.g., '?q=jokic'). Returns empty array if fewer than 2 characters."
                        }
                    }
                },
                response:
                    'Array of player objects (max 15). Each includes: nba_id, player_name, team_name, position, dpm, o_dpm, d_dpm, box_dpm, box_odpm, box_ddpm, on_off_dpm, bayes_rapm_total, tr_fg3_pct, tr_ft_pct, x_minutes, x_pace, x_pts_100, date.',
                cache: '2 minutes edge, 1h stale-while-revalidate'
            },
            {
                path: '/api/players-index',
                method: 'GET',
                description:
                    'Complete player index for all players (not just active). Includes current snapshot metrics when available.',
                params: {},
                response:
                    'Array of player objects. Each includes: nba_id, player_name, team_name, position, dpm, o_dpm, d_dpm, box_dpm, box_odpm, box_ddpm, on_off_dpm, bayes_rapm_total, tr_fg3_pct, tr_ft_pct, x_minutes, x_pace, x_pts_100, date.',
                cache: '24 hours edge'
            },
            {
                path: '/api/player/:id/history',
                method: 'GET',
                description:
                    'Career history for a single player. Returns one row per game date with all rating columns in chronological order (oldest first).',
                params: {
                    path: {
                        id: {
                            type: 'number',
                            required: true,
                            description:
                                'NBA player ID (e.g., 203999 for Nikola Jokic)'
                        }
                    },
                    query: {
                        limit: {
                            type: 'number',
                            required: false,
                            description:
                                'Max rows to return. Default 1000, max 2000. Ignored when full=1.'
                        },
                        full: {
                            type: 'string',
                            required: false,
                            description:
                                "Set to '1' to retrieve full career history (paginated internally, up to 5000 rows)."
                        }
                    }
                },
                response:
                    'Standard mode: Array of history rows. Full mode: { rows: [...], truncated: boolean, maxRows: number }. Each row includes: date, season, team_name, dpm, o_dpm, d_dpm, box_dpm, on_off_dpm, bayes_rapm_total, tr_minutes, x_minutes, x_pts_100, x_ast_100, x_fg_pct, x_fg3_pct, x_ft_pct, sal_market_fixed, surplus_value, age, career_game_num, and more.',
                cache: '1 hour edge, 24h stale-while-revalidate'
            },
            {
                path: '/api/player/:id/longevity',
                method: 'GET',
                description:
                    "Longevity trajectory for a single player — how the model's retirement age estimate has changed over their career.",
                params: {
                    path: {
                        id: {
                            type: 'number',
                            required: true,
                            description: 'NBA player ID'
                        }
                    }
                },
                response:
                    'Array of trajectory points. Each includes: season_start, season_start_year, projected_retirement_age.',
                cache: '1 hour edge, 24h stale-while-revalidate'
            },
            {
                path: '/api/longevity',
                method: 'GET',
                description:
                    'Longevity projections for all active players. Includes estimated retirement age, years remaining, and survival probabilities for the next 1-15 seasons.',
                params: {},
                response:
                    'Array of player longevity objects (~500 rows). Each includes: nba_id, player_name, rookie_season, career_games, age, est_retirement_age, years_remaining, p1-p15 (survival probabilities as percentages 0-100).',
                cache: '1 hour edge, 24h stale-while-revalidate'
            },
            {
                path: '/api/standings',
                method: 'GET',
                description:
                    'NBA season simulation standings with win/loss projections, playoff probabilities, seed probabilities, and draft lottery odds.',
                params: {
                    query: {
                        conference: {
                            type: 'string',
                            required: false,
                            description:
                                "Optional conference filter. Accepts 'East' or 'West' (case-insensitive). Omit to get both conferences. Invalid values return 400."
                        }
                    }
                },
                response:
                    "With conference param: Array of team objects. Without: { east: [...], west: [...] }. Each team includes: Rk, team_name, conference, Current (record string), W, L, SRS, Playoffs (%), Win Conf (%), Win Finals (%), Lottery%, ExpPick, seed_1 through seed_10, and playoff structure probabilities.",
                cache: '1 hour edge, 24h stale-while-revalidate'
            },
            {
                path: '/api/standings/:slug',
                method: 'GET',
                description:
                    "Team detail page data including roster with player ratings, season simulation, and win distribution.",
                params: {
                    path: {
                        slug: {
                            type: 'string',
                            required: true,
                            description:
                                "URL-encoded team name (e.g., 'Boston%20Celtics', 'Denver%20Nuggets'). Underscores also work in place of spaces (e.g., 'Boston_Celtics'). Get exact team names from /api/standings."
                        }
                    }
                },
                response:
                    '{ teamName, players: [...], sim: {...} | null, winDist: [...] }. players: active roster with full rating columns. sim: season simulation data (wins, losses, playoff odds). winDist: array of { wins, probability } for win distribution chart.',
                cache: '1 hour edge, 24h stale-while-revalidate'
            },
            {
                path: '/api/rate/leaderboard',
                method: 'GET',
                description:
                    'Community Elo rating leaderboard from head-to-head player voting.',
                params: {
                    query: {
                        limit: {
                            type: 'number',
                            required: false,
                            description:
                                'Number of results (1-200, default 50).'
                        }
                    }
                },
                response:
                    'Array of leaderboard entries. Each includes: nba_id, player_name, team_name, position, elo_rating, total_comparisons, wins, losses.',
                cache: '30 seconds edge, 2 min stale-while-revalidate'
            },
            {
                path: '/api/rate/pair',
                method: 'GET',
                description:
                    'Returns a random pair of players for head-to-head Elo voting.',
                params: {},
                response:
                    'Array of 2 player objects with nba_id, player_name, team_name, position, elo_rating, total_comparisons, wins, losses.',
                cache: 'No cache (fresh pair each request)'
            },
            {
                path: '/api/rate/vote',
                method: 'POST',
                description:
                    'Record an Elo vote. Updates both elo_votes and elo_ratings tables.',
                params: {
                    body: {
                        winner_id: {
                            type: 'number',
                            required: true,
                            description: 'NBA ID of the winning player'
                        },
                        loser_id: {
                            type: 'number',
                            required: true,
                            description:
                                'NBA ID of the losing player. Must differ from winner_id.'
                        }
                    }
                },
                response:
                    '{ result: <vote_result>, nextPair: [<player1>, <player2>], nextPairWarning: null | string }',
                cache: 'No cache'
            }
        ],
        columns: buildColumnGlossary()
    };

    return json(docs);
}
