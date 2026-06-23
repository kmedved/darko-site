import { createHmac } from 'node:crypto';
import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import {
    getRandomPair,
    recordVote
} from '$lib/server/supabase.js';
import { isAllowedVoteOrigin } from '$lib/server/eloSecurity.js';

const RATE_LIMIT_ROUTE = 'rate_vote';
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 60;

let serviceSupabase = null;
let serviceSupabaseKey = null;

function getServiceRoleKey() {
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
        error(503, 'Elo voting is not configured');
    }
    return key;
}

function getServiceSupabase() {
    const key = getServiceRoleKey();
    if (!PUBLIC_SUPABASE_URL) {
        error(503, 'Supabase URL is not configured');
    }

    if (!serviceSupabase || serviceSupabaseKey !== key) {
        serviceSupabase = createClient(PUBLIC_SUPABASE_URL, key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
        serviceSupabaseKey = key;
    }

    return serviceSupabase;
}

function parseVoteLimit() {
    const parsed = Number.parseInt(env.ELO_VOTE_RATE_LIMIT_PER_MINUTE || '', 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_RATE_LIMIT_PER_MINUTE;
}

function getClientAddress(headers) {
    const forwardedFor = headers.get('x-forwarded-for') || '';
    const forwardedAddress = forwardedFor.split(',')[0]?.trim();
    return (
        headers.get('cf-connecting-ip') ||
        headers.get('x-real-ip') ||
        forwardedAddress ||
        'unknown'
    );
}

function getRateLimitSubjectHash(headers, serviceRoleKey) {
    const salt = env.ELO_VOTE_RATE_LIMIT_SALT || serviceRoleKey;
    const address = getClientAddress(headers);
    const userAgent = headers.get('user-agent') || '';
    return createHmac('sha256', salt)
        .update(address)
        .update('\n')
        .update(userAgent)
        .digest('hex');
}

function getRateLimitWindowStartIso(now = Date.now()) {
    return new Date(Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS).toISOString();
}

async function enforceVoteRateLimit(client, headers) {
    const { data, error: rateLimitError } = await client.rpc('check_elo_rate_limit', {
        p_subject_hash: getRateLimitSubjectHash(headers, getServiceRoleKey()),
        p_route: RATE_LIMIT_ROUTE,
        p_window_start: getRateLimitWindowStartIso()
    });

    if (rateLimitError) {
        throw rateLimitError;
    }

    const count = Number.parseInt(data, 10);
    if (Number.isInteger(count) && count > parseVoteLimit()) {
        error(429, 'Too many vote requests');
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

export async function handleRatePairRequest() {
    return getRandomPair();
}

export async function handleRateVoteRequest({ request, headers, url }) {
    if (!isAllowedVoteOrigin(url, headers)) {
        error(403, 'Invalid request origin');
    }

    const { winnerId, loserId } = await parseVoteBody(request);
    const serviceClient = getServiceSupabase();

    await enforceVoteRateLimit(serviceClient, headers);

    let result;
    try {
        result = await recordVote(winnerId, loserId, { client: serviceClient });
    } catch (voteError) {
        error(500, voteError?.message || 'Failed to record vote');
    }

    let nextPair = [];
    let nextPairWarning = null;

    try {
        nextPair = await getRandomPair();
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
