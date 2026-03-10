import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { clearAllCaches } from '$lib/server/supabase.js';

export async function POST({ request }) {
    const secret = env.CRON_SECRET;
    const auth = request.headers.get('authorization');

    if (!secret || auth !== `Bearer ${secret}`) {
        throw error(401, 'Unauthorized');
    }

    const cleared = clearAllCaches();

    return json({
        ok: true,
        entriesCleared: cleared,
        timestamp: new Date().toISOString()
    });
}
