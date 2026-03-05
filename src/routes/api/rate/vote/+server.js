import { error, json } from '@sveltejs/kit';
import { handleRateVoteRequest } from '$lib/server/eloService.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function POST(event) {
    try {
        const payload = await handleRateVoteRequest(event);
        return json(payload);
    } catch (e) {
        if (typeof e?.status === 'number') {
            throw e;
        }

        throw error(500, e?.message || 'Failed to record vote');
    }
}
