import { createHmac } from 'node:crypto';

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

// The client address Vercel sets on every request. Vercel overwrites x-real-ip and x-forwarded-for with the
// connecting client's IP, so neither can be spoofed. cf-connecting-ip and the User-Agent are whatever the client
// sends (the site is not behind Cloudflare), so they must not choose a rate-limit bucket.
export function getVoteClientAddress(headers) {
    const realIp = (headers.get('x-real-ip') || '').trim();
    const forwardedFor = (headers.get('x-forwarded-for') || '').split(',')[0].trim();
    return realIp || forwardedFor;
}

// One bucket per client: an IPv4 address, or an IPv6 /64, the block one subscriber usually holds, so cycling
// addresses inside it gains nothing. An IPv4-mapped IPv6 address counts as its IPv4 address. Anything unreadable
// shares one bucket.
export function voteClientKey(address) {
    const first = String(address || '').split(',')[0].trim().toLowerCase()
        .replace(/^\[|\]$/g, '').split('%')[0];
    const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
    const mapped = first.startsWith('::ffff:') ? first.slice(7) : '';
    if (ipv4.test(mapped)) {
        return mapped;
    }
    if (ipv4.test(first)) {
        return first;
    }

    const halves = first.split('::');
    if (!first.includes(':') || halves.length > 2) {
        return 'unknown';
    }
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
    const groups = halves.length === 2
        ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right]
        : left;
    if (groups.length !== 8 || !groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) {
        return 'unknown';
    }
    return `${groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

// The vote rate-limit subject: a salted hash of the client's bucket, so no address is stored.
export function getVoteRateLimitSubject(headers, salt) {
    return createHmac('sha256', salt)
        .update(voteClientKey(getVoteClientAddress(headers)))
        .digest('hex');
}
