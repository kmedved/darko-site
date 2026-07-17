import { json } from '@sveltejs/kit';
import {
    getWowyAdjustedAllTimePage,
    getWowyAllTimePage,
    WOWY_ALL_TIME_PAGE_SIZE
} from '$lib/server/supabase.js';
import { setEdgeCache } from '$lib/server/cacheHeaders.js';

export async function GET({ url, setHeaders }) {
    const ratingMode = url.searchParams.get('rating') === 'adjusted'
        ? 'adjusted'
        : 'average';

    try {
        const options = {
            limit: numericParam(url, 'limit') ?? WOWY_ALL_TIME_PAGE_SIZE,
            offset: numericParam(url, 'offset') ?? 0,
            minPossessions: numericParam(url, 'min_possessions'),
            maxPossessions: numericParam(url, 'max_possessions'),
            search: textParam(url, 'search'),
            team: textParam(url, 'team'),
            position: textParam(url, 'position'),
            minHeight: numericParam(url, 'min_height'),
            maxHeight: numericParam(url, 'max_height'),
            sortColumn: textParam(url, 'sort') ?? 'wowy_rapm',
            sortDirection: textParam(url, 'direction') ?? 'desc'
        };
        const page = ratingMode === 'adjusted'
            ? await getWowyAdjustedAllTimePage(options)
            : await getWowyAllTimePage(options);

        setEdgeCache(setHeaders, {
            edgeSMaxAge: 300,
            swr: 3600,
            sie: 86400
        });
        return json(page);
    } catch (error) {
        if (error instanceof TypeError) {
            return json({ error: error.message }, { status: 400 });
        }
        throw error;
    }
}

function textParam(url, name) {
    const value = url.searchParams.get(name);
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized || null;
}

function numericParam(url, name) {
    const value = textParam(url, name);
    if (value === null) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new TypeError(`Invalid ${name.replaceAll('_', ' ')}: ${value}`);
    }
    return parsed;
}
