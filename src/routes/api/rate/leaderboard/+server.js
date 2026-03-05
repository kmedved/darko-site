import { error, json } from '@sveltejs/kit';
import { getEloLeaderboard } from '$lib/server/supabase.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET({ url, setHeaders }) {
    setHeaders({ 'cache-control': 'no-store' });

    const limit = Math.min(
        Math.max(Number.parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1),
        200
    );

    try {
        const leaderboard = await getEloLeaderboard(limit);
        return json(leaderboard);
    } catch (e) {
        throw error(500, e?.message || 'Failed to get leaderboard');
    }
}
