import { json } from '@sveltejs/kit';
import { handlePruneEloRateLimits } from '$lib/server/eloService.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET(event) {
    const result = await handlePruneEloRateLimits(event);
    return json(result);
}
