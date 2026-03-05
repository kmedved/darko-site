import { error, json } from '@sveltejs/kit';
import { handleRatePairRequest } from '$lib/server/eloService.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET(event) {
    const { setHeaders } = event;
    setHeaders({ 'cache-control': 'no-store' });

    try {
        const pair = await handleRatePairRequest(event);
        return json(pair);
    } catch (e) {
        if (typeof e?.status === 'number') {
            throw e;
        }

        throw error(500, e?.message || 'Failed to get random pair');
    }
}
