/**
 * The leaderboard's question, carried in the URL so a view can be shared, reloaded and returned
 * to: the filters, the sort, the Distribution's stat and the column set. The page's own data
 * parameters, the Time Machine's ?asof= and the season picker's ?season=, are left as they are.
 */

import { teamAbbr } from './teamAbbreviations.js';

/** The stat ranges the Modern view filters by, each bound optional. Ages count in whole years. */
export const RANGE_FILTERS = Object.freeze([
    { key: 'age', field: 'age', label: 'Age', step: 1, wholeYears: true },
    { key: 'mpg', field: 'x_minutes', label: 'MPG', step: 1 },
    { key: 'dpm', field: 'dpm', label: 'DPM', step: 0.5, signed: true },
    { key: 'off', field: 'o_dpm', label: 'Off', step: 0.5, signed: true },
    { key: 'def', field: 'd_dpm', label: 'Def', step: 0.5, signed: true }
]);

export const DEFAULT_LEADERBOARD_STATE = Object.freeze({
    team: 'all',
    position: 'all',
    age: 'all',
    watch: false,
    q: '',
    sort: 'dpm',
    dir: 'desc',
    dist: 'dpm',
    cols: 'all',
    ranges: Object.freeze({})
});

const RANGE_PARAMS = RANGE_FILTERS.flatMap(({ key }) => [`${key}_min`, `${key}_max`]);
const STATE_PARAMS = ['team', 'pos', 'age', 'watch', 'q', 'sort', 'dir', 'dist', 'cols', ...RANGE_PARAMS];
const MAX_QUERY_LENGTH = 60;

function numberOrNull(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/** Only the ranges with a bound set: { dpm: { min: 2, max: null } }. */
export function cleanRanges(ranges) {
    const clean = {};
    for (const { key } of RANGE_FILTERS) {
        const min = numberOrNull(ranges?.[key]?.min);
        const max = numberOrNull(ranges?.[key]?.max);
        if (min !== null || max !== null) clean[key] = { min, max };
    }
    return clean;
}

/** Whether a player is inside every range set; a player without the stat is outside it. */
export function matchesRanges(player, ranges) {
    for (const filter of RANGE_FILTERS) {
        const range = ranges?.[filter.key];
        if (!range || (range.min === null && range.max === null)) continue;
        let value = Number.parseFloat(player?.[filter.field]);
        if (!Number.isFinite(value)) return false;
        if (filter.wholeYears) value = Math.floor(value);
        if (range.min !== null && value < range.min) return false;
        if (range.max !== null && value > range.max) return false;
    }
    return true;
}

/**
 * The state a URL asks for. Anything unknown falls back to the default: a team the board
 * doesn't have, a position or age group, Distribution stat or column set not among `options`.
 */
export function readLeaderboardState(params, { teams = [], positions = [], ages = [], dists = [], columnSets = [] } = {}) {
    const get = (key) => params?.get(key)?.trim() ?? '';
    const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);
    const team = get('team').toUpperCase();
    const ranges = {};
    for (const { key } of RANGE_FILTERS) {
        ranges[key] = { min: numberOrNull(get(`${key}_min`)), max: numberOrNull(get(`${key}_max`)) };
    }
    return {
        team: (team && teams.find((name) => teamAbbr(name) === team)) || 'all',
        position: pick(get('pos'), positions, 'all'),
        age: pick(get('age'), ages, 'all'),
        watch: get('watch') === '1',
        q: get('q').slice(0, MAX_QUERY_LENGTH),
        sort: /^[a-z0-9_]+$/.test(get('sort')) ? get('sort') : 'dpm',
        dir: get('dir') === 'asc' ? 'asc' : 'desc',
        dist: pick(get('dist'), dists, 'dpm'),
        cols: pick(get('cols'), columnSets, 'all'),
        ranges: cleanRanges(ranges)
    };
}

/** `base` with the state's parameters in place of any old ones; defaults are left out. */
export function leaderboardSearchParams(state, base = '') {
    const params = new URLSearchParams(base);
    for (const key of STATE_PARAMS) params.delete(key);
    const put = (key, value, fallback) => {
        if (value !== undefined && value !== null && value !== '' && value !== fallback) params.set(key, String(value));
    };
    put('team', state.team && state.team !== 'all' ? teamAbbr(state.team) : null);
    put('pos', state.position, 'all');
    put('age', state.age, 'all');
    if (state.watch) params.set('watch', '1');
    put('q', state.q?.trim().slice(0, MAX_QUERY_LENGTH));
    put('sort', state.sort, 'dpm');
    put('dir', state.dir, 'desc');
    put('dist', state.dist, 'dpm');
    put('cols', state.cols, 'all');
    for (const [key, range] of Object.entries(cleanRanges(state.ranges))) {
        put(`${key}_min`, range.min);
        put(`${key}_max`, range.max);
    }
    return params;
}

/** Whether two states ask the same question, as their URLs would say it. */
export function sameLeaderboardState(a, b) {
    return leaderboardSearchParams(a).toString() === leaderboardSearchParams(b).toString();
}

/** "DPM ≥ +2", "MPG ≤ 30", "Age 22 to 25". */
export function rangeLabel(filter, range) {
    const min = range?.min ?? null;
    const max = range?.max ?? null;
    const format = (n) => (filter.signed && n > 0 ? `+${n}` : String(n));
    if (min !== null && max !== null) return `${filter.label} ${format(min)} to ${format(max)}`;
    if (min !== null) return `${filter.label} ≥ ${format(min)}`;
    if (max !== null) return `${filter.label} ≤ ${format(max)}`;
    return null;
}

/** One chip per filter in force, so a reader can see why a player is missing and undo it. */
export function filterChips({ team, position, age, watch, q, ranges }, { positions = [], ages = [] } = {}) {
    const chips = [];
    if (team && team !== 'all') chips.push({ key: 'team', label: teamAbbr(team) });
    if (position && position !== 'all') {
        chips.push({ key: 'position', label: positions.find((group) => group.key === position)?.label ?? position });
    }
    if (age && age !== 'all') chips.push({ key: 'age', label: ages.find((group) => group.key === age)?.label ?? age });
    if (watch) chips.push({ key: 'watch', label: 'Watchlist' });
    if (q?.trim()) chips.push({ key: 'q', label: `“${q.trim()}”` });
    for (const filter of RANGE_FILTERS) {
        const label = rangeLabel(filter, ranges?.[filter.key]);
        if (label) chips.push({ key: `range:${filter.key}`, label });
    }
    return chips;
}
