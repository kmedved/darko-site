import { randomUUID } from 'node:crypto';

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getSupabaseAdmin } from '$lib/server/supabaseAdmin.js';
import {
    checkEloRateLimit,
    getRandomPair,
    pruneEloRateLimits,
    recordVote
} from '$lib/server/supabase.js';
import {
    assertWithinRateLimit,
    getClientIp,
    getRateLimitWindow,
    hashRateLimitSubject,
    isAllowedVoteOrigin,
    pairIdsMatch,
    signPairToken,
    verifyPairToken
} from '$lib/server/eloSecurity.js';

const ELO_PAIR_COOKIE = 'elo_pair_token';
const RATE_LIMITS = {
    pair: {
        label: 'pair requests',
        limit: 60,
        route: 'pair'
    },
    vote: {
        label: 'votes',
        limit: 30,
        route: 'vote'
    }
};

function getEloSecrets() {
    if (!env.ELO_SIGNING_SECRET || !env.ELO_RATE_LIMIT_SALT) {
        throw new Error('Missing ELO_SIGNING_SECRET or ELO_RATE_LIMIT_SALT');
    }

    return {
        signingSecret: env.ELO_SIGNING_SECRET,
        rateLimitSalt: env.ELO_RATE_LIMIT_SALT
    };
}

function getCronSecret() {
    if (!env.CRON_SECRET) {
        throw new Error('Missing CRON_SECRET');
    }

    return env.CRON_SECRET;
}

function getPairCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: !dev,
        path: '/api/rate',
        maxAge: 120
    };
}

function clearPairCookie(cookies) {
    cookies.delete(ELO_PAIR_COOKIE, {
        path: '/api/rate'
    });
}

function setPairCookie(cookies, pair) {
    if (!Array.isArray(pair) || pair.length !== 2) {
        clearPairCookie(cookies);
        return;
    }

    const { signingSecret } = getEloSecrets();
    const now = Date.now();
    const token = signPairToken({
        pairIds: pair.map((player) => player?.nba_id),
        issuedAt: now,
        expiresAt: now + 120_000,
        nonce: randomUUID(),
        secret: signingSecret
    });

    cookies.set(ELO_PAIR_COOKIE, token, getPairCookieOptions());
}

async function enforceRateLimit(headers, { route, limit, label }) {
    const { rateLimitSalt } = getEloSecrets();
    const subjectHash = hashRateLimitSubject(getClientIp(headers), {
        salt: rateLimitSalt
    });
    const count = await checkEloRateLimit(subjectHash, route, getRateLimitWindow(new Date()), {
        client: getSupabaseAdmin()
    });

    try {
        assertWithinRateLimit({ count, limit, label });
    } catch (rateLimitError) {
        error(rateLimitError?.status || 429, rateLimitError.message);
    }
}

async function parseVoteBody(request) {
    let body;

    try {
        body = await request.json();
    } catch {
        error(400, 'Invalid JSON');
    }

    const winnerId = Number.parseInt(body?.winner_id, 10);
    const loserId = Number.parseInt(body?.loser_id, 10);

    if (!Number.isInteger(winnerId) || winnerId <= 0) {
        error(400, 'Invalid winner_id');
    }

    if (!Number.isInteger(loserId) || loserId <= 0) {
        error(400, 'Invalid loser_id');
    }

    if (winnerId === loserId) {
        error(400, 'winner_id and loser_id must be different');
    }

    return {
        winnerId,
        loserId
    };
}

function assertValidPairCookie(cookies, winnerId, loserId) {
    const { signingSecret } = getEloSecrets();
    const cookieValue = cookies.get(ELO_PAIR_COOKIE);
    const token = verifyPairToken(cookieValue, {
        secret: signingSecret
    });

    if (!token || !pairIdsMatch(token.pairIds, winnerId, loserId)) {
        error(400, 'Invalid or expired pair token');
    }
}

export async function handleRatePairRequest({ cookies, headers }) {
    await enforceRateLimit(headers, RATE_LIMITS.pair);

    const pair = await getRandomPair();
    setPairCookie(cookies, pair);
    return pair;
}

export async function handleRateVoteRequest({ request, cookies, headers, url }) {
    if (!isAllowedVoteOrigin(url, headers)) {
        error(403, 'Invalid request origin');
    }

    const { winnerId, loserId } = await parseVoteBody(request);
    await enforceRateLimit(headers, RATE_LIMITS.vote);
    assertValidPairCookie(cookies, winnerId, loserId);
    clearPairCookie(cookies);

    let result;
    try {
        result = await recordVote(winnerId, loserId, {
            client: getSupabaseAdmin()
        });
    } catch (voteError) {
        error(500, voteError?.message || 'Failed to record vote');
    }

    let nextPair = [];
    let nextPairWarning = null;

    try {
        nextPair = await getRandomPair();
        setPairCookie(cookies, nextPair);
    } catch (pairError) {
        nextPair = [];
        nextPairWarning = pairError?.message || 'Vote recorded, but failed to fetch next pair';
    }

    return {
        result,
        nextPair,
        nextPairWarning
    };
}

export async function handlePruneEloRateLimits({ request }) {
    const authorization = request.headers.get('authorization');
    if (authorization !== `Bearer ${getCronSecret()}`) {
        error(401, 'Unauthorized');
    }

    const olderThan = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const deleted = await pruneEloRateLimits({
        olderThan,
        client: getSupabaseAdmin()
    });

    return {
        deleted,
        olderThan: olderThan.toISOString()
    };
}
