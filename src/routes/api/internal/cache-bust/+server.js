import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { clearAllCaches } from '$lib/server/supabase.js';

/**
 * Invalidate Vercel CDN edge cache via the Edge Cache API.
 * Uses wildcard tag "*" to invalidate all cached responses for the project.
 *
 * Requires env vars:
 *   VERCEL_API_TOKEN   – personal token from https://vercel.com/account/tokens
 *   VERCEL_PROJECT_ID  – project ID from Project Settings → General
 *   VERCEL_TEAM_ID     – team/account ID from Team Settings → General
 */
async function purgeVercelCdn() {
    const token = env.VERCEL_API_TOKEN;
    const projectId = env.VERCEL_PROJECT_ID;
    const teamId = env.VERCEL_TEAM_ID;

    if (!token || !projectId) {
        return { purged: false, reason: 'VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set' };
    }

    const url = new URL('https://api.vercel.com/v1/edge-cache/invalidate-by-tags');
    url.searchParams.set('projectIdOrName', projectId);
    if (teamId) {
        url.searchParams.set('teamId', teamId);
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tags: ['*'] })
    });

    if (!res.ok) {
        const body = await res.text();
        return { purged: false, status: res.status, reason: body };
    }

    return { purged: true };
}

export async function POST({ request }) {
    const secret = env.CRON_SECRET;
    const auth = request.headers.get('authorization');

    if (!secret || auth !== `Bearer ${secret}`) {
        throw error(401, 'Unauthorized');
    }

    const cleared = clearAllCaches();
    const cdn = await purgeVercelCdn();

    return json({
        ok: true,
        entriesCleared: cleared,
        cdnPurge: cdn,
        timestamp: new Date().toISOString()
    });
}
