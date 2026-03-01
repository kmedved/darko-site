import { error, json } from '@sveltejs/kit';
import { getRandomPair } from '$lib/server/supabase.js';

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
    regions: ['pdx1']
};

export async function GET({ setHeaders }) {
    setHeaders({ 'cache-control': 'no-store' });

    try {
        const pair = await getRandomPair();
        return json(pair);
    } catch (e) {
        throw error(500, e?.message || 'Failed to get random pair');
    }
}
