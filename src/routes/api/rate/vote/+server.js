import { error, json } from '@sveltejs/kit';
import { recordVote, getRandomPair } from '$lib/server/supabase.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function POST({ request }) {
    let body;
    try {
        body = await request.json();
    } catch {
        throw error(400, 'Invalid JSON');
    }

    const winnerId = Number.parseInt(body?.winner_id, 10);
    const loserId = Number.parseInt(body?.loser_id, 10);

    if (!Number.isInteger(winnerId) || winnerId <= 0) {
        throw error(400, 'Invalid winner_id');
    }
    if (!Number.isInteger(loserId) || loserId <= 0) {
        throw error(400, 'Invalid loser_id');
    }
    if (winnerId === loserId) {
        throw error(400, 'winner_id and loser_id must be different');
    }

    try {
        const [result, nextPair] = await Promise.all([
            recordVote(winnerId, loserId),
            getRandomPair()
        ]);
        return json({ result, nextPair });
    } catch (e) {
        throw error(500, e?.message || 'Failed to record vote');
    }
}
