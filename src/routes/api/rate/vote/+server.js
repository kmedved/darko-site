import { error, json } from '@sveltejs/kit';
import { handleRateVoteRequest } from '$lib/server/eloService.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function POST({ request, url }) {
    try {
        const payload = await handleRateVoteRequest({ request, headers: request.headers, url });
        return json(payload);
    } catch (e) {
        if (typeof e?.status === 'number') {
            throw e;
        }

        throw error(500, e?.message || 'Failed to record vote');
    }
}
