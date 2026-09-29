import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { resolveSupabaseConfig } from '$lib/utils/supabaseConfig.js';
import { teamId as nbaTeamId } from '$lib/utils/teamAbbreviations.js';
import {
    LINEUP_MIN_POSSESSIONS,
    LINEUP_QUERY_VARIANTS,
    LINEUP_SIZE_CONFIG,
    groupLineupRows,
    normalizeLineupVariant
} from './lineupRatings.js';
import { createActivePlayersAccessor } from './activePlayersCache.js';
import { asOfWindowStart, locateDate } from '$lib/utils/timeMachine.js';
import { heightOptionsFromRows, teamOptionsFromRows } from '$lib/utils/wowyFilterOptions.js';
import { leagueTeamRatings } from '$lib/utils/teamDna.js';
import { fillLatestRapm } from '$lib/utils/latestRapm.js';

const { supabaseUrl, supabaseAnonKey } = resolveSupabaseConfig({
    url: PUBLIC_SUPABASE_URL,
    key: PUBLIC_SUPABASE_ANON_KEY
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

const cacheStore = new Map();
const inFlightStore = new Map();
const MAX_CACHE_ENTRIES = 300;

const CACHE_MS = {
    activePlayers: 60_000,
    activeWowyPlayers: 300_000,
    wowyAllTimePlayers: 3_600_000,
    wowyAdjustedAllTimePlayers: 3_600_000,
    wowyLeaderboardSeasons: 3_600_000,
    wowyAdjustedSeasonPlayers: 300_000,
    leaderboardSeasons: 3_600_000,
    seasonStartPlayers: 3_600_000,
    playersAsOf: 3_600_000,
    playersIndex: 300_000,
    playerHistory: 300_000,
    fullPlayerHistory: 1_800_000,
    wowyPlayerHistory: 1_800_000,
    wowyPublication: 300_000,
    searchPlayers: 120_000,
    longevityRows: 300_000,
    longevityTrajectory: 600_000,
    conferenceStandings: 60_000,
    teamSimulation: 60_000,
    teamWinDistribution: 60_000,
    lineupRatings: 3_600_000,
    lineupSizeCounts: 3_600_000,
    latestRapmSnapshot: 3_600_000,
    eloLeaderboard: 30_000
};

export const WOWY_ALL_TIME_PAGE_SIZE = 100;

function cacheKey(prefix, value = '') {
    return `${prefix}:${value}`;
}

function readCache(key, maxAgeMs) {
    const entry = cacheStore.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > maxAgeMs) {
        cacheStore.delete(key);
        return undefined;
    }

    return entry.value;
}

function writeCache(key, value) {
    // Keep cache bounded to avoid unbounded growth from high-cardinality keys.
    if (cacheStore.size >= MAX_CACHE_ENTRIES && !cacheStore.has(key)) {
        const oldestKey = cacheStore.keys().next().value;
        if (oldestKey) {
            cacheStore.delete(oldestKey);
        }
    }

    cacheStore.set(key, {
        timestamp: Date.now(),
        value
    });
}

function invalidateCachePrefix(prefix) {
    for (const key of cacheStore.keys()) {
        if (key.startsWith(prefix)) {
            cacheStore.delete(key);
        }
    }
}

/** Clear all in-memory caches. Returns the number of entries removed. */
export function clearAllCaches() {
    const count = cacheStore.size;
    cacheStore.clear();
    return count;
}

async function runCached(key, maxAgeMs, loader) {
    const cached = readCache(key, maxAgeMs);
    if (cached !== undefined) {
        return cached;
    }

    const inFlight = inFlightStore.get(key);
    if (inFlight) {
        return inFlight;
    }

    const request = loader()
        .then((value) => {
            writeCache(key, value);
            return value;
        })
        .finally(() => {
            inFlightStore.delete(key);
        });

    inFlightStore.set(key, request);
    return request;
}

const RATING_COLUMNS = [
    'nba_id',
    'date',
    'season',
    'team_name',
    'tm_id',
    'future_game',
    'active_roster',
    'available',
    'poss',
    'dpm',
    'o_dpm',
    'd_dpm',
    'box_dpm',
    'box_odpm',
    'box_ddpm',
    'on_off_dpm',
    'on_off_odpm',
    'on_off_ddpm',
    'age',
    'career_game_num',
    'seconds_played',
    'position',
    'position_num',
    'x_position',
    'bayes_rapm_off',
    'bayes_rapm_def',
    'bayes_rapm_total',
    'rapm_exposure',
    'x_minutes',
    'x_pace',
    'x_pts_100',
    'x_ast_100',
    'x_orb_100',
    'x_drb_100',
    'x_stl_100',
    'x_blk_100',
    'x_tov_100',
    'x_fga_100',
    'x_fg3a_100',
    'x_fta_100',
    'x_fg_pct',
    'x_fg3_pct',
    'x_ft_pct',
    'tr_minutes',
    'tr_starter',
    'tr_fg3_pct',
    'tr_ft_pct',
    'projected_years_remaining',
    'projected_years_remaining_cal',
    'x_retirement_age',
    'x_retirement_age_cal',
    's1',
    's2',
    's3',
    's4',
    's5',
    's6',
    's7',
    's8',
    's9',
    's10',
    's11',
    's12',
    's13',
    's14',
    's15',
    'sal_market_fixed',
    'surplus_value',
    'actual_salary',
    'warp'
].join(', ');

// The Trajectories page needs complete careers but only its selectable metrics.
// Keeping this projection narrow avoids shipping the production table's modeling fields.
const TRAJECTORY_RATING_COLUMNS = [
    'nba_id',
    'date',
    'season',
    'team_name',
    'tm_id',
    'dpm',
    'o_dpm',
    'd_dpm',
    'box_dpm',
    'box_odpm',
    'box_ddpm',
    'on_off_dpm',
    'age',
    'career_game_num',
    'bayes_rapm_total',
    'x_minutes',
    'x_pace',
    'x_pts_100',
    'x_ast_100',
    'x_fg_pct',
    'x_fg3_pct',
    'x_ft_pct',
    'sal_market_fixed'
].join(', ');

// Player profiles chart complete careers, but snapshot-only metadata and
// longevity projections are loaded once rather than repeated for every game.
// season, seconds_played and future_game let the Seismograph tell games from rest days;
// opp_id names each game's opponent.
const PLAYER_PROFILE_RATING_COLUMNS = [
    'nba_id',
    'date',
    'season',
    'seconds_played',
    'future_game',
    'team_name',
    'opp_id',
    'tm_id',
    'dpm',
    'o_dpm',
    'd_dpm',
    'box_dpm',
    'box_odpm',
    'box_ddpm',
    'on_off_dpm',
    'age',
    'bayes_rapm_total',
    'x_minutes',
    'x_pace',
    'x_pts_100',
    'x_ast_100',
    'x_fg_pct',
    'x_fg3_pct',
    'x_ft_pct',
    'tr_fg3_pct',
    'tr_ft_pct',
    'sal_market_fixed'
].join(', ');

const PLAYERS_DIM_COLUMNS = [
    'nba_id',
    'player_name',
    'current_team',
    'position',
    'rookie_season'
].join(', ');
// Where a player was drafted and is from, and their size, for the player page's header only:
// PLAYERS_DIM_COLUMNS also feeds the players index that search downloads.
const PLAYER_DRAFT_COLUMNS = 'nba_id, draft_year, draft_slot, country, height, weight';

const WOWY_RATING_COLUMNS = [
    'nba_id',
    'player_name',
    'date',
    'season',
    'career_game_num',
    'age',
    'wowy_rapm',
    'wowy_orapm',
    'wowy_drapm',
    'league',
    'cross_league_level_identified'
].join(', ');

const TEAM_FALLBACK_LOOKBACK_DAYS = 370;

const LINEUP_RATING_COLUMNS = [
    'variant',
    'lineup_size',
    'min_season_poss',
    'total_net_rating',
    'total_off_rating',
    'total_def_rating',
    'net_synergy',
    'off_synergy',
    'def_synergy',
    'tm_id',
    'player_1',
    'player_2',
    'player_3',
    'player_4',
    'player_5',
    'player_1_id',
    'player_2_id',
    'player_3_id',
    'player_4_id',
    'player_5_id'
].join(', ');

export const MAX_FULL_HISTORY_ROWS = 5_000;
export const MAX_WOWY_HISTORY_ROWS = 3_000;

function sortByDpmDesc(rows = []) {
    return rows
        .slice()
        .sort((a, b) => {
            const left = Number.parseFloat(a?.dpm);
            const right = Number.parseFloat(b?.dpm);
            if (!Number.isFinite(left) && !Number.isFinite(right)) return 0;
            if (!Number.isFinite(left)) return 1;
            if (!Number.isFinite(right)) return -1;
            return right - left;
        });
}

function sortByWowyRapmDesc(rows = []) {
    return rows
        .slice()
        .sort((a, b) => {
            const left = Number.parseFloat(a?.wowy_rapm);
            const right = Number.parseFloat(b?.wowy_rapm);
            if (!Number.isFinite(left) && !Number.isFinite(right)) {
                return String(a?.player_name || '').localeCompare(String(b?.player_name || ''));
            }
            if (!Number.isFinite(left)) return 1;
            if (!Number.isFinite(right)) return -1;
            if (right !== left) return right - left;
            return String(a?.player_name || '').localeCompare(String(b?.player_name || ''));
        });
}

function firstFiniteNumber(...values) {
    for (const value of values) {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

function normalizeProbability(value) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return null;
    return parsed <= 1 ? parsed * 100 : parsed;
}

function formatSeasonLabel(startYear) {
    const endSuffix = String((startYear + 1) % 100).padStart(2, '0');
    return `${startYear}-${endSuffix}`;
}

const POSITION_MAP = {
    'Guard': 'G', 'Forward': 'F', 'Center': 'C',
    'Guard-Forward': 'G-F', 'Forward-Guard': 'F-G',
    'Forward-Center': 'F-C', 'Center-Forward': 'C-F',
    'SG': 'G', 'SF': 'F', 'PF': 'F'
};

const WOWY_FILTER_POSITION_MAP = {
    G: 'G', PG: 'G', SG: 'G', GUARD: 'G',
    'G-F': 'G-F', 'F-G': 'G-F',
    'GUARD-FORWARD': 'G-F', 'FORWARD-GUARD': 'G-F',
    F: 'F', SF: 'F', PF: 'F', FORWARD: 'F',
    'F-C': 'F-C', 'C-F': 'F-C',
    'FORWARD-CENTER': 'F-C', 'CENTER-FORWARD': 'F-C',
    C: 'C', CENTER: 'C'
};

function normalizePosition(pos) {
    if (!pos) return null;
    return POSITION_MAP[pos] ?? pos;
}

// Match public.normalize_wowy_filter_position(). This is deliberately
// separate from display `position`: historical WOWY rows do not inherit a
// present-day position, while their filter field is explicit bio metadata.
function normalizeWowyFilterPosition(position) {
    if (typeof position !== 'string') return null;
    const normalized = position.trim().toUpperCase();
    if (!normalized) return null;
    if (WOWY_FILTER_POSITION_MAP[normalized]) {
        return WOWY_FILTER_POSITION_MAP[normalized];
    }

    if (!/^[1-5](?:\.0|\.5)?$/.test(normalized)) return null;
    const numericPosition = Number.parseFloat(normalized);
    if (numericPosition <= 2) return 'G';
    if (numericPosition < 3) return 'G-F';
    if (numericPosition <= 3) return 'F';
    if (numericPosition < 5) return 'F-C';
    return 'C';
}

function normalizeHeightInches(value) {
    const height = Number.parseFloat(value);
    return Number.isFinite(height) && height >= 60 && height <= 96 ? height : null;
}

function normalizedTeamName(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function normalizedTeamList(value) {
    const values = Array.isArray(value) ? value : [value];
    const unique = new Set();

    for (const item of values) {
        const normalized = normalizedTeamName(item);
        if (normalized) unique.add(normalized);
    }

    return [...unique];
}

function isRealTeamId(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0;
}

function resolveTeamId(row, teamName, teamFallback) {
    if (isRealTeamId(row?.tm_id)) return row.tm_id;
    if (teamFallback?.team_name && teamName === teamFallback.team_name && isRealTeamId(teamFallback.tm_id)) {
        return teamFallback.tm_id;
    }
    const mappedTeamId = nbaTeamId(teamName);
    if (isRealTeamId(mappedTeamId)) return mappedTeamId;
    return row?.tm_id ?? null;
}

function mergeWithPlayerDim(row, playerDim, teamFallback) {
    const teamName =
        normalizedTeamName(row.team_name) ??
        normalizedTeamName(playerDim?.current_team) ??
        normalizedTeamName(teamFallback?.team_name);

    return {
        ...row,
        player_name: row.player_name ?? playerDim?.player_name ?? null,
        team_name: teamName,
        tm_id: resolveTeamId(row, teamName, teamFallback),
        position: normalizePosition(row.position ?? playerDim?.position ?? null),
        rookie_season: row.rookie_season ?? playerDim?.rookie_season ?? null
    };
}

function mergeWithActiveWowyTeamFallback(row, teamFallback) {
    const teamName = normalizedTeamName(row?.team_name);
    const hasResolvableTeam =
        isRealTeamId(row?.tm_id) ||
        isRealTeamId(nbaTeamId(teamName));

    if (!hasResolvableTeam && normalizedTeamName(teamFallback?.team_name)) {
        return mergeWithPlayerDim(
            {
                ...row,
                team_name: teamFallback.team_name,
                tm_id: teamFallback.tm_id
            },
            null,
            teamFallback
        );
    }

    return mergeWithPlayerDim(row, null, teamFallback);
}

function normalizeWowyLeaderboardRows(data) {
    return (Array.isArray(data) ? data : [])
        .map((row) => {
            const nbaId = Number(row?.nba_id);
            if (!Number.isInteger(nbaId) || nbaId === 0) return null;

            const season = Number(row?.season);
            const leaderboardRank = Number(row?.leaderboard_rank);
            const snapshotContext = normalizedTeamName(row?.snapshot_context);
            const isHistoricalSeasonSummary =
                snapshotContext === 'opening-game' ||
                snapshotContext === 'season-average' ||
                snapshotContext === 'season-adjusted';
            const teamName = normalizedTeamName(row.team_name);
            const teamCode = normalizedTeamName(row.team_code);
            const teamCodes = normalizedTeamList(row.team_codes);
            const teamNames = normalizedTeamList(row.team_names);

            if (teamCodes.length === 0 && teamCode) teamCodes.push(teamCode);
            if (teamNames.length === 0 && teamName) teamNames.push(teamName);

            return {
                nba_id: nbaId,
                season: Number.isInteger(season) && season >= 1957 ? season : null,
                leaderboard_rank:
                    Number.isInteger(leaderboardRank) && leaderboardRank > 0
                        ? leaderboardRank
                        : null,
                player_name: row.player_name ?? null,
                league: normalizedTeamName(row.league),
                cross_league_level_identified:
                    typeof row.cross_league_level_identified === 'boolean'
                        ? row.cross_league_level_identified
                        : null,
                team_name: teamName,
                team_code: teamCode ?? teamCodes[0] ?? null,
                team_codes: teamCodes,
                team_names: teamNames,
                team_sort_label: (teamCodes.length > 0 ? teamCodes : teamNames).join(' / '),
                // Historical rows deliberately do not receive a current NBA
                // team ID or position fallback. Those values would make a
                // past team look like a current team in the UI.
                tm_id: isHistoricalSeasonSummary ? null : resolveTeamId(row, teamName),
                position: isHistoricalSeasonSummary ? null : normalizePosition(row.position ?? null),
                // Unlike display position, this is an explicitly named,
                // filter-only attribute. Historical values never affect a
                // team identity or appear as a season-time roster field.
                filter_position: normalizeWowyFilterPosition(
                    row.filter_position ?? (isHistoricalSeasonSummary ? null : row.position)
                ),
                height_inches: normalizeHeightInches(row.height_inches ?? row.height),
                snapshot_context: snapshotContext,
                wowy_rapm: row.wowy_rapm ?? null,
                wowy_orapm: row.wowy_orapm ?? null,
                wowy_drapm: row.wowy_drapm ?? null,
                exposure: row.exposure ?? null,
                season_possessions: row.season_possessions ?? null,
                minutes: row.minutes ?? null,
                bpm: row.bpm ?? null,
                date: row.date ?? null,
                career_game_num: row.career_game_num ?? null,
                season_games: row.season_games ?? null,
                playoff_games: row.playoff_games ?? null,
                playoff_possessions: row.playoff_possessions ?? null,
                first_date: row.first_date ?? null,
                last_date: row.last_date ?? null,
                method_version: row.method_version ?? null,
                application_model: row.application_model ?? null
            };
        })
        .filter(Boolean);
}

function mergePlayerWithActiveSnapshot(player, active) {
    return {
        nba_id: player.nba_id,
        player_name: player.player_name,
        team_name: active?.team_name ?? player.current_team ?? null,
        position: normalizePosition(active?.position ?? player.position ?? null),
        dpm: active?.dpm ?? null,
        o_dpm: active?.o_dpm ?? null,
        d_dpm: active?.d_dpm ?? null,
        box_dpm: active?.box_dpm ?? null,
        box_odpm: active?.box_odpm ?? null,
        box_ddpm: active?.box_ddpm ?? null,
        on_off_dpm: active?.on_off_dpm ?? null,
        bayes_rapm_total: active?.bayes_rapm_total ?? null,
        bayes_rapm_date: active?.bayes_rapm_date ?? null,
        tr_fg3_pct: active?.tr_fg3_pct ?? null,
        tr_ft_pct: active?.tr_ft_pct ?? null,
        x_minutes: active?.x_minutes ?? null,
        x_pace: active?.x_pace ?? null,
        x_pts_100: active?.x_pts_100 ?? null,
        date: active?.date ?? null
    };
}

async function getPlayersMapByIds(ids = [], columns = PLAYERS_DIM_COLUMNS) {
    const filteredIds = (ids || []).filter((id) => Number.isInteger(id) && id > 0);
    if (filteredIds.length === 0) {
        return new Map();
    }

    const { data, error } = await supabase
        .from('players')
        .select(columns)
        .in('nba_id', filteredIds);

    if (error) throw error;

    const map = new Map();
    for (const row of data || []) {
        map.set(row.nba_id, row);
    }
    return map;
}

function getLookbackStartDate(anchorDate, days) {
    const parsed = new Date(anchorDate);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setUTCDate(parsed.getUTCDate() - days);
    return parsed.toISOString().slice(0, 10);
}

async function getLatestTeamMapByIds(ids = [], latestDate) {
    const filteredIds = Array.from(
        new Set((ids || []).filter((id) => Number.isInteger(id) && id > 0))
    );
    if (filteredIds.length === 0) {
        return new Map();
    }

    const startDate = getLookbackStartDate(latestDate, TEAM_FALLBACK_LOOKBACK_DAYS);
    const { data, error } = await supabase.rpc('get_latest_player_teams', {
        p_ids: filteredIds,
        p_start_date: startDate
    });
    if (error) throw error;

    const teamMap = new Map();
    for (const row of Array.isArray(data) ? data : []) {
        teamMap.set(row.nba_id, {
            team_name: normalizedTeamName(row.team_name),
            tm_id: row.tm_id
        });
    }

    return teamMap;
}

/**
 * The latest season with a game played: the one a finished season simulation covers, even once
 * the next season's schedule has put forecast rows for it in player_ratings.
 */
export async function getLatestPlayedSeason() {
    return runCached(cacheKey('latestPlayedSeason'), CACHE_MS.leaderboardSeasons, async () => {
        const { data, error } = await supabase
            .from('player_ratings')
            .select('season')
            .eq('future_game', 0)
            .order('date', { ascending: false })
            .limit(1);
        if (error) throw error;
        const season = Number.parseInt(data?.[0]?.season, 10);
        return Number.isFinite(season) ? season : null;
    });
}

async function getLatestActiveSeason() {
    const key = cacheKey('latestActiveSeason', 'active');
    return runCached(key, CACHE_MS.activePlayers, async () => {
        const { data, error } = await supabase
            .from('player_ratings')
            .select('season')
            .not('season', 'is', null)
            .order('season', { ascending: false })
            .limit(1);

        if (error) throw error;
        const season = Number.parseInt(data?.[0]?.season, 10);
        return Number.isFinite(season) ? season : null;
    });
}

async function getCurrentSeasonPlayerDimsByIds(season, ids = []) {
    const filteredIds = Array.from(
        new Set((ids || []).filter((id) => Number.isInteger(id) && id > 0))
    );
    if (!season || filteredIds.length === 0) {
        return new Map();
    }

    const { data, error } = await supabase
        .from('players')
        .select(PLAYERS_DIM_COLUMNS)
        .eq('season', season);

    if (error) throw error;

    const requestedIds = new Set(filteredIds);
    const map = new Map();
    for (const row of data || []) {
        if (requestedIds.has(row?.nba_id)) {
            map.set(row.nba_id, row);
        }
    }

    return map;
}

async function getLatestCurrentSeasonRatingRows(season) {
    const { data, error } = await supabase.rpc('get_active_player_ratings', {
        p_season: season
    });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

/**
 * Get all active players — defined as current-roster players in the current NBA season.
 * Uses the latest season value and returns the most recent row per player, including
 * future projection rows.
 */
// RAPM rows exist only on the old RAPM file's snapshot days, for whoever played that day, so each
// player's newest comes from this many days before the latest.
const RAPM_LOOKBACK_DAYS = 183;

/**
 * The latest published RAPM: its date, and each player's newest RAPM row (with its own date)
 * from the RAPM_LOOKBACK_DAYS before it, for fillLatestRapm. RAPM stopped coming with each
 * day's ratings on 2026-03-07; newest-first on the date index, the first search stops at the
 * first day with any. Best effort: without it RAPM stays blank.
 */
async function getLatestRapmSnapshot() {
    return runCached(cacheKey('latestRapmSnapshot'), CACHE_MS.latestRapmSnapshot, async () => {
        const latest = await supabase
            .from('player_ratings')
            .select('date')
            .not('bayes_rapm_total', 'is', null)
            .order('date', { ascending: false })
            .limit(1);
        if (latest.error) throw latest.error;
        const date = latest.data?.[0]?.date ? String(latest.data[0].date).slice(0, 10) : null;
        if (!date) return null;
        const since = new Date(Date.parse(`${date}T00:00:00Z`) - RAPM_LOOKBACK_DAYS * 86_400_000)
            .toISOString()
            .slice(0, 10);
        const rows = await fetchAllPages(
            (options) =>
                supabase
                    .from('player_ratings')
                    .select('nba_id, date, bayes_rapm_total, bayes_rapm_off, bayes_rapm_def', options)
                    .not('bayes_rapm_total', 'is', null)
                    .gt('date', since)
                    .lte('date', date)
                    .order('date', { ascending: false })
                    .order('nba_id', { ascending: true }),
            { guessPages: 2 }
        );
        const byId = new Map();
        for (const row of rows) {
            const id = Number(row.nba_id);
            if (!byId.has(id)) byId.set(id, row);
        }
        return { date, byId };
    }).catch((error) => {
        console.error('latest RAPM snapshot failed', error);
        return null;
    });
}

async function loadAllActivePlayers() {
    const latestSeason = await getLatestActiveSeason();
    if (!latestSeason) {
        return [];
    }

    const unique = await getLatestCurrentSeasonRatingRows(latestSeason);
    const ids = unique.map((row) => row.nba_id);
    const playersMap = await getCurrentSeasonPlayerDimsByIds(latestSeason, ids);
    const latestDate = unique.reduce(
        (latest, row) => (!latest || row?.date > latest ? row.date : latest),
        null
    );
    const missingTeamIds = unique
        .filter((row) => {
            const currentTeam = normalizedTeamName(
                row.team_name ?? playersMap.get(row.nba_id)?.current_team
            );
            return !currentTeam || (
                !isRealTeamId(row.tm_id) && !isRealTeamId(nbaTeamId(currentTeam))
            );
        })
        .map((row) => row.nba_id);
    const [teamMap, rapm] = await Promise.all([
        getLatestTeamMapByIds(missingTeamIds, latestDate),
        getLatestRapmSnapshot()
    ]);
    const merged = unique.map((row) =>
        mergeWithPlayerDim(row, playersMap.get(row.nba_id), teamMap.get(row.nba_id))
    );

    return sortByDpmDesc(fillLatestRapm(merged, rapm));
}

const getCachedActivePlayers = createActivePlayersAccessor({
    loadAllActivePlayers,
    runCached,
    maxAgeMs: CACHE_MS.activePlayers
});

export function getActivePlayers(options = {}) {
    return getCachedActivePlayers(options);
}

/**
 * Get the latest observed WOWY rating for every player on the current DARKO
 * active roster. Identity and team metadata come from the current roster
 * snapshot; players without a played-game WOWY observation are not returned.
 */
export async function getActiveWowyPlayers() {
    const key = cacheKey('activeWowyPlayers', 'current');
    return runCached(key, CACHE_MS.activeWowyPlayers, async () => {
        const { data, error } = await supabase.rpc('get_active_wowy_player_ratings');
        if (error) throw error;

        const rows = normalizeWowyLeaderboardRows(data);

        const missingTeamIds = rows
            .filter((row) => {
                const currentTeam = normalizedTeamName(row.team_name);
                return !currentTeam || (
                    !isRealTeamId(row.tm_id) && !isRealTeamId(nbaTeamId(currentTeam))
                );
            })
            .map((row) => row.nba_id);

        // A player's last observed WOWY game is not a roster snapshot. When the
        // active projection row has placeholder team metadata, use the latest
        // valid team record without constraining it to that observed-game date.
        const teamMap = await getLatestTeamMapByIds(missingTeamIds);
        const enriched = rows.map((row) =>
            mergeWithActiveWowyTeamFallback(row, teamMap.get(row.nba_id))
        );

        return sortByWowyRapmDesc(enriched);
    });
}

const WOWY_ALL_TIME_SORT_COLUMNS = new Set([
    'player_name',
    'team_sort_label',
    'season',
    'wowy_rapm',
    'wowy_orapm',
    'wowy_drapm',
    'exposure',
    'season_possessions',
    'season_games',
    'last_date'
]);

function normalizedOptionalNumber(value, label) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new TypeError(`Invalid ${label}: ${value}`);
    }
    return parsed;
}

function normalizedOptionalText(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized || null;
}

function normalizeWowyAllTimePageOptions(options = {}) {
    const limit = Number.parseInt(options.limit ?? WOWY_ALL_TIME_PAGE_SIZE, 10);
    const offset = Number.parseInt(options.offset ?? 0, 10);
    const minPossessions = normalizedOptionalNumber(
        options.minPossessions,
        'minimum possessions'
    );
    const maxPossessions = normalizedOptionalNumber(
        options.maxPossessions,
        'maximum possessions'
    );
    const minHeight = normalizedOptionalNumber(options.minHeight, 'minimum height');
    const maxHeight = normalizedOptionalNumber(options.maxHeight, 'maximum height');
    const position = normalizedOptionalText(options.position)?.toUpperCase() ?? null;
    const sortColumn = normalizedOptionalText(options.sortColumn) ?? 'wowy_rapm';
    const sortDirection =
        normalizedOptionalText(options.sortDirection)?.toLowerCase() ?? 'desc';

    if (!Number.isInteger(limit) || limit < 1 || limit > WOWY_ALL_TIME_PAGE_SIZE) {
        throw new TypeError(
            `WOWY all-time limit must be between 1 and ${WOWY_ALL_TIME_PAGE_SIZE}`
        );
    }
    if (!Number.isInteger(offset) || offset < 0) {
        throw new TypeError('WOWY all-time offset must be a nonnegative integer');
    }
    for (const [label, value] of [
        ['minimum possessions', minPossessions],
        ['maximum possessions', maxPossessions],
        ['minimum height', minHeight],
        ['maximum height', maxHeight]
    ]) {
        if (value !== null && value < 0) {
            throw new TypeError(`${label} must be nonnegative`);
        }
    }
    if (
        minPossessions !== null &&
        maxPossessions !== null &&
        minPossessions > maxPossessions
    ) {
        throw new TypeError('Minimum possessions must not exceed maximum possessions');
    }
    if (minHeight !== null && maxHeight !== null && minHeight > maxHeight) {
        throw new TypeError('Minimum height must not exceed maximum height');
    }
    if (position !== null && !['G', 'F', 'C'].includes(position)) {
        throw new TypeError(`Unsupported WOWY position group: ${position}`);
    }
    if (!WOWY_ALL_TIME_SORT_COLUMNS.has(sortColumn)) {
        throw new TypeError(`Unsupported WOWY all-time sort column: ${sortColumn}`);
    }
    if (!['asc', 'desc'].includes(sortDirection)) {
        throw new TypeError(`Unsupported WOWY all-time sort direction: ${sortDirection}`);
    }

    return {
        limit,
        offset,
        minPossessions,
        maxPossessions,
        search: normalizedOptionalText(options.search),
        team: normalizedOptionalText(options.team),
        position,
        minHeight,
        maxHeight,
        sortColumn,
        sortDirection
    };
}

async function getWowyAllTimePageForMode(ratingMode, options = {}) {
    const normalized = normalizeWowyAllTimePageOptions(options);
    const cachePrefix =
        ratingMode === 'adjusted' ? 'wowyAdjustedAllTimePlayers' : 'wowyAllTimePlayers';
    const key = cacheKey(cachePrefix, JSON.stringify(normalized));
    const page = await runCached(key, CACHE_MS[cachePrefix], async () => {
        const { data, error } = await supabase.rpc(
            'get_wowy_all_time_player_seasons_page',
            {
                p_rating_mode: ratingMode,
                p_limit: normalized.limit,
                p_offset: normalized.offset,
                p_min_possessions: normalized.minPossessions,
                p_max_possessions: normalized.maxPossessions,
                p_search: normalized.search,
                p_team: normalized.team,
                p_position: normalized.position,
                p_min_height: normalized.minHeight,
                p_max_height: normalized.maxHeight,
                p_sort_column: normalized.sortColumn,
                p_sort_direction: normalized.sortDirection
            }
        );
        if (error) throw error;

        const payload = data && typeof data === 'object' && !Array.isArray(data)
            ? data
            : {};
        const players = normalizeWowyLeaderboardRows(payload.rows);
        const totalCount = Number.parseInt(payload.total_count, 10);
        return {
            players,
            totalCount: Number.isInteger(totalCount) && totalCount >= 0
                ? totalCount
                : players.length,
            hasMore: payload.has_more === true,
            activated: payload.activated !== false
        };
    });

    // Average mode intentionally returns an inactive empty page until the
    // separately certified season-average publication is ready. Retry on the
    // next request instead of caching that temporary state for an hour.
    if (ratingMode === 'average' && !page.activated) {
        cacheStore.delete(key);
    }
    return page;
}

/** Get one filtered, deterministically sorted all-time Average WOWY page. */
export function getWowyAllTimePage(options = {}) {
    return getWowyAllTimePageForMode('average', options);
}

/** Get one filtered, deterministically sorted all-time Adjusted WOWY page. */
export function getWowyAdjustedAllTimePage(options = {}) {
    return getWowyAllTimePageForMode('adjusted', options);
}

/**
 * Every team and height the all-time WOWY filters can match, for one rating mode. Reads only the
 * team columns of each published player-season, once an hour.
 */
export async function getWowyAllTimeFilterOptions(ratingMode = 'average') {
    const table = ratingMode === 'adjusted' ? 'wowy_season_adjusted_ratings' : 'wowy_season_player_averages';
    const key = cacheKey('wowyAllTimeFilterOptions', table);
    return runCached(key, CACHE_MS.wowyAllTimePlayers, async () => {
        const [teamRows, heightRows] = await Promise.all([
            fetchAllPages(
                (options) =>
                    supabase
                        .from(table)
                        .select('team_codes, team_names', options)
                        .order('season', { ascending: true })
                        .order('nba_id', { ascending: true }),
                { guessPages: 8 }
            ),
            fetchAllPages((options) =>
                supabase
                    .from('players')
                    .select('height', options)
                    .gte('height', 60)
                    .lte('height', 96)
                    .order('nba_id', { ascending: true })
            )
        ]);
        return { teams: teamOptionsFromRows(teamRows), heights: heightOptionsFromRows(heightRows) };
    });
}

/**
 * Get the historical WOWY seasons. The database stores NBA season end years,
 * so 2013 represents 2012-13.
 */
export async function getWowyLeaderboardSeasons() {
    const key = cacheKey('wowyLeaderboardSeasons', 'all');
    return runCached(key, CACHE_MS.wowyLeaderboardSeasons, async () => {
        const { data, error } = await supabase.rpc('get_wowy_leaderboard_seasons');
        if (error) throw error;

        return Array.from(
            new Set(
                (Array.isArray(data) ? data : [])
                    .map((season) => Number.parseInt(season, 10))
                    .filter((season) => Number.isInteger(season))
            )
        ).sort((a, b) => b - a);
    });
}

/** Get every modeled Season-Adjusted WOWY row for one season. */
export async function getWowyAdjustedSeasonPlayers(season) {
    const seasonEndYear = Number.parseInt(season, 10);
    if (!Number.isInteger(seasonEndYear)) {
        throw new TypeError(`Invalid adjusted WOWY season end year: ${season}`);
    }

    const key = cacheKey('wowyAdjustedSeasonPlayers', seasonEndYear);
    return runCached(key, CACHE_MS.wowyAdjustedSeasonPlayers, async () => {
        const [ratingsResponse, contextResponse] = await Promise.all([
            supabase.rpc('get_wowy_adjusted_season_player_ratings', {
                p_season: seasonEndYear
            }),
            supabase
                .from('wowy_season_box_context')
                .select('nba_id, minutes, bpm')
                .eq('season', seasonEndYear)
        ]);
        if (ratingsResponse.error) throw ratingsResponse.error;
        if (contextResponse.error) throw contextResponse.error;

        const contextByPlayer = new Map(
            (Array.isArray(contextResponse.data) ? contextResponse.data : []).map(
                (row) => [Number(row.nba_id), row]
            )
        );
        const rowsWithContext = (
            Array.isArray(ratingsResponse.data) ? ratingsResponse.data : []
        ).map((row) => {
            const context = contextByPlayer.get(Number(row.nba_id));
            return {
                ...row,
                minutes: row.minutes ?? context?.minutes ?? null,
                bpm: row.bpm ?? context?.bpm ?? null
            };
        });

        return sortByWowyRapmDesc(normalizeWowyLeaderboardRows(rowsWithContext));
    });
}

/**
 * Get every season represented in the player-ratings history, newest first.
 * The database stores NBA season end years, so 2013 represents 2012-13.
 */
export async function getLeaderboardSeasons() {
    const key = cacheKey('leaderboardSeasons', 'all');
    return runCached(key, CACHE_MS.leaderboardSeasons, async () => {
        const { data, error } = await supabase.rpc('get_leaderboard_seasons');
        if (error) throw error;

        return Array.from(
            new Set(
                (Array.isArray(data) ? data : [])
                    .map((season) => Number.parseInt(season, 10))
                    .filter((season) => Number.isInteger(season))
            )
        ).sort((a, b) => b - a);
    });
}

/**
 * Get the opening-roster snapshot for a historical NBA season. Each team is
 * represented by the player_ratings rows on its first game date, rather than
 * admitting players who joined later in the season.
 */
export async function getSeasonStartPlayers(season) {
    const seasonEndYear = Number.parseInt(season, 10);
    if (!Number.isInteger(seasonEndYear)) {
        throw new TypeError(`Invalid season end year: ${season}`);
    }

    const key = cacheKey('seasonStartPlayers', seasonEndYear);
    return runCached(key, CACHE_MS.seasonStartPlayers, async () => {
        const { data, error } = await supabase.rpc('get_season_start_player_ratings', {
            p_season: seasonEndYear
        });
        if (error) throw error;

        const rows = Array.isArray(data) ? data : [];
        const playersMap = await getPlayersMapByIds(rows.map((row) => row?.nba_id));
        return sortByDpmDesc(
            rows.map((row) => mergeWithPlayerDim(row, playersMap.get(row.nba_id)))
        );
    });
}

export const SEASON_TREND_MAX_IDS = 60;

/**
 * The leaderboard's sparklines: each player's DPM on every day of one season they have a
 * rating, oldest first, as { [nba_id]: [dpm, ...] }. `through` (YYYY-MM-DD) stops the lines
 * at a Time Machine date. Not cached here: the endpoint's edge cache keys it by the ids.
 */
export async function getSeasonTrends(ids, season, { through = null } = {}) {
    const wanted = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
        .slice(0, SEASON_TREND_MAX_IDS);
    const seasonEndYear = Number.parseInt(season, 10);
    if (!wanted.length || !Number.isInteger(seasonEndYear)) return {};
    const rows = await fetchAllPages(
        (options) => {
            let query = supabase
                .from('player_ratings')
                .select('nba_id, date, dpm', options)
                .in('nba_id', wanted)
                .eq('season', seasonEndYear);
            if (through) query = query.lte('date', through);
            return query.order('nba_id').order('date');
        },
        { guessPages: 3 }
    );
    const trends = {};
    for (const row of rows) {
        const dpm = Number.parseFloat(row.dpm);
        if (Number.isFinite(dpm)) (trends[row.nba_id] ??= []).push(Math.round(dpm * 100) / 100);
    }
    return trends;
}

// A rostered player has a row on every team game day, rest days included, so two weeks of
// rows find everyone on a roster (the All-Star break is the longest regular pause).
const PLAYERS_AS_OF_WINDOW_DAYS = 14;
const PLAYERS_AS_OF_ID_CHUNK = 150;
const PLAYERS_AS_OF_CONCURRENCY = 12;
// Only what the date-aware views (leaderboard, Roster Lab) and the player merge read.
const PLAYERS_AS_OF_COLUMNS = [
    'nba_id',
    'date',
    'season',
    'team_name',
    'tm_id',
    'position',
    'age',
    'career_game_num',
    'dpm',
    'o_dpm',
    'd_dpm',
    'box_dpm',
    'on_off_dpm',
    'x_minutes',
    'x_pace',
    'x_pts_100',
    'x_ast_100',
    'x_fg_pct',
    'x_fg3_pct',
    'x_ft_pct',
    'sal_market_fixed',
    'actual_salary',
    'surplus_value'
].join(', ');

async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;
    const run = async () => {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await worker(items[index]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return results;
}

/**
 * Every page of a query in (usually) one round trip: the row count and the first few pages
 * load together, and only a larger result waits for a second round of pages.
 */
async function fetchAllPages(buildQuery, { pageSize = 1_000, guessPages = 4 } = {}) {
    const page = (index) => buildQuery().range(index * pageSize, (index + 1) * pageSize - 1);
    const [counted, ...first] = await Promise.all([
        buildQuery({ count: 'exact', head: true }),
        ...Array.from({ length: guessPages }, (_, index) => page(index))
    ]);
    if (counted.error) throw counted.error;
    const pages = Math.ceil((counted.count ?? 0) / pageSize);
    const rest = await Promise.all(
        Array.from({ length: Math.max(0, pages - guessPages) }, (_, index) => page(guessPages + index))
    );
    const results = [...first, ...rest];
    for (const result of results) if (result.error) throw result.error;
    return results.flatMap((result) => result.data ?? []);
}

async function latestRatingDateOnOrBefore(date) {
    const { data, error } = await supabase
        .from('player_ratings')
        .select('date, season')
        .lte('date', date)
        .gt('tm_id', 0)
        .order('date', { ascending: false })
        .limit(1);
    if (error) throw error;
    const row = data?.[0];
    return row ? { date: row.date, season: Number.parseInt(row.season, 10) } : null;
}

function fetchAsOfWindow(season, anchorDate, calendarRow) {
    const windowStart = asOfWindowStart(anchorDate, calendarRow, PLAYERS_AS_OF_WINDOW_DAYS);
    return fetchAllPages((options) =>
        supabase
            .from('player_ratings')
            .select('nba_id, date', options)
            .eq('season', season)
            .gte('date', windowStart)
            .lte('date', anchorDate)
            .gt('tm_id', 0)
            .order('date', { ascending: false })
            .order('nba_id', { ascending: true })
    );
}

/**
 * Every player's latest rating on or before `asOf` (the Time Machine date), in the same shape
 * as getActivePlayers() for the fields the date-aware views read. A player needs a row (a game,
 * or a day on a roster) in the two weeks of play before the date; once any team's season has
 * ended, the window reaches back past every team's final regular-season game. With the season
 * calendar the season comes straight from the date; without it, or inside a pause in play
 * (the 2020 hiatus), the latest rated date anchors the window. Returns { rows, dataDate, season }.
 */
export async function getPlayersAsOf(asOf, calendar = null) {
    const key = cacheKey('playersAsOf', asOf);
    return runCached(key, CACHE_MS.playersAsOf, async () => {
        const located = calendar ? locateDate(calendar, asOf) : null;
        let season = located?.season ?? null;
        let calendarRow = located?.row ?? null;
        let anchorDate = located ? (asOf < calendarRow.last_game ? asOf : calendarRow.last_game) : null;
        let windowRows = season ? await fetchAsOfWindow(season, anchorDate, calendarRow) : [];
        if (windowRows.length === 0) {
            const anchor = await latestRatingDateOnOrBefore(asOf);
            if (!anchor) return { rows: [], dataDate: null, season: null };
            season = anchor.season;
            anchorDate = anchor.date;
            calendarRow = calendar?.find((row) => row.season === season) ?? null;
            windowRows = await fetchAsOfWindow(season, anchorDate, calendarRow);
        }

        const latestDateById = new Map();
        for (const row of windowRows) {
            if (!latestDateById.has(row.nba_id)) latestDateById.set(row.nba_id, row.date);
        }
        const idsByDate = new Map();
        for (const [nbaId, date] of latestDateById) {
            if (!idsByDate.has(date)) idsByDate.set(date, []);
            idsByDate.get(date).push(nbaId);
        }
        const requests = [];
        for (const [date, ids] of idsByDate) {
            for (let start = 0; start < ids.length; start += PLAYERS_AS_OF_ID_CHUNK) {
                requests.push({ date, ids: ids.slice(start, start + PLAYERS_AS_OF_ID_CHUNK) });
            }
        }
        const [chunks, playersMap] = await Promise.all([
            mapWithConcurrency(requests, PLAYERS_AS_OF_CONCURRENCY, async ({ date, ids }) => {
                const { data, error } = await supabase
                    .from('player_ratings')
                    .select(PLAYERS_AS_OF_COLUMNS)
                    .eq('date', date)
                    .in('nba_id', ids);
                if (error) throw error;
                return data ?? [];
            }),
            getPlayersMapByIds([...latestDateById.keys()])
        ]);
        const rows = chunks.flat();
        return {
            rows: sortByDpmDesc(rows.map((row) => mergeWithPlayerDim(row, playersMap.get(row.nba_id)))),
            dataDate: windowRows[0]?.date ?? anchorDate,
            season
        };
    });
}

/**
 * Get a single player's history for charts.
 */
export async function getPlayerHistory(nbaId, limit = 500) {
    const key = cacheKey('playerHistory', `${nbaId}:${limit}`);
    return runCached(key, CACHE_MS.playerHistory, async () => {
        const { data, error } = await supabase
            .from('player_ratings')
            .select(RATING_COLUMNS)
            .eq('nba_id', nbaId)
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw error;
        const playersMap = await getPlayersMapByIds([nbaId]);
        const playerDim = playersMap.get(nbaId);
        return (data || []).slice().reverse().map((row) => mergeWithPlayerDim(row, playerDim));
    });
}

/**
 * Search all players (including retired/inactive) by name.
 * Returns up to 15 unique matches with most recent data.
 */
export async function searchAllPlayers(searchTerm) {
    const normalizedTerm = (searchTerm || '').trim().toLowerCase();
    if (normalizedTerm.length < 2) {
        return [];
    }

    const key = cacheKey('searchPlayers', normalizedTerm);
    return runCached(key, CACHE_MS.searchPlayers, async () => {
        // Only players DARKO rated (a season of ratings): the table also holds every player since
        // the 1940s, and their pages don't exist.
        const { data: players, error } = await supabase
            .from('players')
            .select(PLAYERS_DIM_COLUMNS)
            .ilike('player_name', `%${normalizedTerm}%`)
            .not('season', 'is', null)
            .order('player_name', { ascending: true })
            .limit(15);

        if (error) throw error;

        const validPlayers = (players || []).filter(
            (player) => Number.isInteger(player?.nba_id) && player.nba_id > 0
        );
        if (validPlayers.length === 0) return [];

        const { data: snapshots, error: snapshotError } = await supabase.rpc(
            'get_latest_player_search_ratings',
            { p_ids: validPlayers.map((player) => player.nba_id) }
        );
        if (snapshotError) throw snapshotError;

        const snapshotById = new Map();
        for (const row of Array.isArray(snapshots) ? snapshots : []) {
            snapshotById.set(row.nba_id, row);
        }

        return validPlayers.map((player) =>
            mergePlayerWithActiveSnapshot(player, snapshotById.get(player.nba_id))
        );
    });
}

/**
 * Get a player's complete career history (all rows, paginated).
 * Returns rows in chronological order.
 */
export async function getFullPlayerHistory(nbaId, options = {}) {
    const maxRows = Number.isInteger(options.maxRows) && options.maxRows > 0
        ? options.maxRows
        : MAX_FULL_HISTORY_ROWS;
    const columns = options.columns || RATING_COLUMNS;
    const cachePrefix = options.cachePrefix || 'fullPlayerHistory';
    const mergePlayerDim = options.mergePlayerDim !== false;
    const key = cacheKey(cachePrefix, `${nbaId}:${maxRows}:${mergePlayerDim ? 'merged' : 'raw'}`);
    return runCached(key, CACHE_MS.fullPlayerHistory, async () => {
        let allData = [];
        let page = 0;
        const pageSize = 1_000;
        let truncated = false;
        let lastPageSize = 0;

        while (allData.length < maxRows) {
            const { data, error } = await supabase
                .from('player_ratings')
                .select(columns)
                .eq('nba_id', nbaId)
                .order('date', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            const rows = data || [];
            lastPageSize = rows.length;

            const remaining = maxRows - allData.length;
            if (rows.length > remaining) {
                allData = allData.concat(rows.slice(0, remaining));
                truncated = true;
                break;
            }

            allData = allData.concat(rows);
            if (rows.length < pageSize) break;
            page += 1;
        }

        if (!truncated && allData.length === maxRows && lastPageSize === pageSize) {
            const nextOffset = page * pageSize;
            const { data: extraRows, error: extraError } = await supabase
                .from('player_ratings')
                .select('nba_id')
                .eq('nba_id', nbaId)
                .order('date', { ascending: true })
                .range(nextOffset, nextOffset);

            if (extraError) throw extraError;
            truncated = (extraRows || []).length > 0;
        }

        if (!mergePlayerDim) {
            return { rows: allData, truncated, maxRows };
        }

        const playersMap = await getPlayersMapByIds([nbaId]);
        const playerDim = playersMap.get(nbaId);
        return {
            rows: allData.map((row) => mergeWithPlayerDim(row, playerDim)),
            truncated,
            maxRows
        };
    });
}

/** Get the complete career projection used only by the Trajectories page. */
export function getFullPlayerTrajectoryHistory(nbaId, options = {}) {
    return getFullPlayerHistory(nbaId, {
        ...options,
        columns: TRAJECTORY_RATING_COLUMNS,
        cachePrefix: 'fullPlayerTrajectoryHistory'
    });
}

const UNDEFINED_COLUMN = '42703';
const PLAYER_PROFILE_COLUMNS_WITHOUT_OPPONENT = PLAYER_PROFILE_RATING_COLUMNS
    .split(', ')
    .filter((column) => column !== 'opp_id')
    .join(', ');

/** Get the complete career projection used by the player profile charts. */
export async function getFullPlayerProfileHistory(nbaId, options = {}) {
    // opp_id is new in the nightly publish. Until the live table carries it,
    // profiles load without opponents instead of failing.
    const history = getFullPlayerHistory(nbaId, {
        ...options,
        columns: PLAYER_PROFILE_RATING_COLUMNS,
        cachePrefix: 'fullPlayerProfileHistory',
        mergePlayerDim: false
    }).catch((error) => {
        if (error?.code !== UNDEFINED_COLUMN) throw error;
        return getFullPlayerHistory(nbaId, {
            ...options,
            columns: PLAYER_PROFILE_COLUMNS_WITHOUT_OPPONENT,
            cachePrefix: 'fullPlayerProfileHistoryWithoutOpponent',
            mergePlayerDim: false
        });
    });
    const draftLookup = runCached(cacheKey('playerDraft', nbaId), CACHE_MS.playerHistory, () =>
        getPlayersMapByIds([nbaId], PLAYER_DRAFT_COLUMNS)
    );
    const [profileHistory, latestRows, draftById, rapm] = await Promise.all([
        history,
        getPlayerHistory(nbaId, 1),
        draftLookup,
        getLatestRapmSnapshot()
    ]);
    const latest = latestRows.at(-1) ?? null;
    const draft = draftById.get(nbaId);
    // RAPM from the same snapshot as the active players this player's percentiles rank against.
    const [info] = latest ? fillLatestRapm([latest], rapm) : [null];
    return {
        ...profileHistory,
        playerInfo: info && {
            ...info,
            draft_year: draft?.draft_year ?? null,
            draft_slot: draft?.draft_slot ?? null,
            country: draft?.country ?? null,
            height: draft?.height ?? null,
            weight: draft?.weight ?? null
        }
    };
}

/**
 * Get one player's complete synthetic WOWY history in chronological order.
 * Supabase range pagination is a server-side transport detail; callers receive one career array.
 */
export async function getWowyPlayerHistory(nbaId, options = {}) {
    const maxRows = Number.isInteger(options.maxRows) && options.maxRows > 0
        ? options.maxRows
        : MAX_WOWY_HISTORY_ROWS;
    const key = cacheKey('wowyPlayerHistory', `${nbaId}:${maxRows}`);
    return runCached(key, CACHE_MS.wowyPlayerHistory, async () => {
        let allData = [];
        let page = 0;
        const pageSize = 1_000;
        let truncated = false;
        let lastPageSize = 0;

        while (allData.length < maxRows) {
            const { data, error } = await supabase
                .from('wowy_ratings')
                .select(WOWY_RATING_COLUMNS)
                .eq('nba_id', nbaId)
                .order('career_game_num', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            const rows = data || [];
            lastPageSize = rows.length;
            const remaining = maxRows - allData.length;
            if (rows.length > remaining) {
                allData = allData.concat(rows.slice(0, remaining));
                truncated = true;
                break;
            }
            allData = allData.concat(rows);
            if (rows.length < pageSize) break;
            page += 1;
        }

        if (!truncated && allData.length === maxRows && lastPageSize === pageSize) {
            const nextOffset = page * pageSize;
            const { data: extraRows, error: extraError } = await supabase
                .from('wowy_ratings')
                .select('nba_id')
                .eq('nba_id', nbaId)
                .order('career_game_num', { ascending: true })
                .range(nextOffset, nextOffset);

            if (extraError) throw extraError;
            truncated = (extraRows || []).length > 0;
        }

        const playersMap = await getPlayersMapByIds([nbaId]);
        const playerDim = playersMap.get(nbaId);
        return {
            rows: allData.map((row) => mergeWithPlayerDim(row, playerDim)),
            truncated,
            maxRows
        };
    });
}

/** Get the metadata row describing the currently published WOWY artifact. */
export async function getWowyPublication() {
    return runCached('wowyPublication:current', CACHE_MS.wowyPublication, async () => {
        const { data, error } = await supabase
            .from('wowy_publication')
            .select(
                'publication_id, composite_sha256, output_sha256, data_through, season_from, season_through, season_adjusted_from, aba_cross_league_identified_from, row_count, player_count, display_method, historian_sha256, published_at'
            )
            .eq('id', 1)
            .maybeSingle();

        if (error) throw error;
        return data || null;
    });
}

export async function getPlayersIndex() {
    const key = cacheKey('playersIndex', 'all');
    return runCached(key, CACHE_MS.playersIndex, async () => {
        const activePlayersPromise = getActivePlayers();

        let allPlayers = [];
        let page = 0;
        const pageSize = 1_000;

        while (true) {
            // Only players DARKO rated; the others have no page (see searchAllPlayers).
            const { data, error } = await supabase
                .from('players')
                .select(PLAYERS_DIM_COLUMNS)
                .not('season', 'is', null)
                .order('player_name', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            allPlayers = allPlayers.concat(data || []);
            if (!data || data.length < pageSize) break;
            page += 1;
        }

        const activePlayers = await activePlayersPromise;

        const activeById = new Map();
        for (const row of activePlayers || []) {
            activeById.set(row.nba_id, row);
        }

        const rows = allPlayers
            .filter((player) => Number.isInteger(player?.nba_id) && player.nba_id > 0)
            .map((player) => mergePlayerWithActiveSnapshot(player, activeById.get(player.nba_id)));

        rows.sort((a, b) => {
            const left = a.player_name || '';
            const right = b.player_name || '';
            return left.localeCompare(right);
        });

        return rows;
    });
}

export async function getLongevityRows(options = {}) {
    const activeOnly = options.activeOnly !== false;
    // Games played come from the season table (daily.js getCareerGames, which the route passes in):
    // player_ratings' career_game_num counts model rows, not games.
    const loadGames = options.loadGames ?? null;
    const key = cacheKey('longevityRows', activeOnly ? 'active' : 'all');
    return runCached(key, CACHE_MS.longevityRows, async () => {
        const rows = activeOnly ? await getActivePlayers() : await getPlayersIndex();
        // Unknown when the table can't be read; zero for a player without a game in it yet.
        const games = loadGames ? await loadGames(rows.map((row) => row.nba_id)).catch(() => null) : null;
        const longevityRows = [];

        for (const row of rows) {
            const yearsRemaining = firstFiniteNumber(
                row.projected_years_remaining_cal,
                row.projected_years_remaining
            );
            const estRetirementAge = firstFiniteNumber(
                row.x_retirement_age_cal,
                row.x_retirement_age
            );

            longevityRows.push({
                nba_id: row.nba_id,
                player_name: row.player_name,
                team_name: row.team_name ?? null,
                tm_id: row.tm_id ?? null,
                position: normalizePosition(row.position ?? row.x_position ?? null),
                rookie_season: row.rookie_season ?? null,
                career_games: games ? (games.get(Number(row.nba_id))?.regular ?? 0) : null,
                age: row.age ?? null,
                est_retirement_age: estRetirementAge,
                years_remaining: yearsRemaining,
                p1: normalizeProbability(row.s1),
                p2: normalizeProbability(row.s2),
                p3: normalizeProbability(row.s3),
                p4: normalizeProbability(row.s4),
                p5: normalizeProbability(row.s5),
                p6: normalizeProbability(row.s6),
                p7: normalizeProbability(row.s7),
                p8: normalizeProbability(row.s8),
                p9: normalizeProbability(row.s9),
                p10: normalizeProbability(row.s10),
                p11: normalizeProbability(row.s11),
                p12: normalizeProbability(row.s12),
                p13: normalizeProbability(row.s13),
                p14: normalizeProbability(row.s14),
                p15: normalizeProbability(row.s15)
            });
        }

        longevityRows.sort((a, b) => {
            const left = Number.parseFloat(a.years_remaining);
            const right = Number.parseFloat(b.years_remaining);
            if (Number.isFinite(left) && Number.isFinite(right)) {
                if (right !== left) return right - left;
            }
            return String(a.player_name || '').localeCompare(String(b.player_name || ''));
        });

        return longevityRows;
    });
}

export async function getLongevityTrajectory(nbaId) {
    const key = cacheKey('longevityTrajectory', nbaId);
    return runCached(key, CACHE_MS.longevityTrajectory, async () => {
        const { data, error } = await supabase
            .from('player_ratings')
            .select('season, date, x_retirement_age, x_retirement_age_cal')
            .eq('nba_id', nbaId)
            .order('season', { ascending: true })
            .order('date', { ascending: true })
            .limit(10_000);

        if (error) throw error;

        const bySeason = new Map();
        for (const row of data || []) {
            const season = Number.parseInt(row.season, 10);
            if (!Number.isFinite(season)) continue;
            bySeason.set(season, row);
        }

        const points = [];
        for (const [season, row] of [...bySeason.entries()].sort((a, b) => a[0] - b[0])) {
            const retirementAge = firstFiniteNumber(row.x_retirement_age_cal, row.x_retirement_age);
            if (!Number.isFinite(retirementAge)) continue;
            const seasonStartYear = season - 1;
            if (!Number.isFinite(seasonStartYear)) continue;

            points.push({
                season_start: formatSeasonLabel(seasonStartYear),
                season_start_year: seasonStartYear,
                projected_retirement_age: Math.round(retirementAge * 10) / 10
            });
        }

        return points;
    });
}

export async function getConferenceStandings(conference) {
    const normalizedConference = (conference || '').trim();
    if (!normalizedConference) {
        return [];
    }

    const key = cacheKey('conferenceStandings', normalizedConference);
    return runCached(key, CACHE_MS.conferenceStandings, async () => {
        const { data, error } = await supabase
            .from('season_sim')
            .select('*')
            .eq('conference', normalizedConference)
            .order('Rk', { ascending: true });

        if (error) throw error;
        return data || [];
    });
}

async function fetchLineupRatingsRows({ lineupSize = 5, minPoss = LINEUP_MIN_POSSESSIONS } = {}) {
    // Possession counts are whole numbers and tie often, so the order needs tie-breakers: without
    // them, a row at a page boundary could land on two pages and another on none (the 2-Man list
    // lost two lineups that way).
    return fetchAllPages(
        (options) =>
            supabase
                .from('lineup_ratings')
                .select(LINEUP_RATING_COLUMNS, options)
                .in('variant', LINEUP_QUERY_VARIANTS)
                .eq('lineup_size', lineupSize)
                .gt('min_season_poss', minPoss)
                .order('min_season_poss', { ascending: false })
                .order('variant', { ascending: true })
                .order('group_key', { ascending: true })
                .order('tm_id', { ascending: true }),
        { guessPages: 3 }
    );
}

/**
 * When the published lineup ratings were computed (nba_darko stamps `computed_on` on every row;
 * no stage has rebuilt them since 2026-03-26), or null before the pipeline publishes the column.
 */
export async function getLineupsComputedOn() {
    return runCached(cacheKey('lineupsComputedOn'), CACHE_MS.lineupRatings, async () => {
        const { data, error } = await supabase.from('lineup_ratings').select('computed_on').limit(1);
        if (error) {
            if (error.code === UNDEFINED_COLUMN) return null;
            throw error;
        }
        return data?.[0]?.computed_on ?? null;
    });
}

export async function getLineupRatings({ lineupSize = 5, minPoss = LINEUP_MIN_POSSESSIONS } = {}) {
    const key = cacheKey('lineupRatings', `size-${lineupSize}:min-${minPoss}`);
    return runCached(key, CACHE_MS.lineupRatings, async () => {
        const rows = await fetchLineupRatingsRows({ lineupSize, minPoss });
        return groupLineupRows(rows, { minPoss, playerCount: lineupSize });
    });
}

const LINEUP_COUNT_BUCKETS = ['pi', 'npi'].map((bucket) => [
    bucket,
    LINEUP_QUERY_VARIANTS.filter((variant) => normalizeLineupVariant(variant) === bucket)
]);

/**
 * PI and NPI lineup counts for every lineup size, from row counts alone: the size tabs show them
 * without loading every size's rows. They match the grouped lineups while each lineup has one row
 * per variant, as the published table does.
 */
export async function getLineupSizeCounts() {
    return runCached(cacheKey('lineupSizeCounts', 'all'), CACHE_MS.lineupSizeCounts, async () => {
        const queries = Object.entries(LINEUP_SIZE_CONFIG).flatMap(([size, { minPoss }]) =>
            LINEUP_COUNT_BUCKETS.map(([bucket, variants]) => ({ size: Number(size), minPoss, bucket, variants }))
        );
        const results = await Promise.all(
            queries.map(({ size, minPoss, variants }) =>
                supabase
                    .from('lineup_ratings')
                    .select('variant', { count: 'exact', head: true })
                    .in('variant', variants)
                    .eq('lineup_size', size)
                    .gt('min_season_poss', minPoss)
            )
        );
        const counts = {};
        results.forEach((result, index) => {
            if (result.error) throw result.error;
            const { size, bucket } = queries[index];
            counts[size] ??= { pi: 0, npi: 0 };
            counts[size][bucket] = result.count ?? 0;
        });
        return counts;
    });
}

export async function getTeamLineups(teamName, { variant = 'pi', topN = 5 } = {}) {
    const allLineups = await getLineupRatings();
    const bucket = allLineups?.[variant] ?? [];
    const teamRows = bucket.filter((r) => r.team_name === teamName);
    const sorted = [...teamRows].sort((a, b) => b.net_pm - a.net_pm);
    return {
        top: sorted.slice(0, topN),
        worst: sorted.slice(-topN).reverse()
    };
}

export async function getTeamSimulation(teamName) {
    const normalizedTeam = (teamName || '').trim();
    if (!normalizedTeam) {
        return null;
    }

    const key = cacheKey('teamSimulation', normalizedTeam);
    return runCached(key, CACHE_MS.teamSimulation, async () => {
        const { data, error } = await supabase
            .from('season_sim')
            .select('*')
            .eq('team_name', normalizedTeam)
            .maybeSingle();

        if (error) throw error;
        return data || null;
    });
}

export async function getTeamWinDistribution(teamName) {
    const normalizedTeam = (teamName || '').trim();
    if (!normalizedTeam) {
        return [];
    }

    const key = cacheKey('teamWinDistribution', normalizedTeam);
    return runCached(key, CACHE_MS.teamWinDistribution, async () => {
        const { data, error } = await supabase
            .from('win_distribution')
            .select('*')
            .eq('team_name', normalizedTeam)
            .order('wins', { ascending: true });

        if (error) throw error;
        return data || [];
    });
}

/** The Teams overview's inputs: every team's DARKO rating and its season simulation row. */
export async function getTeamsOverviewData() {
    const [players, east, west, playedSeason] = await Promise.all([
        getActivePlayers(),
        getConferenceStandings('East'),
        getConferenceStandings('West'),
        getLatestPlayedSeason().catch(() => null)
    ]);
    return {
        ratings: leagueTeamRatings(players || []),
        sim: [...(east || []), ...(west || [])],
        playedSeason
    };
}

export async function getTeamPageData(teamName) {
    const normalizedTeam = (teamName || '').trim();
    if (!normalizedTeam) {
        return {
            players: [],
            sim: null,
            winDist: []
        };
    }

    // Every team's rating, from the same cached active players, ranks this one (Team DNA).
    const [players, allPlayers, sim, winDist, lineups] = await Promise.all([
        getActivePlayers({ teamName: normalizedTeam }),
        getActivePlayers(),
        getTeamSimulation(normalizedTeam),
        getTeamWinDistribution(normalizedTeam),
        getTeamLineups(normalizedTeam)
    ]);

    return {
        players: players || [],
        league: leagueTeamRatings(allPlayers || []),
        sim: sim || null,
        winDist: winDist || [],
        lineups: lineups || { top: [], worst: [] }
    };
}

// ---------------------------------------------------------------------------
// Elo rating system
// ---------------------------------------------------------------------------

// The Rate a Player card's fields for each player in a pair.
const RATE_PLAYER_COLUMNS =
    'nba_id, player_name, height, weight, dob, draft_year, draft_slot, position, country, current_team, active_roster, season, rookie_season';

/**
 * Two different players from the active leaderboard, with the card's fields and their Elo.
 * The get_random_pair RPC drew from every row of `players`, which holds every player since the
 * 1940s, so nearly every pair was two retired players DARKO never rated.
 */
export async function getRandomPair(random = Math.random) {
    const active = (await getActivePlayers()).filter((row) => Number.isInteger(Number(row?.nba_id)));
    if (active.length < 2) throw new Error('Not enough players for comparison');
    const first = Math.floor(random() * active.length);
    let second = Math.floor(random() * (active.length - 1));
    if (second >= first) second += 1;
    const picks = [active[first], active[second]];
    const ids = picks.map((row) => Number(row.nba_id));

    const [bios, elo] = await Promise.all([
        supabase.from('players').select(RATE_PLAYER_COLUMNS).in('nba_id', ids),
        supabase.from('elo_ratings').select('nba_id, elo_rating, total_comparisons, wins, losses').in('nba_id', ids)
    ]);
    if (bios.error) throw bios.error;
    if (elo.error) throw elo.error;
    const byId = (rows) => new Map((rows ?? []).map((row) => [Number(row.nba_id), row]));
    const bioById = byId(bios.data);
    const eloById = byId(elo.data);

    return picks.map((row) => {
        const id = Number(row.nba_id);
        const bio = bioById.get(id) ?? {};
        const rating = eloById.get(id);
        return {
            ...bio,
            nba_id: id,
            player_name: bio.player_name ?? row.player_name ?? null,
            position: bio.position ?? row.position ?? null,
            // The leaderboard's team, which looks past offseason rows that have none.
            current_team: row.team_name ?? bio.current_team ?? null,
            elo_rating: rating?.elo_rating ?? 1500,
            total_comparisons: rating?.total_comparisons ?? 0,
            wins: rating?.wins ?? 0,
            losses: rating?.losses ?? 0
        };
    });
}

function parseRpcNumber(value, fallback = null) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export async function recordVote(winnerId, loserId, { client = supabase } = {}) {
    const { data, error } = await client.rpc('record_elo_vote', {
        p_winner_id: winnerId,
        p_loser_id: loserId
    });
    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    if (!result) {
        throw new Error('Failed to record vote');
    }

    invalidateCachePrefix('eloLeaderboard:');
    const parsedWinnerId = Number.parseInt(result.winner_id, 10);
    const parsedLoserId = Number.parseInt(result.loser_id, 10);

    return {
        winnerId: Number.isInteger(parsedWinnerId) ? parsedWinnerId : winnerId,
        loserId: Number.isInteger(parsedLoserId) ? parsedLoserId : loserId,
        winnerEloBefore: parseRpcNumber(result.winner_elo_before, null),
        loserEloBefore: parseRpcNumber(result.loser_elo_before, null),
        winnerEloAfter: parseRpcNumber(result.winner_elo_after, null),
        loserEloAfter: parseRpcNumber(result.loser_elo_after, null),
        delta: parseRpcNumber(result.elo_delta, null)
    };
}

export async function getEloLeaderboard(limit = 50) {
    const { data, error } = await supabase
        .from('elo_ratings')
        .select('nba_id, elo_rating, total_comparisons, wins, losses')
        .order('elo_rating', { ascending: false })
        .limit(limit);

    if (error) throw error;

    const ids = (data || []).map((r) => r.nba_id);
    const playersMap = await getPlayersMapByIds(ids);

    return (data || []).map((r) => ({
        ...r,
        player_name: playersMap.get(r.nba_id)?.player_name ?? null,
        position: normalizePosition(playersMap.get(r.nba_id)?.position ?? null),
        current_team: playersMap.get(r.nba_id)?.current_team ?? null
    }));
}
