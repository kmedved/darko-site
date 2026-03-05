import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

function toEpochMillis(value) {
    if (value instanceof Date) {
        return value.getTime();
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        throw new Error('Invalid timestamp');
    }

    return numeric;
}

function encodeBase64Url(input) {
    return Buffer.from(input, 'utf8').toString('base64url');
}

function decodeBase64Url(input) {
    return Buffer.from(input, 'base64url').toString('utf8');
}

function signValue(encodedPayload, secret) {
    return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

export function normalizePairIds(pairIds) {
    if (!Array.isArray(pairIds) || pairIds.length !== 2) {
        throw new Error('Pair token requires exactly two player IDs');
    }

    const normalized = pairIds
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value > 0)
        .sort((left, right) => left - right);

    if (normalized.length !== 2 || normalized[0] === normalized[1]) {
        throw new Error('Pair token requires two distinct player IDs');
    }

    return normalized;
}

export function pairIdsMatch(pairIds, winnerId, loserId) {
    const [left, right] = normalizePairIds(pairIds);
    const [expectedLeft, expectedRight] = normalizePairIds([winnerId, loserId]);
    return left === expectedLeft && right === expectedRight;
}

export function signPairToken({ pairIds, issuedAt, expiresAt, nonce = randomUUID(), secret }) {
    if (!secret) {
        throw new Error('Missing ELO_SIGNING_SECRET');
    }

    const payload = {
        pairIds: normalizePairIds(pairIds),
        issuedAt: toEpochMillis(issuedAt),
        expiresAt: toEpochMillis(expiresAt),
        nonce: String(nonce)
    };

    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = signValue(encodedPayload, secret);
    return `${encodedPayload}.${signature}`;
}

export function verifyPairToken(cookieValue, { now = Date.now(), secret } = {}) {
    if (!cookieValue || !secret) {
        return null;
    }

    const [encodedPayload, signature] = String(cookieValue).split('.');
    if (!encodedPayload || !signature) {
        return null;
    }

    const expectedSignature = signValue(encodedPayload, secret);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
        signatureBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
        return null;
    }

    try {
        const payload = JSON.parse(decodeBase64Url(encodedPayload));
        const expiresAt = toEpochMillis(payload?.expiresAt);
        if (expiresAt < toEpochMillis(now)) {
            return null;
        }

        return {
            pairIds: normalizePairIds(payload?.pairIds),
            issuedAt: toEpochMillis(payload?.issuedAt),
            expiresAt,
            nonce: String(payload?.nonce || '')
        };
    } catch {
        return null;
    }
}

export function hashRateLimitSubject(ip, { salt } = {}) {
    if (!salt) {
        throw new Error('Missing ELO_RATE_LIMIT_SALT');
    }

    const normalizedIp = String(ip || 'unknown').trim() || 'unknown';
    return createHash('sha256').update(`${salt}:${normalizedIp}`).digest('hex');
}

export function getClientIp(headers) {
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
        const first = forwardedFor.split(',')[0]?.trim();
        if (first) return first;
    }

    const realIp = headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;

    return 'unknown';
}

export function isAllowedVoteOrigin(url, headers) {
    const allowedOrigin = url.origin;
    const origin = headers.get('origin');

    if (origin) {
        return origin === allowedOrigin;
    }

    const referer = headers.get('referer');
    if (!referer) {
        return false;
    }

    try {
        return new URL(referer).origin === allowedOrigin;
    } catch {
        return false;
    }
}

export function getRateLimitWindow(now, minutes = 10) {
    const windowStart = new Date(now);
    if (!Number.isFinite(windowStart.getTime())) {
        throw new Error('Invalid rate limit timestamp');
    }

    const roundedMinutes = Math.max(1, Number.parseInt(String(minutes), 10) || 10);
    windowStart.setUTCSeconds(0, 0);
    const currentMinute = windowStart.getUTCMinutes();
    windowStart.setUTCMinutes(currentMinute - (currentMinute % roundedMinutes));
    return windowStart;
}

export function assertWithinRateLimit({ count, limit, label = 'requests' } = {}) {
    if (!Number.isFinite(count) || !Number.isFinite(limit)) {
        throw new Error('Invalid rate limit inputs');
    }

    if (count > limit) {
        const rateLimitError = new Error(`Too many ${label}. Please try again soon.`);
        rateLimitError.status = 429;
        throw rateLimitError;
    }

    return count;
}
