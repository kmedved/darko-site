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
