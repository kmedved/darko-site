export function setEdgeCache(
    setHeaders,
    {
        browserMaxAge = 0,
        edgeSMaxAge = 3600,
        swr = 86400,
        sie = 86400
    } = {}
) {
    const browser = `public, max-age=${browserMaxAge}${browserMaxAge === 0 ? ', must-revalidate' : ''}`;
    const edge = `public, s-maxage=${edgeSMaxAge}, stale-while-revalidate=${swr}, stale-if-error=${sie}`;

    setHeaders({
        'cache-control': browser,
        'cdn-cache-control': edge,
        'vercel-cdn-cache-control': edge
    });
}
