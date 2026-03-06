import { error } from '@sveltejs/kit';
import {
    getRandomPair,
    recordVote
} from '$lib/server/supabase.js';
import { isAllowedVoteOrigin } from '$lib/server/eloSecurity.js';

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

    let result;
    try {
        result = await recordVote(winnerId, loserId);
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
