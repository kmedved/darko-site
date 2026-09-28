<script>
    import { goto, replaceState } from '$app/navigation';
    import { untrack } from 'svelte';
    import {
        exportCsvRows,
        formatFixed,
        formatSignedMetric,
        wowyAdjustedAllTimeLeaderboardCsvColumns,
        wowyAdjustedHistoricalLeaderboardCsvColumns,
        wowyLeaderboardCsvColumns
    } from '$lib/utils/csvPresets.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';
    import { formatSeasonEndYearLabel } from '$lib/utils/seasonUtils.js';
    import { getNextSortState, getSortAriaValue, getSortGlyph, getSortedRows } from '$lib/utils/sortableTable.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
    import { setupWideStickyTable } from '$lib/utils/wideStickyTable.js';
    import {
        buildPresetHeatScales,
        getMetricHeatVariables
    } from '$lib/utils/metricHeatScales.js';
    import MetricTooltip from '$lib/components/MetricTooltip.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import { divergingTint, tintLimit } from '$lib/utils/divergingTint.js';

    let { data } = $props();

    const PAGE_SIZE = 50;
    const ALL_TIME_BATCH_SIZE = 100;
    const positionOptions = [
        { value: 'G', label: 'Guards' },
        { value: 'F', label: 'Forwards' },
        { value: 'C', label: 'Centers' }
    ];
    const textSortColumns = new Set(['player_name', 'team_name', 'team_sort_label']);
    const seasonSortColumns = new Set([
        'player_name',
        'team_sort_label',
        'wowy_rapm',
        'wowy_orapm',
        'wowy_drapm',
        'exposure',
        'season_games',
        'last_date'
    ]);
    const allTimeSortColumns = new Set([...seasonSortColumns, 'season']);
    const currentSortColumns = new Set([
        'player_name',
        'team_name',
        'wowy_rapm',
        'wowy_orapm',
        'wowy_drapm',
        'exposure',
        'career_game_num',
        'date'
    ]);
    const wowySortConfig = {
        player_name: { type: 'text' },
        team_name: { type: 'text' },
        team_sort_label: { type: 'text' },
        wowy_rapm: { type: 'number' },
        wowy_orapm: { type: 'number' },
        wowy_drapm: { type: 'number' },
        exposure: { type: 'number' },
        season_possessions: { type: 'number' },
        career_game_num: { type: 'number' },
        season: { type: 'number' },
        date: { type: 'text' },
        season_games: { type: 'number' },
        first_date: { type: 'text' },
        last_date: { type: 'text' }
    };
    const currentTableColumns = [
        { key: '_rank', label: '#', align: 'right', sortable: false },
        { key: 'player_name', label: 'Player', align: 'left' },
        { key: 'team_name', label: 'Team', align: 'left' },
        {
            key: 'wowy_rapm',
            label: 'WOWY RAPM',
            align: 'right',
            tooltip: getMetricDefinition('wowy_rapm')
        },
        {
            key: 'wowy_orapm',
            label: 'O-RAPM',
            align: 'right',
            tooltip: getMetricDefinition('wowy_orapm')
        },
        {
            key: 'wowy_drapm',
            label: 'D-RAPM',
            align: 'right',
            tooltip: getMetricDefinition('wowy_drapm')
        },
        {
            key: 'exposure',
            label: 'Exposure',
            align: 'right',
            tooltip: getMetricDefinition('wowy_exposure')
        },
        {
            key: 'career_game_num',
            label: 'Sample G',
            align: 'right',
            tooltip: getMetricDefinition('wowy_sample_games')
        },
        { key: 'date', label: 'As of', align: 'right' }
    ];
    const seasonAdjustedTableColumns = [
        { key: '_rank', label: '#', align: 'right', sortable: false },
        { key: 'player_name', label: 'Player', align: 'left' },
        { key: 'team_sort_label', label: 'Teams', align: 'left' },
        {
            key: 'wowy_rapm',
            label: 'WOWY RAPM',
            align: 'right',
            tooltip: 'Season-average WOWY RAPM after updating the season baseline with season-specific game, quarter, box, and play-by-play-era evidence.'
        },
        {
            key: 'wowy_orapm',
            label: 'O-RAPM',
            align: 'right',
            tooltip: 'Offensive WOWY RAPM for the season.'
        },
        {
            key: 'wowy_drapm',
            label: 'D-RAPM',
            align: 'right',
            tooltip: 'Defensive WOWY RAPM for the season.'
        },
        {
            key: 'minutes',
            label: 'Minutes',
            align: 'right',
            sortable: false,
            tooltip: 'Total minutes played across the regular season and playoffs.'
        },
        {
            key: 'bpm',
            label: 'BPM',
            align: 'right',
            sortable: false,
            tooltip: 'Ordinary Basketball-Reference-style BPM 2.0, reconstructed from the season box score and weighted across regular-season and playoff possessions. It is shown on its native scale, not rescaled to WOWY.'
        },
    ];
    const allTimeAdjustedTableColumns = [
        { key: '_rank', label: '#', align: 'right', sortable: false },
        { key: 'player_name', label: 'Player', align: 'left' },
        { key: 'season', label: 'Season', align: 'left' },
        { key: 'team_sort_label', label: 'Teams', align: 'left' },
        ...seasonAdjustedTableColumns.slice(3, 6),
        {
            key: 'minutes',
            label: 'Minutes',
            align: 'right',
            sortable: false,
            tooltip: 'Total minutes played across the regular season and playoffs.'
        },
        {
            key: 'bpm',
            label: 'BPM',
            align: 'right',
            sortable: false,
            tooltip: 'Ordinary Basketball-Reference-style BPM 2.0, reconstructed from the season box score and weighted across regular-season and playoff possessions. It is shown on its native scale, not rescaled to WOWY.'
        }
    ];

    let sortColumn = $state('wowy_rapm');
    let sortDirection = $state('desc');
    let searchQuery = $state('');
    let teamFilter = $state('all');
    let positionFilter = $state('all');
    let minHeight = $state('');
    let maxHeight = $state('');
    let minPossessions = $state('');
    let maxPossessions = $state('');
    let leaderboardPage = $state(1);
    let allTimePlayers = $state(
        untrack(() => Array.isArray(data.players) ? [...data.players] : [])
    );
    let allTimeTotal = $state(
        untrack(() =>
            Number.isInteger(data.allTimeTotal)
                ? data.allTimeTotal
                : Array.isArray(data.players)
                    ? data.players.length
                    : 0
        )
    );
    let allTimeHasMore = $state(untrack(() => data.allTimeHasMore === true));
    let allTimeLoading = $state(false);
    let allTimeLoadError = $state('');
    let allTimeAppliedQuery = $state('');
    let allTimeRequestSequence = 0;
    // Complete all-time team and height choices, fetched once (see below).
    let allTimeFilterOptions = $state(null);
    let wowyTableRoot = $state(null);
    let wowyBodyScroller = $state(null);
    let wowyBodyTable = $state(null);
    let wowySourceHead = $state(null);
    let wowyHeaderScroller = $state(null);
    let wowyHeaderTable = $state(null);

    const players = $derived(
        data.selectedView === 'all-time'
            ? allTimePlayers
            : Array.isArray(data.players)
            ? data.players
            : Array.isArray(data.allTimePlayers)
                ? data.allTimePlayers
                : []
    );
    const publication = $derived(data.publication || null);

    // The all-time table loads 100 player-seasons at a time, so its filter choices come from the
    // whole publication instead of the loaded rows (else most teams would be missing).
    $effect(() => {
        if (data.selectedView !== 'all-time') return;
        if (untrack(() => allTimeFilterOptions)) return;
        fetch('/api/wowy/filter-options?rating=adjusted')
            .then((response) => (response.ok ? response.json() : null))
            .then((options) => {
                if (options) allTimeFilterOptions = options;
            })
            .catch(() => {});
    });
    // The loader lists only seasons with Season-Adjusted ratings.
    const seasonOptions = $derived(data.seasons || []);
    const hasAllTimeRanks = $derived.by(() =>
        players.some((player) => {
            const rank = Number.parseInt(player?.leaderboard_rank, 10);
            const season = Number.parseInt(player?.season, 10);
            return Number.isInteger(rank) && rank > 0 && Number.isInteger(season);
        })
    );
    const activeView = $derived.by(() => {
        if (data.selectedView === 'all-time' || data.selectedView === 'current' || data.selectedView === 'season') {
            return data.selectedView;
        }
        if (data.selectedSeason !== null && data.selectedSeason !== undefined) return 'season';

        // A rolling deployment can briefly pair this page with the prior loader.
        // Keep its active-player payload labeled as Current until the all-time rows arrive.
        return hasAllTimeRanks ? 'all-time' : 'current';
    });
    const isAllTimeView = $derived(activeView === 'all-time');
    const isCurrentView = $derived(activeView === 'current');
    const activeSeason = $derived(
        isAllTimeView
            ? 'all-time'
            : isCurrentView || data.selectedSeason === null || data.selectedSeason === undefined
                ? 'current'
                : String(data.selectedSeason)
    );
    const activeSeasonLabel = $derived(
        isAllTimeView ? 'All time' : activeSeason === 'current' ? 'Current' : formatSeasonLabel(activeSeason)
    );
    // All time and each season show Season-Adjusted ratings; Current shows the latest observed ones.
    const tableColumns = $derived(
        isAllTimeView
            ? allTimeAdjustedTableColumns
            : isCurrentView
                ? currentTableColumns
                : seasonAdjustedTableColumns
    );
    const teamColumnKey = $derived(isCurrentView ? 'team_name' : 'team_sort_label');
    const teamOptions = $derived.by(() => {
        const teams = new Map();
        if (isAllTimeView) {
            for (const team of allTimeFilterOptions?.teams ?? []) teams.set(team.value, team);
        }
        for (const player of players) {
            for (const team of teamOptionEntries(player)) {
                if (!team.value || teams.has(team.value)) continue;
                teams.set(team.value, team);
            }
        }
        return [...teams.values()].sort((left, right) => left.label.localeCompare(right.label));
    });
    const activeTeamFilter = $derived(
        isAllTimeView ||
        teamFilter === 'all' ||
        teamOptions.some((team) => team.value === teamFilter)
            ? teamFilter
            : 'all'
    );
    const activePositionFilter = $derived(
        positionFilter === 'all' || positionOptions.some((position) => position.value === positionFilter)
            ? positionFilter
            : 'all'
    );
    const heightOptions = $derived.by(() => {
        const heights = new Set(isAllTimeView ? (allTimeFilterOptions?.heights ?? []) : []);
        for (const player of players) {
            const height = playerHeightInches(player);
            if (height !== null && height > 0) heights.add(height);
        }
        return [...heights].sort((left, right) => left - right);
    });
    const activeMinHeight = $derived(parseHeightBound(minHeight));
    const activeMaxHeight = $derived(parseHeightBound(maxHeight));
    const hasHeightFilter = $derived(activeMinHeight !== null || activeMaxHeight !== null);
    const hasInvalidHeightRange = $derived(
        activeMinHeight !== null && activeMaxHeight !== null && activeMinHeight > activeMaxHeight
    );
    const activeMinPossessions = $derived(parsePossessionBound(minPossessions));
    const activeMaxPossessions = $derived(parsePossessionBound(maxPossessions));
    const hasPossessionFilter = $derived(
        activeMinPossessions !== null || activeMaxPossessions !== null
    );
    const hasInvalidPossessionRange = $derived(
        activeMinPossessions !== null &&
        activeMaxPossessions !== null &&
        activeMinPossessions > activeMaxPossessions
    );
    const hasAdvancedFilter = $derived(hasHeightFilter || (isAllTimeView && hasPossessionFilter));
    const teamScopedPlayers = $derived.by(() =>
        activeTeamFilter === 'all'
            ? players
            : players.filter((player) => teamFilterValues(player).includes(activeTeamFilter))
    );
    const positionScopedPlayers = $derived.by(() =>
        activePositionFilter === 'all'
            ? teamScopedPlayers
            : teamScopedPlayers.filter((player) => playerMatchesPosition(player, activePositionFilter))
    );
    const heightScopedPlayers = $derived.by(() =>
        positionScopedPlayers.filter((player) => matchesHeightRange(player, activeMinHeight, activeMaxHeight))
    );
    const possessionScopedPlayers = $derived.by(() =>
        isAllTimeView
            ? heightScopedPlayers.filter((player) =>
                matchesPossessionRange(player, activeMinPossessions, activeMaxPossessions)
            )
            : heightScopedPlayers
    );
    const filteredPlayers = $derived.by(() => {
        const query = searchQuery.trim().toLocaleLowerCase();
        if (!query) return possessionScopedPlayers;

        return possessionScopedPlayers.filter((player) => {
            const searchable = [
                player?.player_name,
                player?.team_name,
                player?.team_code,
                player?.league,
                ...historicalTeamCodes(player),
                ...historicalTeamNames(player),
                teamDisplayLabel(player),
                teamAbbr(player?.team_name),
                playerFilterPosition(player),
                player?.season
            ].join(' ').toLocaleLowerCase();
            return searchable.includes(query);
        });
    });
    const sortedPlayers = $derived.by(() =>
        getSortedRows(filteredPlayers, {
            sortColumn,
            sortDirection,
            sortConfigs: wowySortConfig
        })
    );
    const leaderboardPageCount = $derived(Math.max(1, Math.ceil(sortedPlayers.length / PAGE_SIZE)));
    const activeLeaderboardPage = $derived(Math.min(leaderboardPage, leaderboardPageCount));
    const visiblePlayers = $derived.by(() => {
        if (isAllTimeView) return sortedPlayers;
        const start = (activeLeaderboardPage - 1) * PAGE_SIZE;
        return sortedPlayers.slice(start, start + PAGE_SIZE);
    });
    const heatScales = $derived.by(() =>
        buildPresetHeatScales(players, 'wowy')
    );
    const rapmTintLimit = $derived(tintLimit(players.map((player) => player?.wowy_rapm)));
    const rangeStart = $derived(
        sortedPlayers.length === 0
            ? 0
            : isAllTimeView
                ? 1
                : (activeLeaderboardPage - 1) * PAGE_SIZE + 1
    );
    const rangeEnd = $derived(
        isAllTimeView
            ? sortedPlayers.length
            : Math.min(activeLeaderboardPage * PAGE_SIZE, sortedPlayers.length)
    );
    const freshnessLabel = $derived(
        publication?.data_through
            ? `Data through ${formatObservedDate(publication.data_through)}`
            : 'Latest published observations'
    );
    const viewStatusDetail = $derived(
        isAllTimeView
            ? 'Every modeled player-season, loaded 100 at a time.'
            : isCurrentView
                ? freshnessLabel
                : 'Each rating starts from the season WOWY baseline and shifts it a bounded amount for how the player performed that season.'
    );
    let methodOpen = $state(false);
    const viewSubtitle = $derived(
        isAllTimeView
            ? 'Every WOWY RAPM player-season.'
            : isCurrentView
                ? 'Synthetic game-level RAPM for current active players.'
                : `WOWY RAPM for ${activeSeasonLabel}.`
    );
    const viewStatusLabel = $derived(
        isAllTimeView ? 'All seasons' : isCurrentView ? 'Latest observed' : 'Single season'
    );

    $effect(() => {
        const nextPlayers = Array.isArray(data.players) ? [...data.players] : [];
        if (data.selectedView === 'all-time') {
            allTimePlayers = nextPlayers;
            allTimeTotal = Number.isInteger(data.allTimeTotal)
                ? data.allTimeTotal
                : nextPlayers.length;
            allTimeHasMore = data.allTimeHasMore === true;
            allTimeLoadError = '';
            allTimeAppliedQuery = defaultAllTimeQuerySignature();
        }
    });

    $effect(() => {
        if (!isAllTimeView || hasInvalidHeightRange || hasInvalidPossessionRange) return;

        const querySignature = buildAllTimeQuerySignature();
        if (querySignature === allTimeAppliedQuery) return;

        const delay = searchQuery.trim() ? 250 : 0;
        const timer = window.setTimeout(() => {
            loadAllTimePage({ reset: true, querySignature });
        }, delay);
        return () => window.clearTimeout(timer);
    });

    $effect(() => {
        activeLeaderboardPage;
        visiblePlayers;
        tableColumns.length;
        sortColumn;
        sortDirection;
        wowyTableRoot;
        wowyBodyScroller;
        wowyBodyTable;
        wowySourceHead;
        wowyHeaderScroller;
        wowyHeaderTable;

        return setupWideStickyTable({
            root: wowyTableRoot,
            bodyScroller: wowyBodyScroller,
            bodyTable: wowyBodyTable,
            sourceHead: wowySourceHead,
            headerScroller: wowyHeaderScroller,
            headerTable: wowyHeaderTable,
            wheelTarget: wowyHeaderScroller
        });
    });

    function toNumber(value) {
        const number = Number.parseFloat(value);
        return Number.isFinite(number) ? number : null;
    }

    function parseHeightBound(value) {
        const height = toNumber(value);
        return height !== null && height > 0 ? height : null;
    }

    function parsePossessionBound(value) {
        const possessions = toNumber(value);
        return possessions !== null && possessions >= 0 ? possessions : null;
    }

    function formatHeightLabel(value) {
        const height = toNumber(value);
        if (height === null || height <= 0) return '—';

        const inches = Math.round(height);
        return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
    }

    function playerHeightInches(player) {
        const height = toNumber(player?.height_inches ?? player?.height);
        return height !== null && height > 0 ? height : null;
    }

    function matchesHeightRange(player, minimum, maximum) {
        if (minimum === null && maximum === null) return true;

        const height = playerHeightInches(player);
        if (height === null) return false;
        return (minimum === null || height >= minimum) && (maximum === null || height <= maximum);
    }

    function playerSeasonPossessions(player) {
        const possessions = toNumber(
            player?.season_possessions ??
            (player?.snapshot_context === 'season-adjusted' ? player?.exposure : null)
        );
        return possessions !== null && possessions >= 0 ? possessions : null;
    }

    function matchesPossessionRange(player, minimum, maximum) {
        if (minimum === null && maximum === null) return true;

        const possessions = playerSeasonPossessions(player);
        if (possessions === null) return false;
        return (
            (minimum === null || possessions >= minimum) &&
            (maximum === null || possessions <= maximum)
        );
    }

    function toggleSort(column) {
        ({ sortColumn, sortDirection } = getNextSortState({
            sortColumn,
            sortDirection,
            column,
            defaultDirection: textSortColumns.has(column) ? 'asc' : 'desc'
        }));
        leaderboardPage = 1;
    }

    function setTeamFilter(value) {
        teamFilter = value;
        leaderboardPage = 1;
        // Keep the address shareable (?team=) without reloading the page's data.
        const url = new URL(window.location.href);
        if (value === 'all') url.searchParams.delete('team');
        else url.searchParams.set('team', value);
        replaceState(url, {});
    }

    function setPositionFilter(value) {
        positionFilter = value;
        leaderboardPage = 1;
    }

    function setHeightFilter(bound, value) {
        if (bound === 'min') {
            minHeight = value;
        } else {
            maxHeight = value;
        }
        leaderboardPage = 1;
    }

    function clearHeightFilters() {
        minHeight = '';
        maxHeight = '';
        leaderboardPage = 1;
    }

    function setPossessionFilter(bound, value) {
        if (bound === 'min') {
            minPossessions = value;
        } else {
            maxPossessions = value;
        }
        leaderboardPage = 1;
    }

    function clearPossessionFilters() {
        minPossessions = '';
        maxPossessions = '';
        leaderboardPage = 1;
    }

    function setSearchQuery(value) {
        searchQuery = value;
        leaderboardPage = 1;
    }

    function formatSeasonLabel(season) {
        const label = formatSeasonEndYearLabel(season);
        return label ? `${label} Season` : `${season} Season`;
    }

    // The season picker navigates; the effect below resets the filters for the new view.
    function selectSeason(event) {
        goto(seasonHref(event.currentTarget.value), { keepFocus: true });
    }

    function seasonHref(selection, team = null) {
        const params = new URLSearchParams();
        if (selection === 'current') {
            params.set('view', 'current');
        } else if (selection !== 'all-time') {
            params.set('season', String(selection));
        }
        if (team) params.set('team', team);
        const suffix = params.size > 0 ? `?${params.toString()}` : '';
        return `/wowy${suffix}`;
    }

    // A clicked season opens that season; a clicked team opens its season filtered to that team.
    // In Current, a team filters the current players.
    function playerSeasonHref(player) {
        const season = Number.parseInt(player?.season, 10);
        return Number.isInteger(season) ? seasonHref(season) : null;
    }

    function teamSeasonHref(player, team) {
        if (isCurrentView) return seasonHref('current', team);
        const season = isAllTimeView ? Number.parseInt(player?.season, 10) : data.selectedSeason;
        return Number.isInteger(season) ? seasonHref(season, team) : null;
    }

    // Every navigation (the season picker, a clicked season or team) starts from clean filters,
    // takes its team from the URL, and keeps a sort the new view supports.
    $effect(() => {
        const view = data.selectedView;
        const team = data.selectedTeam;
        untrack(() => {
            const supportedSortColumns = view === 'all-time'
                ? allTimeSortColumns
                : view === 'current'
                    ? currentSortColumns
                    : seasonSortColumns;
            if (!supportedSortColumns.has(sortColumn)) {
                sortColumn = 'wowy_rapm';
                sortDirection = 'desc';
            }
            teamFilter = team ?? 'all';
            positionFilter = 'all';
            minHeight = '';
            maxHeight = '';
            minPossessions = '';
            maxPossessions = '';
            searchQuery = '';
            leaderboardPage = 1;
        });
    });

    function buildAllTimeQuerySignature() {
        return JSON.stringify({
            search: searchQuery.trim(),
            team: teamFilter === 'all' ? null : teamFilter,
            position: positionFilter === 'all' ? null : positionFilter,
            minHeight: activeMinHeight,
            maxHeight: activeMaxHeight,
            minPossessions: activeMinPossessions,
            maxPossessions: activeMaxPossessions,
            sortColumn,
            sortDirection
        });
    }

    function defaultAllTimeQuerySignature() {
        return JSON.stringify({
            search: '',
            team: null,
            position: null,
            minHeight: null,
            maxHeight: null,
            minPossessions: null,
            maxPossessions: null,
            sortColumn: 'wowy_rapm',
            sortDirection: 'desc'
        });
    }

    function buildAllTimeRequestUrl(offset) {
        const params = new URLSearchParams({
            rating: 'adjusted',
            limit: String(ALL_TIME_BATCH_SIZE),
            offset: String(offset),
            sort: sortColumn,
            direction: sortDirection
        });
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        if (teamFilter !== 'all') params.set('team', teamFilter);
        if (positionFilter !== 'all') params.set('position', positionFilter);
        if (activeMinHeight !== null) params.set('min_height', String(activeMinHeight));
        if (activeMaxHeight !== null) params.set('max_height', String(activeMaxHeight));
        if (activeMinPossessions !== null) {
            params.set('min_possessions', String(activeMinPossessions));
        }
        if (activeMaxPossessions !== null) {
            params.set('max_possessions', String(activeMaxPossessions));
        }
        return `/api/wowy/all-time?${params.toString()}`;
    }

    async function loadAllTimePage({ reset = false, querySignature = null } = {}) {
        if (!isAllTimeView || allTimeLoading) return;
        if (hasInvalidHeightRange || hasInvalidPossessionRange) return;

        const requestSequence = ++allTimeRequestSequence;
        const signature = querySignature ?? buildAllTimeQuerySignature();
        const offset = reset ? 0 : allTimePlayers.length;
        allTimeLoading = true;
        allTimeLoadError = '';

        try {
            const response = await fetch(buildAllTimeRequestUrl(offset));
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error || 'Could not load more WOWY seasons.');
            }
            if (requestSequence !== allTimeRequestSequence) return;

            const nextPlayers = Array.isArray(payload.players) ? payload.players : [];
            allTimePlayers = reset
                ? nextPlayers
                : appendUniquePlayerSeasons(allTimePlayers, nextPlayers);
            allTimeTotal = Number.isInteger(payload.totalCount)
                ? payload.totalCount
                : allTimePlayers.length;
            allTimeHasMore = payload.hasMore === true;
            allTimeAppliedQuery = signature;
            leaderboardPage = 1;
        } catch (error) {
            if (requestSequence !== allTimeRequestSequence) return;
            allTimeLoadError = error instanceof Error
                ? error.message
                : 'Could not load more WOWY seasons.';
            allTimeAppliedQuery = signature;
        } finally {
            if (requestSequence === allTimeRequestSequence) {
                allTimeLoading = false;
            }
        }
    }

    function appendUniquePlayerSeasons(existing, additions) {
        const keys = new Set(existing.map((player) => playerRowKey(player)));
        return [
            ...existing,
            ...additions.filter((player) => {
                const key = playerRowKey(player);
                if (keys.has(key)) return false;
                keys.add(key);
                return true;
            })
        ];
    }

    function formatObservedDate(value) {
        if (typeof value !== 'string' || !value.trim()) return '—';
        const dateOnly = value.includes('T') ? value.split('T')[0] : value;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;

        const date = new Date(`${dateOnly}T12:00:00Z`);
        if (Number.isNaN(date.getTime())) return dateOnly;
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'
        }).format(date);
    }

    function formatWholeNumber(value) {
        const number = toNumber(value);
        return number === null ? '—' : Math.round(number).toLocaleString('en-US');
    }

    function formatPlayerSeason(player) {
        return formatSeasonEndYearLabel(player?.season) || '—';
    }

    function allTimeRank(player, fallbackRank) {
        const rank = Number.parseInt(player?.leaderboard_rank, 10);
        return Number.isInteger(rank) && rank > 0 ? rank : fallbackRank;
    }

    function playerRowKey(player) {
        const nbaId = player?.nba_id ?? 'unknown';
        return isAllTimeView ? `${player?.season ?? 'unknown'}-${nbaId}` : nbaId;
    }

    function metricTone(value) {
        const number = toNumber(value);
        if (number === null) return 'metric-muted';
        if (number > 0) return 'metric-positive';
        if (number < 0) return 'metric-negative';
        return 'metric-neutral';
    }

    function playerName(player) {
        return player?.player_name || `Player ${player?.nba_id ?? '—'}`;
    }

    function historicalLeagueLabel(player) {
        const league = String(player?.league || '').trim().toUpperCase();
        if (!league.includes('ABA')) return null;
        return player?.cross_league_level_identified === false
            ? `${league} · level unlinked`
            : league;
    }

    function playerFilterPosition(player) {
        const position = player?.filter_position ?? player?.position;
        return typeof position === 'string' ? position.trim().toUpperCase() : '';
    }

    function playerMatchesPosition(player, positionGroup) {
        return playerFilterPosition(player).split('-').includes(positionGroup);
    }

    function playerTrajectoryUrl(player) {
        return `/trajectories?ids=${encodeURIComponent(player.nba_id)}&metric=wowy_rapm`;
    }

    function uniqueNonEmptyStrings(value) {
        const values = Array.isArray(value) ? value : [value];
        const unique = new Set();
        for (const item of values) {
            if (typeof item !== 'string' || !item.trim()) continue;
            unique.add(item.trim());
        }
        return [...unique];
    }

    function isHistoricalSeasonSummary(player) {
        return !isCurrentView ||
            player?.snapshot_context === 'season-average' ||
            player?.snapshot_context === 'opening-game';
    }

    function historicalTeamCodes(player) {
        const codes = uniqueNonEmptyStrings(player?.team_codes);
        if (codes.length > 0) return codes;
        return uniqueNonEmptyStrings(player?.team_code);
    }

    function historicalTeamNames(player) {
        const names = uniqueNonEmptyStrings(player?.team_names);
        if (names.length > 0) return names;
        return uniqueNonEmptyStrings(player?.team_name);
    }

    function teamFilterValues(player) {
        if (isHistoricalSeasonSummary(player)) {
            const codes = historicalTeamCodes(player);
            return codes.length > 0 ? codes : historicalTeamNames(player);
        }
        return uniqueNonEmptyStrings(player?.team_name);
    }

    function teamDisplayLabel(player) {
        if (isHistoricalSeasonSummary(player)) {
            const codes = historicalTeamCodes(player);
            if (codes.length > 0) return codes.join(' · ');

            const names = historicalTeamNames(player);
            return names.length > 0 ? names.join(' · ') : '—';
        }
        return teamAbbr(player?.team_name) || '—';
    }

    function teamDisplayTitle(player) {
        if (!isHistoricalSeasonSummary(player)) return undefined;
        const names = historicalTeamNames(player);
        return names.length > 0 ? names.join(' · ') : undefined;
    }

    function teamOptionEntries(player) {
        if (!isHistoricalSeasonSummary(player)) {
            const value = player?.team_name;
            return value ? [{ value, label: teamAbbr(value) || value }] : [];
        }

        const codes = historicalTeamCodes(player);
        const names = historicalTeamNames(player);
        if (codes.length > 0) {
            return codes.map((code, index) => {
                const name = names[index] ?? (codes.length === 1 ? names[0] : null);
                return {
                    value: code,
                    label: name && name !== code ? `${code} — ${name}` : code,
                    title: name || undefined
                };
            });
        }

        return names.map((name) => ({ value: name, label: name, title: name }));
    }

    function teamLogoUrl(player) {
        if (isHistoricalSeasonSummary(player)) return null;
        const teamId = Number.parseInt(player?.tm_id, 10);
        return Number.isInteger(teamId) && teamId > 0 ? `/api/img/logo/${teamId}` : null;
    }

    function hideBrokenImage(event) {
        event.currentTarget.hidden = true;
    }

    function exportPlayersCsv() {
        const seasonFileLabel = isAllTimeView
            ? 'all-time-loaded'
            : isCurrentView
                ? 'current-active'
                : `${formatSeasonEndYearLabel(activeSeason) ?? activeSeason}-season`;
        exportCsvRows({
            rows: sortedPlayers.map((player, index) => ({
                ...player,
                rank: isAllTimeView ? allTimeRank(player, index + 1) : index + 1
            })),
            columns: isAllTimeView
                ? wowyAdjustedAllTimeLeaderboardCsvColumns
                : isCurrentView
                    ? wowyLeaderboardCsvColumns
                    : wowyAdjustedHistoricalLeaderboardCsvColumns,
            filename: `darko-wowy-rapm-${seasonFileLabel}.csv`
        });
    }
</script>

{#snippet wowySemanticHeaderRow()}
    <tr class="table-semantic-row sr-only">
        {#each tableColumns as column (column.key)}
            <th
                id={`wowy-column-${column.key}`}
                scope="col"
                aria-sort={getSortAriaValue(sortColumn, sortDirection, column.key)}
            >{column.label}</th>
        {/each}
    </tr>
{/snippet}

{#snippet wowyHeaderRow()}
    <tr class="table-sizing-row">
        {#each tableColumns as column (column.key)}
            <th
                scope="col"
                aria-sort={getSortAriaValue(sortColumn, sortDirection, column.key)}
                class:align-right={column.align === 'right'}
                class:active-sort={sortColumn === column.key}
            >
                <div class="wowy-column-heading">
                    {#if column.sortable !== false}
                        <button
                            type="button"
                            onclick={() => toggleSort(column.key)}
                            aria-label={`Sort by ${column.label}`}
                        >
                            <span>{column.label}</span>
                            <span class="wowy-sort-glyph" aria-hidden="true">
                                {getSortGlyph(sortColumn, sortDirection, column.key)}
                            </span>
                        </button>
                    {:else}
                        <span>{column.label}</span>
                    {/if}
                    {#if column.tooltip}
                        <MetricTooltip text={column.tooltip}>
                            <span class="wowy-tooltip-mark" aria-hidden="true">i</span>
                        </MetricTooltip>
                    {/if}
                </div>
            </th>
        {/each}
    </tr>
{/snippet}

<svelte:head>
    <title>WOWY RAPM — DARKO DPM</title>
    <meta
        name="description"
        content={isAllTimeView
            ? 'All WOWY RAPM player-seasons, loaded 100 at a time.'
            : isCurrentView
                ? 'Latest observed WOWY RAPM ratings for current active NBA players.'
                : 'WOWY RAPM ratings for one NBA season.'}
    />
</svelte:head>

<div class="wowy-page" data-shiny-page>
    <div class="container wowy-container">
        <div class="wowy-intro">
            <PageHeader id="wowy-title" eyebrow="Game-level impact" title="WOWY RAPM" lede={viewSubtitle}>
                <p class="wowy-status"><strong>{viewStatusLabel}</strong> <span>{viewStatusDetail}</span></p>
                <p class="page-note">
                    Observed games only; this page does not use DARKO projection rows. Season ratings begin in 1977-78; daily WOWY, back to 1956-57, is on each player’s trajectory.
                </p>
            </PageHeader>

            <!-- On narrow screens the explainer folds away so the table comes first. -->
            <button
                type="button"
                class="btn wowy-method-toggle"
                aria-expanded={methodOpen}
                aria-controls="wowy-method"
                onclick={() => (methodOpen = !methodOpen)}
            >
                How to read this table
            </button>
            <aside id="wowy-method" class="wowy-method" class:open={methodOpen} data-shiny-surface="well" aria-label="How to read WOWY RAPM">
                <p class="wowy-method-label">Reading the table</p>
                <p>{getMetricDefinition('wowy_rapm')}</p>
                <p>
                    {#if isAllTimeView}
                        Each row is one modeled player-season, ranked by WOWY RAPM. Each rating starts from the underlying daily WOWY baseline and shifts it for how the player performed in that season. Regular-season and playoff evidence are included. BPM is the ordinary box-score baseline; WOWY adds non-box evidence. Results load 100 at a time, with no default possession cutoff.
                    {:else if isCurrentView}
                        Each player row is dated to that player’s most recent observed game; team and position reflect the current DARKO roster.
                    {:else}
                        Each row is the player’s O-RAPM, D-RAPM, and total RAPM for {activeSeasonLabel}. The table includes every player-season emitted by the model and uses both regular-season and playoff games.
                    {/if}
                    Click a season to open it, or a team to see that team’s season.
                </p>
                <div class="wowy-method-links">
                    <a href="/wowy/about">Read how WOWY works <span aria-hidden="true">→</span></a>
                    <a href="/trajectories?metric=wowy_rapm">Explore career trajectories <span aria-hidden="true">→</span></a>
                </div>
            </aside>
        </div>

        <section class="wowy-table-panel" data-shiny-surface="panel" aria-labelledby="wowy-table-title">
            <div class="wowy-table-heading">
                <div>
                    <p class="wowy-eyebrow" data-shiny-role="editorial-kicker">Leaderboard</p>
                    <h2 id="wowy-table-title">
                        {isAllTimeView
                            ? 'All-time seasons'
                            : isCurrentView
                                ? 'Current active players'
                                : activeSeasonLabel}
                    </h2>
                    <p>
                        {#if sortedPlayers.length === 0}
                            No players match this season and these filters.
                        {:else}
                            {#if isAllTimeView}
                                Showing {rangeStart}–{rangeEnd} of {allTimeTotal} matching player-seasons, ranked by WOWY RAPM.
                            {:else if isCurrentView}
                                Showing {rangeStart}–{rangeEnd} of {sortedPlayers.length} current active players with an observed WOWY rating.
                            {:else}
                                Showing {rangeStart}–{rangeEnd} of {sortedPlayers.length} players with a modeled rating in {activeSeasonLabel}.
                            {/if}
                        {/if}
                    </p>
                </div>
                <button
                    class="wowy-export-button"
                    type="button"
                    onclick={exportPlayersCsv}
                    disabled={sortedPlayers.length === 0}
                >
                    {isAllTimeView ? 'Download loaded CSV' : 'Download CSV'}
                </button>
            </div>

            <div
                class="wowy-controls"
                class:wowy-controls--current={isCurrentView}
                data-shiny-surface="well"
            >
                <label class="wowy-control-field" for="wowy-season-filter">
                    <span class="sr-only">Season</span>
                    <select
                        id="wowy-season-filter"
                        value={activeSeason}
                        onchange={selectSeason}
                    >
                        <option value="all-time">All time</option>
                        <option value="current">Current</option>
                        {#each seasonOptions as season (season)}
                            <option value={String(season)}>{formatSeasonLabel(season)}</option>
                        {/each}
                    </select>
                </label>

                <label class="wowy-control-field" for="wowy-team-filter">
                    <span class="sr-only">Filter by team</span>
                    <select
                        id="wowy-team-filter"
                        value={activeTeamFilter}
                        onchange={(event) => setTeamFilter(event.currentTarget.value)}
                    >
                        <option value="all">All teams</option>
                        {#each teamOptions as team (team.value)}
                            <option value={team.value} title={team.title}>{team.label}</option>
                        {/each}
                    </select>
                </label>

                <label class="wowy-control-field" for="wowy-position-filter">
                    <span class="sr-only">Filter by position</span>
                    <select
                        id="wowy-position-filter"
                        value={activePositionFilter}
                        onchange={(event) => setPositionFilter(event.currentTarget.value)}
                    >
                        <option value="all">All positions</option>
                        {#each positionOptions as position (position.value)}
                            <option value={position.value}>{position.label}</option>
                        {/each}
                    </select>
                </label>

                <label class="wowy-control-field wowy-control-field--search" for="wowy-player-search">
                    <span class="sr-only">Search players</span>
                    <input
                        id="wowy-player-search"
                        type="search"
                        value={searchQuery}
                        oninput={(event) => setSearchQuery(event.currentTarget.value)}
                        placeholder={isCurrentView
                            ? 'Search players, teams, or positions...'
                            : 'Search players or historical teams...'}
                    />
                </label>
            </div>

            <details class="wowy-advanced-filters">
                <summary>
                    <span>Advanced filters</span>
                    {#if hasAdvancedFilter}
                        <span class="wowy-filter-indicator">
                            {isAllTimeView && hasPossessionFilter && hasHeightFilter
                                ? '2 active'
                                : isAllTimeView && hasPossessionFilter
                                    ? 'Possessions active'
                                    : 'Height active'}
                        </span>
                    {/if}
                </summary>
                <div class="wowy-advanced-filters__content">
                    {#if isAllTimeView}
                        <section class="wowy-advanced-filter-group" aria-labelledby="wowy-possession-filter-title">
                            <div>
                                <h3 id="wowy-possession-filter-title">Season possessions</h3>
                                <p id="wowy-possession-filter-help">
                                    Includes regular-season and playoff possessions. Average-only rows without a modeled possession total are excluded only when a bound is set.
                                </p>
                            </div>
                            <div class="wowy-filter-fields">
                                <label class="wowy-filter-field" for="wowy-min-possessions-filter">
                                    <span>Minimum possessions</span>
                                    <input
                                        id="wowy-min-possessions-filter"
                                        type="number"
                                        min="0"
                                        step="100"
                                        inputmode="numeric"
                                        value={minPossessions}
                                        aria-describedby="wowy-possession-filter-help"
                                        placeholder="No minimum"
                                        oninput={(event) => setPossessionFilter('min', event.currentTarget.value)}
                                    />
                                </label>
                                <label class="wowy-filter-field" for="wowy-max-possessions-filter">
                                    <span>Maximum possessions</span>
                                    <input
                                        id="wowy-max-possessions-filter"
                                        type="number"
                                        min="0"
                                        step="100"
                                        inputmode="numeric"
                                        value={maxPossessions}
                                        aria-describedby="wowy-possession-filter-help"
                                        placeholder="No maximum"
                                        oninput={(event) => setPossessionFilter('max', event.currentTarget.value)}
                                    />
                                </label>
                                <button
                                    class="wowy-filter-clear"
                                    type="button"
                                    onclick={clearPossessionFilters}
                                    disabled={!hasPossessionFilter}
                                >
                                    Clear possessions
                                </button>
                            </div>
                            {#if hasInvalidPossessionRange}
                                <p class="wowy-filter-error" role="status">
                                    Minimum possessions must not exceed maximum possessions.
                                </p>
                            {/if}
                        </section>
                    {/if}

                    <section class="wowy-advanced-filter-group" aria-labelledby="wowy-height-filter-title">
                        <div>
                            <h3 id="wowy-height-filter-title">Listed height</h3>
                            <p id="wowy-height-filter-help">
                                Players without a recorded height are excluded only when a bound is set.
                            </p>
                        </div>
                        <div class="wowy-filter-fields">
                            <label class="wowy-filter-field" for="wowy-min-height-filter">
                                <span>Minimum height</span>
                                <select
                                    id="wowy-min-height-filter"
                                    value={minHeight}
                                    aria-describedby="wowy-height-filter-help"
                                    onchange={(event) => setHeightFilter('min', event.currentTarget.value)}
                                >
                                    <option value="">No minimum</option>
                                    {#each heightOptions as height (height)}
                                        <option value={String(height)}>{formatHeightLabel(height)}</option>
                                    {/each}
                                </select>
                            </label>
                            <label class="wowy-filter-field" for="wowy-max-height-filter">
                                <span>Maximum height</span>
                                <select
                                    id="wowy-max-height-filter"
                                    value={maxHeight}
                                    aria-describedby="wowy-height-filter-help"
                                    onchange={(event) => setHeightFilter('max', event.currentTarget.value)}
                                >
                                    <option value="">No maximum</option>
                                    {#each heightOptions as height (height)}
                                        <option value={String(height)}>{formatHeightLabel(height)}</option>
                                    {/each}
                                </select>
                            </label>
                            <button
                                class="wowy-filter-clear"
                                type="button"
                                onclick={clearHeightFilters}
                                disabled={!hasHeightFilter}
                            >
                                Clear height
                            </button>
                        </div>
                        {#if hasInvalidHeightRange}
                            <p class="wowy-filter-error" role="status">
                                Minimum height must not exceed maximum height.
                            </p>
                        {/if}
                    </section>
                </div>
            </details>

            <div class="wowy-table-shell" data-shiny-table bind:this={wowyTableRoot}>
                <div class="sticky-header-shell">
                    <div class="table-header-scroll" bind:this={wowyHeaderScroller}>
                        <table
                            class="wowy-table sticky-header-table"
                            role="presentation"
                            class:wowy-table--all-time={isAllTimeView}
                            bind:this={wowyHeaderTable}
                        >
                            <thead>
                                {@render wowyHeaderRow()}
                            </thead>
                        </table>
                    </div>
                </div>

                <div class="table-body-scroll" bind:this={wowyBodyScroller}>
                    <table
                        class="wowy-table"
                        class:wowy-table--all-time={isAllTimeView}
                        bind:this={wowyBodyTable}
                    >
                        <thead class="table-sizing-head" bind:this={wowySourceHead}>
                            {@render wowySemanticHeaderRow()}
                            {@render wowyHeaderRow()}
                        </thead>
                        <tbody>
                        {#if visiblePlayers.length === 0}
                            <tr>
                                <td class="wowy-empty-row" colspan={tableColumns.length}>
                                    No players match the selected season and filters.
                                </td>
                            </tr>
                        {:else}
                            {#each visiblePlayers as player, index (playerRowKey(player))}
                                {@const fallbackRank = isAllTimeView
                                    ? index + 1
                                    : (activeLeaderboardPage - 1) * PAGE_SIZE + index + 1}
                                {@const rank = isAllTimeView ? allTimeRank(player, fallbackRank) : fallbackRank}
                                <tr>
                                    <td headers="wowy-column-_rank" class="align-right wowy-rank-cell">{rank}</td>
                                    <td headers="wowy-column-player_name" class="wowy-player-cell">
                                        <a
                                            class="wowy-player-link"
                                            href={playerTrajectoryUrl(player)}
                                            aria-label={`Open ${playerName(player)}'s WOWY RAPM trajectory`}
                                        >
                                            <span>{playerName(player)}</span>
                                            {#if historicalLeagueLabel(player)}
                                                <small>{historicalLeagueLabel(player)}</small>
                                            {:else if player.position}
                                                <small>{player.position}</small>
                                            {/if}
                                        </a>
                                    </td>
                                    {#if isAllTimeView}
                                        <td headers="wowy-column-season" class="wowy-season-cell">
                                            {#if playerSeasonHref(player)}
                                                <a
                                                    class="wowy-filter-link"
                                                    href={playerSeasonHref(player)}
                                                    title={`Show the ${formatPlayerSeason(player)} season`}
                                                >{formatPlayerSeason(player)}</a>
                                            {:else}
                                                {formatPlayerSeason(player)}
                                            {/if}
                                        </td>
                                    {/if}
                                    <td headers={`wowy-column-${teamColumnKey}`}>
                                        {#if isHistoricalSeasonSummary(player)}
                                            {@const teams = teamFilterValues(player)}
                                            {#if teams.length > 0}
                                                <span class="wowy-historical-team" title={teamDisplayTitle(player)}>
                                                    <span class="wowy-team-codes">
                                                        {#each teams as team, teamIndex (team)}
                                                            {#if teamIndex > 0}<span class="wowy-team-separator" aria-hidden="true">·</span>{/if}
                                                            {#if teamSeasonHref(player, team)}
                                                                <a
                                                                    class="wowy-filter-link"
                                                                    href={teamSeasonHref(player, team)}
                                                                    title={`Show ${team} in ${isAllTimeView ? formatPlayerSeason(player) : activeSeasonLabel}`}
                                                                >{team}</a>
                                                            {:else}
                                                                <span>{team}</span>
                                                            {/if}
                                                        {/each}
                                                    </span>
                                                    {#if teamDisplayTitle(player) && teamDisplayTitle(player) !== teamDisplayLabel(player)}
                                                        <small>{teamDisplayTitle(player)}</small>
                                                    {/if}
                                                </span>
                                            {:else}
                                                <span class="metric-muted">—</span>
                                            {/if}
                                        {:else if player?.team_name}
                                            <a
                                                class="wowy-team-link"
                                                href={teamSeasonHref(player, player.team_name)}
                                                title={`Show current ${player.team_name} players`}
                                            >
                                                <span class="wowy-team-mark">
                                                    {#if teamLogoUrl(player)}
                                                        <img src={teamLogoUrl(player)} alt="" loading="lazy" onerror={hideBrokenImage} />
                                                    {/if}
                                                </span>
                                                <span>{teamAbbr(player.team_name)}</span>
                                            </a>
                                        {:else}
                                            <span class="metric-muted">—</span>
                                        {/if}
                                    </td>
                                    <td
                                        headers="wowy-column-wowy_rapm"
                                        class={`align-right wowy-metric-cell wowy-rapm-cell tint-cell ${metricTone(player.wowy_rapm)}`}
                                        style={`${getMetricHeatVariables('dpm', player.wowy_rapm, heatScales)} ${divergingTint(player.wowy_rapm, rapmTintLimit)}`}
                                    >
                                        {formatSignedMetric(player.wowy_rapm)}
                                    </td>
                                    <td
                                        headers="wowy-column-wowy_orapm"
                                        class={`align-right wowy-metric-cell ${metricTone(player.wowy_orapm)}`}
                                        style={getMetricHeatVariables('o_dpm', player.wowy_orapm, heatScales)}
                                    >
                                        {formatSignedMetric(player.wowy_orapm)}
                                    </td>
                                    <td
                                        headers="wowy-column-wowy_drapm"
                                        class={`align-right wowy-metric-cell ${metricTone(player.wowy_drapm)}`}
                                        style={getMetricHeatVariables('d_dpm', player.wowy_drapm, heatScales)}
                                    >
                                        {formatSignedMetric(player.wowy_drapm)}
                                    </td>
                                    {#if !isCurrentView}
                                        <td headers="wowy-column-minutes" class="align-right wowy-sample-cell">
                                            {formatWholeNumber(player.minutes)}
                                        </td>
                                        <td
                                            headers="wowy-column-bpm"
                                            class={`align-right wowy-metric-cell ${metricTone(player.bpm)}`}
                                        >
                                            {formatSignedMetric(player.bpm)}
                                        </td>
                                    {:else}
                                        <td headers="wowy-column-exposure" class="align-right wowy-sample-cell">{formatFixed(player.exposure, 1)}</td>
                                        <td headers="wowy-column-career_game_num" class="align-right wowy-sample-cell">
                                            {formatWholeNumber(player.career_game_num)}
                                        </td>
                                        <td headers="wowy-column-date" class="align-right wowy-date-cell">
                                            <time datetime={player?.date || undefined}>
                                                {formatObservedDate(player?.date)}
                                            </time>
                                        </td>
                                    {/if}
                                </tr>
                            {/each}
                        {/if}
                        </tbody>
                    </table>
                </div>
            </div>

            {#if isAllTimeView && (allTimeHasMore || allTimeLoading || allTimeLoadError)}
                <div class="wowy-load-more">
                    <button
                        type="button"
                        onclick={() => loadAllTimePage()}
                        disabled={allTimeLoading || !allTimeHasMore}
                    >
                        {allTimeLoading ? 'Loading…' : `Load ${ALL_TIME_BATCH_SIZE} more`}
                    </button>
                    <span>{allTimePlayers.length.toLocaleString('en-US')} of {allTimeTotal.toLocaleString('en-US')} loaded</span>
                    {#if allTimeLoadError}
                        <span class="wowy-load-error" role="status">{allTimeLoadError}</span>
                    {/if}
                </div>
            {:else if !isAllTimeView && sortedPlayers.length > PAGE_SIZE}
                <nav class="wowy-pagination" aria-label="WOWY leaderboard pagination">
                    <button
                        type="button"
                        onclick={() => (leaderboardPage = Math.max(1, activeLeaderboardPage - 1))}
                        disabled={activeLeaderboardPage <= 1}
                    >
                        Previous
                    </button>
                    <span>Page {activeLeaderboardPage} of {leaderboardPageCount}</span>
                    <button
                        type="button"
                        onclick={() => (leaderboardPage = Math.min(leaderboardPageCount, activeLeaderboardPage + 1))}
                        disabled={activeLeaderboardPage >= leaderboardPageCount}
                    >
                        Next
                    </button>
                </nav>
            {/if}

            <p class="wowy-table-note">
                {#if isAllTimeView}
                    All modeled player-seasons are available in 100-row batches. Ratings include regular-season and playoff evidence and use actual season possessions; no possession cutoff is applied unless you set one. Appearance-only player-seasons without the model’s required season baseline are not rated.
                {:else if isCurrentView}
                    Exposure is shown without a cutoff. Sample games include the available WOWY regular-season and postseason appearances.
                {:else}
                    Ratings are the season model’s O/D/T values. Minutes and BPM include regular-season and playoff contributions. Multiple teams indicate that the player appeared for each listed historical team.
                {/if}
            </p>
        </section>
    </div>
</div>

<style>
    .wowy-page {
        min-height: calc(100dvh - var(--nav-sticky-offset));
        padding: 0 0 36px;
        background: var(--bg);
    }

    .wowy-container {
        max-width: 1560px;
        display: grid;
        gap: 14px;
    }

    /* The standard page header, with the "Reading the table" panel beside it. */
    .wowy-intro {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 410px);
        align-items: start;
        gap: 24px;
        padding: 40px 0 10px;
    }

    .wowy-intro > :global(.page-header) {
        padding: 0;
    }

    .wowy-eyebrow,
    .wowy-method-label {
        color: var(--text-muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        line-height: 1.2;
        text-transform: uppercase;
    }

    .wowy-status {
        margin-top: 14px;
        color: var(--text-secondary);
        font-size: 13px;
    }

    .wowy-status strong {
        margin-right: 4px;
        color: var(--text);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .wowy-method {
        align-self: stretch;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--bg-elevated) 72%, var(--bg-surface));
        padding: 16px 18px;
    }

    .wowy-method > p:not(.wowy-method-label) {
        margin-top: 8px;
        color: var(--text-secondary);
        font-size: 13px;
        line-height: 1.5;
    }

    .wowy-method a {
        width: fit-content;
        margin-top: 18px;
        color: var(--accent);
        font-size: 12px;
        font-weight: 800;
    }

    .wowy-method a:hover {
        color: var(--accent-hover);
    }

    .wowy-method-links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 18px;
        margin-top: 16px;
    }

    .wowy-method-links a {
        margin-top: 0;
    }

    .wowy-team-mark {
        width: 26px;
        height: 26px;
        display: inline-grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 50%;
        background: var(--bg-elevated);
    }

    .wowy-team-mark img {
        width: 23px;
        height: 23px;
        object-fit: contain;
    }

    .wowy-table-panel {
        min-width: 0;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        background: var(--bg-surface);
        box-shadow: 0 10px 30px color-mix(in srgb, var(--text) 6%, transparent);
        padding: 18px;
    }

    .wowy-table-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 14px;
    }

    .wowy-table-heading h2 {
        margin-top: 5px;
        color: var(--text);
        font-size: 20px;
        font-weight: 850;
        letter-spacing: -0.025em;
        line-height: 1;
    }

    .wowy-table-heading > div > p:last-child {
        margin-top: 7px;
        color: var(--text-secondary);
        font-size: 12px;
    }

    .wowy-export-button,
    .wowy-pagination button,
    .wowy-load-more button {
        min-height: 36px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg);
        color: var(--text);
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 12px;
        font-weight: 800;
        padding: 0 12px;
    }

    .wowy-export-button:hover:not(:disabled),
    .wowy-pagination button:hover:not(:disabled),
    .wowy-load-more button:hover:not(:disabled) {
        border-color: var(--accent);
        color: var(--accent);
    }

    .wowy-export-button:disabled,
    .wowy-pagination button:disabled,
    .wowy-load-more button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
    }

    .wowy-controls {
        display: grid;
        grid-template-columns:
            minmax(145px, 170px)
            minmax(176px, 205px)
            repeat(2, minmax(145px, 170px))
            minmax(240px, 1fr);
        gap: 10px;
        margin-bottom: 14px;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--bg-elevated) 64%, var(--bg-surface));
        padding: 12px;
    }

    .wowy-controls--current {
        grid-template-columns: repeat(3, minmax(145px, 170px)) minmax(240px, 1fr);
    }

    .wowy-control-field {
        min-width: 0;
    }

    .wowy-control-field select,
    .wowy-control-field input,
    .wowy-filter-field select,
    .wowy-filter-field input {
        width: 100%;
        height: 38px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 13px;
        outline: none;
        padding: 0 12px;
    }

    .wowy-control-field input:focus,
    .wowy-control-field select:focus,
    .wowy-filter-field select:focus,
    .wowy-filter-field input:focus,
    .wowy-advanced-filters summary:focus-visible,
    .wowy-filter-clear:focus-visible,
    .wowy-export-button:focus-visible,
    .wowy-pagination button:focus-visible,
    .wowy-load-more button:focus-visible,
    .wowy-column-heading > button:focus-visible {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }

    .wowy-advanced-filters {
        margin-bottom: 14px;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg);
    }

    .wowy-advanced-filters summary {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 38px;
        border-radius: var(--radius-sm);
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 12px;
        font-weight: 800;
        list-style: none;
        padding: 0 12px;
    }

    .wowy-advanced-filters summary::-webkit-details-marker {
        display: none;
    }

    .wowy-advanced-filters summary::after {
        margin-left: auto;
        color: var(--text-muted);
        content: '+';
        font-family: var(--font-mono);
        font-size: 16px;
        font-weight: var(--figure-weight-strong);
    }

    .wowy-advanced-filters[open] summary {
        border-bottom: 1px solid var(--border-subtle);
        color: var(--text);
    }

    .wowy-advanced-filters[open] summary::after {
        content: '−';
    }

    .wowy-advanced-filters__content {
        padding: 10px 12px 12px;
    }

    .wowy-advanced-filter-group p {
        max-width: 660px;
        color: var(--text-muted);
        font-size: 11px;
        line-height: 1.4;
    }

    .wowy-filter-indicator {
        border: 1px solid color-mix(in srgb, var(--accent) 36%, var(--border));
        border-radius: 999px;
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: var(--figure-weight-strong);
        letter-spacing: 0.04em;
        padding: 2px 6px;
        text-transform: uppercase;
    }

    .wowy-advanced-filter-group {
        display: grid;
        grid-template-columns: minmax(220px, 0.75fr) minmax(360px, 1.25fr);
        align-items: end;
        gap: 16px;
    }

    .wowy-advanced-filter-group + .wowy-advanced-filter-group {
        margin-top: 12px;
        border-top: 1px solid var(--border-subtle);
        padding-top: 12px;
    }

    .wowy-advanced-filter-group h3 {
        margin-bottom: 3px;
        color: var(--text);
        font-size: 11px;
        font-weight: 850;
    }

    .wowy-filter-fields {
        display: flex;
        align-items: end;
        flex-wrap: wrap;
        gap: 10px;
    }

    .wowy-filter-field {
        display: grid;
        flex: 1 1 155px;
        gap: 5px;
        max-width: 185px;
    }

    .wowy-filter-field > span {
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 800;
    }

    .wowy-filter-clear {
        min-height: 38px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text-secondary);
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 12px;
        font-weight: 800;
        padding: 0 12px;
    }

    .wowy-filter-clear:hover:not(:disabled) {
        border-color: var(--accent);
        color: var(--accent);
    }

    .wowy-filter-clear:disabled {
        cursor: not-allowed;
        opacity: 0.45;
    }

    .wowy-filter-error {
        grid-column: 1 / -1;
        margin-top: 8px;
        color: var(--negative) !important;
    }

    .wowy-table-shell {
        --wide-sticky-header-height: 42px;
        width: 100%;
        overflow: visible;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
    }

    .sticky-header-shell {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 30;
        margin-bottom: calc(-1 * var(--wide-sticky-header-height));
        overflow: hidden;
        border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    }

    .table-header-scroll {
        overflow: hidden;
    }

    .table-body-scroll {
        overflow-x: auto;
    }

    .wowy-table {
        width: 100%;
        min-width: 900px;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: auto;
        font-size: 13px;
    }

    .wowy-table th {
        height: 42px;
        border-bottom: 1px solid var(--border);
        background: var(--bg);
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 850;
        letter-spacing: 0.06em;
        text-align: left;
        text-transform: uppercase;
        white-space: nowrap;
    }

    .wowy-table th:first-child {
        border-top-left-radius: var(--radius-sm);
    }

    .wowy-table th:last-child {
        border-top-right-radius: var(--radius-sm);
    }

    .wowy-column-heading {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-height: 42px;
        padding: 0 10px;
    }

    .align-right {
        text-align: right;
    }

    .align-right .wowy-column-heading {
        justify-content: flex-end;
        width: 100%;
    }

    .wowy-column-heading > button {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 0;
        border-radius: 3px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
        letter-spacing: inherit;
        line-height: inherit;
        padding: 2px;
        text-transform: inherit;
    }

    .wowy-column-heading > button:hover {
        color: var(--accent);
    }

    .active-sort {
        color: var(--accent) !important;
    }

    .wowy-sort-glyph {
        color: currentColor;
        font-size: 12px;
        line-height: 1;
    }

    .wowy-tooltip-mark {
        width: 13px;
        height: 13px;
        display: inline-grid;
        place-items: center;
        border: 1px solid currentColor;
        border-radius: 50%;
        color: var(--text-muted);
        font-family: var(--font-sans);
        font-size: 11px;
        font-weight: 850;
        letter-spacing: 0;
        line-height: 1;
        text-transform: lowercase;
    }

    .wowy-table td {
        border-bottom: 1px solid var(--border-subtle);
        background: var(--bg-surface);
        color: var(--text);
        font-size: 13px;
        padding: 11px 10px;
        white-space: nowrap;
    }

    .wowy-table tbody tr:last-child td {
        border-bottom: 0;
    }

    .wowy-table tbody tr:hover td {
        background: var(--bg-elevated);
    }

    .wowy-table tbody tr:nth-child(even) td {
        background: color-mix(in srgb, var(--bg-elevated) 48%, var(--bg-surface));
    }

    .wowy-rank-cell,
    .wowy-metric-cell,
    .wowy-sample-cell,
    .wowy-season-cell,
    .wowy-date-cell {
        font-family: var(--font-mono);
        font-weight: 500;
    }

    .wowy-rank-cell,
    .wowy-season-cell,
    .wowy-date-cell,
    .wowy-sample-cell {
        color: var(--text-secondary);
    }

    .wowy-player-link {
        display: inline-flex;
        align-items: baseline;
        gap: 8px;
        max-width: 230px;
        color: var(--text);
        font-size: 14px;
        font-weight: 850;
        overflow: hidden;
    }

    .wowy-player-link > span {
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .wowy-player-link:hover,
    .wowy-team-link:hover {
        color: var(--accent);
    }

    .wowy-player-link small {
        flex: 0 0 auto;
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: var(--figure-weight-strong);
    }

    .wowy-team-link {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: var(--figure-weight-strong);
    }

    .wowy-team-link .wowy-team-mark {
        width: 23px;
        height: 23px;
    }

    .wowy-team-link .wowy-team-mark img {
        width: 21px;
        height: 21px;
    }

    .wowy-historical-team {
        display: inline-flex;
        flex-direction: column;
        gap: 2px;
        max-width: 180px;
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: var(--figure-weight-strong);
        line-height: 1.15;
    }

    .wowy-historical-team small {
        overflow: hidden;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        font-size: 11px;
        font-weight: 650;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .wowy-team-codes {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0 5px;
    }

    .wowy-team-separator {
        color: var(--text-muted);
    }

    /* Seasons and team codes filter the leaderboard; they read as data until hovered. */
    .wowy-filter-link {
        color: inherit;
        text-decoration: none;
        text-decoration-color: color-mix(in srgb, currentColor 40%, transparent);
        text-underline-offset: 3px;
    }

    .wowy-filter-link:hover {
        color: var(--accent);
        text-decoration: underline;
    }

    .wowy-filter-link:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
        border-radius: 2px;
    }

    /* metricTone's classes drive the Shiny heat cells; here numbers stay in neutral ink and only
       the WOWY RAPM column carries a tint. */
    .wowy-rapm-cell {
        font-weight: var(--figure-weight-strong);
    }

    .metric-muted {
        color: var(--text-muted) !important;
    }

    .wowy-empty-row {
        color: var(--text-muted) !important;
        padding: 30px !important;
        text-align: center;
    }

    .wowy-pagination {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 13px;
        color: var(--text-secondary);
        font-size: 12px;
    }

    .wowy-pagination button {
        min-height: 32px;
    }

    .wowy-load-more {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 13px;
        color: var(--text-secondary);
        font-size: 12px;
    }

    .wowy-load-more button {
        min-width: 130px;
    }

    .wowy-load-error {
        flex-basis: 100%;
        color: var(--negative);
        text-align: center;
    }

    .wowy-table-note {
        margin-top: 12px;
        color: var(--text-muted);
        font-size: 11px;
        line-height: 1.45;
    }

    /* Narrow windows scroll the table sideways under its pinned header rather than dropping
       columns; the cut-off edge fades. */
    @media (hover: hover) and (pointer: fine) and (max-width: 980px) {
        .wowy-table {
            min-width: 900px;
        }
    }

    /* Touch/mobile scroll mode */
    @media (hover: none) and (pointer: coarse) and (max-width: 1024px),
        (any-hover: none) and (any-pointer: coarse) and (max-width: 1024px) {
        .table-body-scroll {
            -webkit-overflow-scrolling: touch;
        }

        .wowy-table {
            width: max-content;
            min-width: 900px;
        }
    }
    /* End touch/mobile scroll mode */

    /* Narrow fine-pointer windows need the same scroll-safe table behavior. */
    @media (max-width: 840px) {
        .table-body-scroll {
            -webkit-overflow-scrolling: touch;
        }

        .wowy-controls {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .wowy-controls--current {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .wowy-control-field--search {
            grid-column: 1 / -1;
        }

        .wowy-table {
            width: max-content;
            min-width: 720px;
        }
    }

    .wowy-method-toggle {
        display: none;
    }

    @media (max-width: 900px) {
        .wowy-intro {
            grid-template-columns: 1fr;
            gap: 16px;
            padding-top: 24px;
        }

        .wowy-method-toggle {
            display: inline-flex;
            justify-self: start;
        }

        .wowy-method:not(.open) {
            display: none;
        }
    }

    @media (max-width: 680px) {
        .wowy-page {
            padding: 0 0 26px;
        }

        .wowy-table-panel {
            padding: 18px;
        }

        .wowy-table-heading {
            flex-direction: column;
        }

        .wowy-export-button {
            width: 100%;
        }

        .wowy-controls {
            grid-template-columns: 1fr;
        }

        .wowy-controls--current {
            grid-template-columns: 1fr;
        }

        .wowy-advanced-filter-group,
        .wowy-filter-fields {
            display: grid;
            grid-template-columns: 1fr;
        }

        .wowy-filter-field {
            max-width: none;
        }

        .wowy-filter-clear {
            width: 100%;
        }

        .wowy-pagination {
            justify-content: space-between;
        }
    }
</style>
