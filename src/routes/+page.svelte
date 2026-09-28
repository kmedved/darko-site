<script>
    import { goto } from '$app/navigation';
    import {
        exportCsvRows,
        leaderboardCsvColumns,
        formatFixed,
        formatPercent,
        formatSignedMetric
    } from '$lib/utils/csvPresets.js';
    import {
        buildPlayerTableSortConfig,
        formatLeaderboardCell,
        getLeaderboardCellValue,
        leaderboardTableColumns
    } from '$lib/utils/leaderboardColumns.js';
    import {
        AGE_GROUPS,
        filterLeaderboardRows,
        matchesPosition,
        POSITION_GROUPS,
        trendSeason
    } from '$lib/utils/leaderboardViews.js';
    import { startWatchlist, watchlist } from '$lib/utils/watchlist.js';
    import { filterPlayers } from '$lib/utils/playerTableFilters.js';
    import { getNextSortState, getSortAriaValue, getSortGlyph, getSortedRows } from '$lib/utils/sortableTable.js';
    import { buildLeaderboardCsvRows } from '$lib/utils/leaderboardCsv.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';
    import { formatSeasonEndYearLabel } from '$lib/utils/seasonUtils.js';
    import { AS_OF_PARAM, formatAsOfDate } from '$lib/utils/timeMachine.js';
    import { unpackRows } from '$lib/utils/columnar.js';
    import { divergingTint, tintLimit } from '$lib/utils/divergingTint.js';
    import { timeMachine } from '$lib/timeMachineState.svelte.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
    import { setupWideStickyTable } from '$lib/utils/wideStickyTable.js';
    import {
        buildPresetHeatScales,
        getMetricHeatVariables
    } from '$lib/utils/metricHeatScales.js';
    import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
    import DotDistribution from '$lib/components/DotDistribution.svelte';
    import MetricTooltip from '$lib/components/MetricTooltip.svelte';
    import OffenseDefenseBar from '$lib/components/OffenseDefenseBar.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Sparkline from '$lib/components/Sparkline.svelte';
    import StatTile from '$lib/components/StatTile.svelte';
    import WatchStar from '$lib/components/WatchStar.svelte';
    import { getContext, onMount } from 'svelte';

    let { data } = $props();

    let sortColumn = $state('dpm');
    let sortDirection = $state('desc');
    let searchQuery = $state('');
    let columnFilters = $state({});
    let teamFilter = $state('all');
    let positionFilter = $state('all');
    let ageFilter = $state('all');
    let watchOnly = $state(false);
    // The season sparklines are optional, and this browser remembers the choice.
    let showTrends = $state(false);
    // Sparkline values by board ("season:date"), then by player: { [key]: { [nba_id]: [dpm...] } }.
    let trendsByBoard = $state({});
    let leaderboardPage = $state(1);
    let positionView = $state('all');
    let distributionMetric = $state('dpm');
    let standardTableRoot = $state(null);
    let standardBodyScroller = $state(null);
    let standardBodyTable = $state(null);
    let standardSourceHead = $state(null);
    let standardHeaderScroller = $state(null);
    let standardHeaderTable = $state(null);
    const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
    const isShinyView = $derived(displayMode.view === 'shiny');

    const TOP_POSITION_MIN_GAMES = 20;
    const LEADERBOARD_PAGE_SIZE = 50;
    const TRENDS_STORAGE_KEY = 'darko-leaderboard-trends';
    const players = $derived(Array.isArray(data.players) ? data.players : unpackRows(data.players));
    // The split bar after Def, the optional sparkline, and with the Time Machine set Now and Since.
    const playerColumns = $derived(leaderboardTableColumns({ trends: showTrends, asOf: Boolean(data.asOf) }));
    const dataColumns = $derived(playerColumns.filter((column) => column.sortable !== false));
    const sortConfigs = $derived(buildPlayerTableSortConfig(dataColumns));
    // Sorting by a column that has gone (Since, after leaving the Time Machine) falls back to DPM.
    const activeSortColumn = $derived(sortConfigs[sortColumn] ? sortColumn : 'dpm');
    const watchSet = $derived(new Set($watchlist));
    const textSortColumns = new Set(['_rank', 'player_name', 'team_name', 'position']);
    const positionTabs = [
        { key: 'all', label: 'All' },
        { key: 'guards', label: 'Guards' },
        { key: 'forwards', label: 'Forwards' },
        { key: 'centers', label: 'Centers' }
    ];
    const distributionMetrics = [
        { key: 'dpm', label: 'DPM', kind: 'signed' },
        { key: 'o_dpm', label: 'Offensive DPM', kind: 'signed' },
        { key: 'd_dpm', label: 'Defensive DPM', kind: 'signed' },
        { key: 'box_dpm', label: 'Box DPM', kind: 'signed' },
        { key: 'on_off_dpm', label: 'On/Off DPM', kind: 'signed' },
        { key: 'x_minutes', label: 'MPG', kind: 'fixed', decimals: 1 },
        { key: 'x_pace', label: 'Pace', kind: 'fixed', decimals: 1 },
        { key: 'x_pts_100', label: 'Pts/100', kind: 'fixed', decimals: 1 },
        { key: 'x_ast_100', label: 'Ast/100', kind: 'fixed', decimals: 1 },
        { key: 'x_fg_pct', label: 'FG%', kind: 'percent' },
        { key: 'x_fg3_pct', label: '3P%', kind: 'percent' },
        { key: 'x_ft_pct', label: 'FT%', kind: 'percent' }
    ];

    const seasonOptions = $derived(data.seasons || []);
    const asOf = $derived(data.asOf ?? null);
    const activeSeason = $derived(
        asOf
            ? 'asof'
            : data.selectedSeason === null || data.selectedSeason === undefined
              ? 'current'
              : String(data.selectedSeason)
    );
    const activeSeasonLabel = $derived(
        asOf
            ? `As of ${formatAsOfDate(asOf.date, { short: true })}`
            : activeSeason === 'current'
              ? 'Current'
              : formatSeasonLabel(activeSeason)
    );

    const teamOptions = $derived.by(() => {
        const teams = [];
        for (const player of players) {
            if (player?.team_name && !teams.includes(player.team_name)) {
                teams.push(player.team_name);
            }
        }
        return teams.sort((a, b) => teamAbbr(a).localeCompare(teamAbbr(b)));
    });

    const activeTeamFilter = $derived(
        teamFilter === 'all' || teamOptions.includes(teamFilter) ? teamFilter : 'all'
    );

    const teamScopedPlayers = $derived.by(() => {
        if (activeTeamFilter === 'all') return players;
        return players.filter((player) => player?.team_name === activeTeamFilter);
    });

    const filteredPlayers = $derived.by(() => {
        const grouped = filterLeaderboardRows(teamScopedPlayers, {
            position: positionFilter,
            age: ageFilter,
            watchlist: watchOnly ? watchSet : null
        });
        const columnMatched = filterPlayers(grouped, dataColumns, columnFilters);
        if (!searchQuery.trim()) return columnMatched;
        return filterPlayers(columnMatched, dataColumns, { player_name: searchQuery });
    });

    const sortedPlayers = $derived.by(() =>
        getSortedRows(filteredPlayers, {
            sortColumn: activeSortColumn,
            sortDirection,
            sortConfigs
        })
    );
    const leaderboardPageCount = $derived(
        Math.max(1, Math.ceil(sortedPlayers.length / LEADERBOARD_PAGE_SIZE))
    );
    const activeLeaderboardPage = $derived(
        Math.min(leaderboardPage, leaderboardPageCount)
    );
    const visibleLeaderboardPlayers = $derived.by(() => {
        const start = (activeLeaderboardPage - 1) * LEADERBOARD_PAGE_SIZE;
        return sortedPlayers.slice(start, start + LEADERBOARD_PAGE_SIZE);
    });
    const leaderboardHeatScales = $derived.by(() =>
        buildPresetHeatScales(players, 'talent')
    );
    const dpmTintLimit = $derived(tintLimit(players.map((player) => player?.dpm)));
    const leaderboardRangeStart = $derived(
        sortedPlayers.length === 0 ? 0 : (activeLeaderboardPage - 1) * LEADERBOARD_PAGE_SIZE + 1
    );
    const leaderboardRangeEnd = $derived(
        Math.min(activeLeaderboardPage * LEADERBOARD_PAGE_SIZE, sortedPlayers.length)
    );

    const leaderCards = $derived.by(() => [
        buildLeaderCard(teamScopedPlayers, 'Best DPM', 'dpm'),
        buildLeaderCard(teamScopedPlayers, 'Best Offensive DPM', 'o_dpm'),
        buildLeaderCard(teamScopedPlayers, 'Best Defensive DPM', 'd_dpm'),
        buildLeaderCard(teamScopedPlayers, 'Best 3PT Shooter', 'x_fg3_pct', formatPercent),
        buildLeaderCard(teamScopedPlayers, 'Best FT Shooter', 'x_ft_pct', formatPercent)
    ]);

    const selectedDistributionMetric = $derived(
        distributionMetrics.find((metric) => metric.key === distributionMetric) ?? distributionMetrics[0]
    );
    const distribution = $derived(buildDistribution(filteredPlayers, selectedDistributionMetric));
    // Every player is a dot; the ones the table's filters keep are drawn in ink.
    const distributionPoints = $derived(
        players.map((player) => ({
            id: Number(player?.nba_id),
            name: player?.player_name ?? '',
            team: player?.team_name ? teamAbbr(player.team_name) : '',
            value: toNumber(player?.[selectedDistributionMetric.key])
        }))
    );
    const distributionHighlight = $derived(
        filteredPlayers.length === players.length
            ? null
            : new Set(filteredPlayers.map((player) => Number(player?.nba_id)))
    );

    const topPositionPlayers = $derived.by(() =>
        teamScopedPlayers
            .filter((player) => matchesPosition(player, positionView))
            .filter((player) => hasMinimumGames(player, TOP_POSITION_MIN_GAMES))
            .filter((player) => Number.isFinite(toNumber(player?.dpm)))
            .slice()
            .sort((a, b) => toNumber(b.dpm) - toNumber(a.dpm))
            .slice(0, 5)
    );

    // With the Time Machine set, the export carries Now and Since after DDPM, like the table.
    const leaderboardCsvColumnsForExport = $derived(
        leaderboardCsvColumns
            .filter((col) => col.accessor !== 'bayes_rapm_total' && col.accessor !== 'tr_minutes')
            .flatMap((col) => {
                if (col.accessor === 'x_minutes') return [{ ...col, format: fmtMpg }];
                if (col.accessor !== 'd_dpm' || !data.asOf) return [col];
                return [
                    col,
                    { header: 'DPM now', accessor: 'now_dpm', format: formatSignedMetric },
                    { header: 'Since', accessor: 'since_dpm', format: formatSignedMetric }
                ];
            })
    );

    // The board the sparklines follow: its season, stopping at the Time Machine's date.
    const trendBoard = $derived.by(() => {
        const season = trendSeason({ asOf: data.asOf, selectedSeason: data.selectedSeason, players });
        const through = data.asOf?.date ?? null;
        return season ? { season, through, key: `${season}:${through ?? ''}` } : null;
    });
    const boardTrends = $derived(trendBoard ? (trendsByBoard[trendBoard.key] ?? {}) : {});

    onMount(() => {
        startWatchlist();
        try {
            showTrends = localStorage.getItem(TRENDS_STORAGE_KEY) === '1';
        } catch {
            // Storage can be unavailable; the sparklines just start hidden.
        }
    });

    function setShowTrends(value) {
        showTrends = value;
        try {
            localStorage.setItem(TRENDS_STORAGE_KEY, value ? '1' : '0');
        } catch {
            // The choice still holds until the page closes.
        }
    }

    // Sparklines load a page at a time, for the players on it that the board hasn't loaded yet.
    $effect(() => {
        if (!showTrends || !trendBoard) return;
        const board = trendBoard;
        const loaded = trendsByBoard[board.key] ?? {};
        const missing = visibleLeaderboardPlayers
            .map((player) => Number(player?.nba_id))
            .filter((id) => Number.isInteger(id) && id > 0 && !(id in loaded))
            .sort((a, b) => a - b);
        if (!missing.length) return;

        let cancelled = false;
        const params = new URLSearchParams({ ids: missing.join(','), season: String(board.season) });
        if (board.through) params.set('through', board.through);
        fetch(`/api/history/trends?${params}`)
            .then((response) => (response.ok ? response.json() : { trends: {} }))
            .catch(() => ({ trends: {} }))
            .then(({ trends = {} }) => {
                if (cancelled) return;
                // A player without a line that season counts as loaded, so it isn't requested again.
                const next = { ...(trendsByBoard[board.key] ?? {}) };
                for (const id of missing) next[id] = trends[id] ?? [];
                trendsByBoard = { ...trendsByBoard, [board.key]: next };
            });
        return () => {
            cancelled = true;
        };
    });

    $effect(() => {
        activeSortColumn;
        sortDirection;
        searchQuery;
        activeTeamFilter;
        activeSeason;
        playerColumns.length;
        sortedPlayers.length;
        standardTableRoot;
        standardBodyScroller;
        standardBodyTable;
        standardSourceHead;
        standardHeaderScroller;
        standardHeaderTable;
        return setupWideStickyTable({
            root: standardTableRoot,
            bodyScroller: standardBodyScroller,
            bodyTable: standardBodyTable,
            sourceHead: standardSourceHead,
            headerScroller: standardHeaderScroller,
            headerTable: standardHeaderTable,
            wheelTarget: standardHeaderScroller
        });
    });

    function toNumber(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function formatSeasonLabel(season) {
        const label = formatSeasonEndYearLabel(season);
        return label ? `${label} Season` : `${season} Season`;
    }

    function datedHref(path) {
        return asOf ? `${path}?${AS_OF_PARAM}=${asOf.date}` : path;
    }

    function selectSeason(event) {
        const season = event.currentTarget.value;
        if (season === 'asof') return;
        // A season pick leaves the Time Machine, which would otherwise override it.
        timeMachine.date = null;
        const suffix = season === 'current' ? '' : `?season=${encodeURIComponent(season)}`;
        goto(`/${suffix}`, { keepFocus: true });
    }

    function toggleSort(column) {
        ({ sortColumn, sortDirection } = getNextSortState({
            sortColumn: activeSortColumn,
            sortDirection,
            column,
            defaultDirection: textSortColumns.has(column) ? 'asc' : 'desc'
        }));
        leaderboardPage = 1;
    }

    function updateColumnFilter(column, value) {
        columnFilters[column] = value;
        leaderboardPage = 1;
    }

    $effect(() => {
        if (!isShinyView && Object.keys(columnFilters).length > 0) {
            columnFilters = {};
            leaderboardPage = 1;
        }
    });

    // Numbers stay in neutral ink; DPM, the column the table ranks by, carries a diverging tint.
    function statClass(column, value) {
        const n = toNumber(value);
        if (n === null) return 'metric-muted';
        return column === 'dpm' ? 'tint-cell' : '';
    }

    function cellStyle(column, value) {
        const shinyHeat = getMetricHeatVariables(column.key, value, leaderboardHeatScales);
        return column.key === 'dpm' ? `${shinyHeat} ${divergingTint(value, dpmTintLimit)}` : shinyHeat;
    }

    function keyClass(key) {
        return String(key).replaceAll('_', '-');
    }

    function cellClass(column, value) {
        const classes = ['leaderboard-cell', `leaderboard-cell--${keyClass(column.key)}`];
        if (column.key === '_rank') classes.push('leaderboard-cell--rank');
        if (column.key === 'player_name') classes.push('leaderboard-cell--player');
        if (column.key === 'team_name') classes.push('leaderboard-cell--team');
        if (column.alignClass === 'num') classes.push('leaderboard-cell--num', statClass(column.key, value));
        return classes.filter(Boolean).join(' ');
    }

    /** "DPM this season, +5.2 to +7.4" for a sparkline's screen-reader label. */
    function trendLabel(values) {
        if (!values?.length) return '';
        const span = asOf ? 'this season to date' : 'this season';
        return `DPM ${span}, ${formatSignedMetric(values[0], 1)} to ${formatSignedMetric(values.at(-1), 1)}`;
    }

    function fmtMpg(min) {
        if (min === null || min === undefined) return '—';
        const n = Number.parseFloat(min);
        if (!Number.isFinite(n)) return '—';
        return formatFixed(Math.max(0, n), 1);
    }

    function exportPlayersCsv() {
        const rows = buildLeaderboardCsvRows(sortedPlayers);
        exportCsvRows({
            rows,
            columns: leaderboardCsvColumnsForExport,
            filename: 'darko-dpm-leaderboard.csv'
        });
    }

    function metricLeader(rows, metric) {
        return rows.reduce((best, player) => {
            const value = toNumber(player?.[metric]);
            if (value === null) return best;
            if (!best || value > best.value) {
                return { player, value };
            }
            return best;
        }, null);
    }

    function buildLeaderCard(rows, title, metric, formatter = formatSignedMetric) {
        const leader = metricLeader(rows, metric);
        const value = leader?.value ?? null;
        return {
            title,
            metric,
            player: leader?.player ?? null,
            value,
            displayValue: formatter(value)
        };
    }

    function playerHeadshotUrl(player) {
        return player?.nba_id ? `/api/img/headshot/${player.nba_id}` : null;
    }

    function teamLogoUrl(player) {
        const teamId = Number.parseInt(player?.tm_id, 10);
        return Number.isInteger(teamId) && teamId > 0 ? `/api/img/logo/${teamId}` : null;
    }

    function hideBrokenImage(event) {
        event.currentTarget.hidden = true;
    }

    function formatDistributionValue(value, metric, compact = false) {
        if (value === null || value === undefined) return '—';
        const n = Number.parseFloat(value);
        if (!Number.isFinite(n)) return '—';
        if (metric.kind === 'percent') return `${(n * 100).toFixed(compact ? 0 : 1)}%`;
        if (metric.kind === 'signed') return formatSignedMetric(n, compact ? 1 : 2);
        return formatFixed(n, compact ? 0 : (metric.decimals ?? 1));
    }

    /** Axis labels: "+2", "0", "-2"; "35%"; "12.5". */
    function formatDistributionTick(value, metric) {
        if (metric.kind === 'percent') return `${+(value * 100).toFixed(1)}%`;
        const n = +value.toFixed(2);
        return metric.kind === 'signed' && n > 0 ? `+${n}` : String(n);
    }

    /** The figures under the dot plot, for the players the table's filters keep. */
    function buildDistribution(rows, metric) {
        const values = rows
            .map((player) => toNumber(player?.[metric.key]))
            .filter((value) => value !== null)
            .sort((a, b) => a - b);

        if (values.length === 0) {
            return { meanValue: null, mean: '—', median: '—', topTen: '—', players: 0 };
        }

        const meanValue = values.reduce((sum, value) => sum + value, 0) / values.length;
        const medianValue = values[Math.floor(values.length / 2)];
        const topCount = Math.max(1, Math.ceil(values.length * 0.1));
        const topValues = values.slice(-topCount);
        const topTenValue = topValues.reduce((sum, value) => sum + value, 0) / topValues.length;

        return {
            meanValue,
            mean: formatDistributionValue(meanValue, metric),
            median: formatDistributionValue(medianValue, metric),
            topTen: formatDistributionValue(topTenValue, metric),
            players: values.length
        };
    }

    function hasMinimumGames(player, minGames) {
        const games = toNumber(player?.career_game_num);
        return games !== null && games >= minGames;
    }

    function barWidth(value, rows) {
        const parsed = toNumber(value);
        if (parsed === null || rows.length === 0) return 0;
        const max = Math.max(...rows.map((player) => toNumber(player?.dpm) ?? 0), 1);
        return Math.max(8, Math.min(100, (parsed / max) * 100));
    }
</script>

<svelte:head>
    <title>DARKO DPM — NBA Player Projections</title>
</svelte:head>

<div class="leaderboard-page" data-shiny-page>
    <div class="container leaderboard-container">
        <PageHeader id="leaderboard-title" title="DPM Leaderboard">
            {#if asOf}
                <p class="page-lede page-asof">
                    DARKO as of {formatAsOfDate(asOf.date)}{asOf.season ? ` · ${formatSeasonEndYearLabel(asOf.season)} season` : ''}.
                    Each player's latest rating on that date.
                </p>
            {:else}
                <p class="page-lede">Daily Player Metrics for every NBA player, updated nightly.</p>
            {/if}
        </PageHeader>

        <section class="stat-strip" aria-label="Leaderboard leaders">
            {#each leaderCards as card (card.title)}
                <StatTile label={card.title} value={card.displayValue} photo={playerHeadshotUrl(card.player)}>
                    {#if card.player}
                        <a class="leader-player" href={datedHref(`/player/${card.player.nba_id}`)}>
                            {#if teamLogoUrl(card.player)}
                                <img src={teamLogoUrl(card.player)} alt="" loading="lazy" onerror={hideBrokenImage} />
                            {/if}
                            <span>
                                {card.player.player_name}
                                <small>{teamAbbr(card.player.team_name)}</small>
                            </span>
                        </a>
                    {:else}
                        <span class="leader-player leader-player--empty">No player</span>
                    {/if}
                </StatTile>
            {/each}
        </section>

        {#if players.length === 0}
            <div class="empty-state">No players are available for {activeSeasonLabel.toLowerCase()}.</div>
        {:else}
            <div class="leaderboard-workspace">
                <section class="leaderboard-table-panel" aria-label={`${activeSeasonLabel} player leaderboard`}>
                    <div class="leaderboard-controls" data-shiny-surface="well">
                        <div class="control-field control-field--season">
                            <select
                                id="season-filter"
                                value={activeSeason}
                                onchange={selectSeason}
                                aria-label="Season"
                            >
                                {#if asOf}
                                    <option value="asof">{activeSeasonLabel}</option>
                                {/if}
                                <option value="current">Current</option>
                                {#each seasonOptions as season (season)}
                                    <option value={String(season)}>{formatSeasonLabel(season)}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="control-field">
                            <select
                                id="team-filter"
                                value={activeTeamFilter}
                                onchange={(event) => {
                                    teamFilter = event.currentTarget.value;
                                    leaderboardPage = 1;
                                }}
                                aria-label="Team"
                            >
                                <option value="all">All Teams</option>
                                {#each teamOptions as team (team)}
                                    <option value={team}>{teamAbbr(team)}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="control-field">
                            <select
                                id="position-filter"
                                value={positionFilter}
                                onchange={(event) => {
                                    positionFilter = event.currentTarget.value;
                                    leaderboardPage = 1;
                                }}
                                aria-label="Position"
                            >
                                {#each POSITION_GROUPS as group (group.key)}
                                    <option value={group.key}>{group.label}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="control-field">
                            <select
                                id="age-filter"
                                value={ageFilter}
                                onchange={(event) => {
                                    ageFilter = event.currentTarget.value;
                                    leaderboardPage = 1;
                                }}
                                aria-label="Age"
                            >
                                {#each AGE_GROUPS as group (group.key)}
                                    <option value={group.key}>{group.label}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="control-field control-field--search">
                            <div class="search-control">
                                <input
                                    id="player-search"
                                    type="search"
                                    value={searchQuery}
                                    oninput={(event) => {
                                        searchQuery = event.currentTarget.value;
                                        leaderboardPage = 1;
                                    }}
                                    placeholder="Search players..."
                                    aria-label="Search players"
                                />
                            </div>
                        </div>

                        <div class="control-toggles">
                            <button
                                type="button"
                                class="toggle-chip"
                                class:active={watchOnly}
                                aria-pressed={watchOnly}
                                title="Only the players you follow. Star a player to follow them here and in The Daily."
                                onclick={() => {
                                    watchOnly = !watchOnly;
                                    leaderboardPage = 1;
                                }}
                            >
                                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                                    <path d="M8 1.6l1.9 4 4.4.5-3.3 3 .9 4.3L8 11.3l-3.9 2.1.9-4.3-3.3-3 4.4-.5z" />
                                </svg>
                                Watchlist
                                {#if watchSet.size > 0}<span class="toggle-count">{watchSet.size}</span>{/if}
                            </button>
                            <button
                                type="button"
                                class="toggle-chip"
                                class:active={showTrends}
                                aria-pressed={showTrends}
                                title="A small line of each player's DPM through the season"
                                onclick={() => setShowTrends(!showTrends)}
                            >
                                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                                    <path class="toggle-line" d="M1.5 11.5l3.5-4 3 2.5 5.5-6.5" />
                                </svg>
                                Season trend
                            </button>
                        </div>

                        <button
                            class="btn"
                            type="button"
                            onclick={exportPlayersCsv}
                            disabled={sortedPlayers.length === 0}
                        >
                            Download CSV
                        </button>
                    </div>

                    <p class="leaderboard-value-note">
                        <strong>$ Value</strong> is DARKO's fair-salary estimate.
                        <a href="/about/fair-salary">See how it is calculated →</a>
                    </p>

                    <div class="table-wrapper table-shell" data-shiny-table bind:this={standardTableRoot}>
                        <div class="sticky-header-shell">
                            <div class="table-header-scroll" bind:this={standardHeaderScroller}>
                                <table class="sticky-header-table" role="presentation" bind:this={standardHeaderTable}>
                                    <thead>
                                        {@render standardHeaderRows()}
                                    </thead>
                                </table>
                            </div>
                        </div>

                        <div class="table-body-scroll" bind:this={standardBodyScroller}>
                            <table bind:this={standardBodyTable}>
                                <thead class="table-sizing-head" bind:this={standardSourceHead}>
                                    {@render standardSemanticHeaderRow()}
                                    {@render standardHeaderRows()}
                                </thead>
                                <tbody>
                                    {#if sortedPlayers.length === 0}
                                        <tr>
                                            <td class="empty-row" colspan={playerColumns.length}>
                                                {watchOnly && watchSet.size === 0
                                                    ? 'You aren’t following anyone yet. Star a player to follow them.'
                                                    : 'No matching players.'}
                                            </td>
                                        </tr>
                                    {:else}
                                        {#each visibleLeaderboardPlayers as player, index (player.nba_id)}
                                            <tr>
                                                {#each playerColumns as column (column.key)}
                                                    {@const globalIndex = (activeLeaderboardPage - 1) * LEADERBOARD_PAGE_SIZE + index}
                                                    {@const value = getLeaderboardCellValue(player, column, globalIndex)}
                                                    {#if column.key === 'dpm'}
                                                        <!-- The number, and under it how it splits into offense and defense. -->
                                                        <td class={cellClass(column, value)} style={cellStyle(column, value)}>
                                                            <span class="dpm-figure">{formatLeaderboardCell(column, value)}</span>
                                                            <span class="dpm-split">
                                                                <OffenseDefenseBar offense={player.o_dpm} defense={player.d_dpm} max={6} />
                                                            </span>
                                                        </td>
                                                    {:else if column.kind === 'trend'}
                                                        {@const trend = boardTrends[player.nba_id]}
                                                        <td class="leaderboard-cell leaderboard-cell--drawn leaderboard-cell--trend">
                                                            {#if trend === undefined}
                                                                <span class="trend-pending" aria-hidden="true"></span>
                                                            {:else if trend.length > 1}
                                                                <Sparkline values={trend} width={84} height={22} label={trendLabel(trend)} />
                                                            {:else}
                                                                <span class="cell-muted">—</span>
                                                            {/if}
                                                        </td>
                                                    {:else if column.key === 'player_name'}
                                                        <td class={cellClass(column, value)}>
                                                            <span class="player-cell">
                                                                <WatchStar nbaId={Number(player.nba_id)} name={player.player_name} compact />
                                                                <a class="player-link" href={datedHref(`/player/${player.nba_id}`)}>
                                                                    {#if isShinyView && playerHeadshotUrl(player)}
                                                                        <img
                                                                            src={playerHeadshotUrl(player)}
                                                                            alt=""
                                                                            width="20"
                                                                            height="20"
                                                                            class="leaderboard-headshot"
                                                                            loading="lazy"
                                                                            onerror={hideBrokenImage}
                                                                        />
                                                                    {/if}
                                                                    <span>{player.player_name}</span>
                                                                    {#if player.position}<small>{player.position}</small>{/if}
                                                                </a>
                                                            </span>
                                                        </td>
                                                    {:else if column.key === 'team_name'}
                                                        <td class={cellClass(column, value)}>
                                                            {#if player.team_name}
                                                                <a class="team-link" href="/team/{encodeURIComponent(player.team_name)}" title={player.team_name}>
                                                                    <span class="team-mark">
                                                                        {#if teamLogoUrl(player)}
                                                                            <img src={teamLogoUrl(player)} alt="" loading="lazy" onerror={hideBrokenImage} />
                                                                        {/if}
                                                                    </span>
                                                                    <span>{teamAbbr(player.team_name)}</span>
                                                                </a>
                                                            {:else}
                                                                <span class="cell-muted">—</span>
                                                            {/if}
                                                        </td>
                                                    {:else}
                                                        <td class={cellClass(column, value)} style={cellStyle(column, value)}>
                                                            {column.key === 'x_minutes' ? fmtMpg(value) : formatLeaderboardCell(column, value)}
                                                        </td>
                                                    {/if}
                                                {/each}
                                            </tr>
                                        {/each}
                                    {/if}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {#if sortedPlayers.length > LEADERBOARD_PAGE_SIZE}
                        <nav class="leaderboard-pagination" aria-label="Leaderboard pagination">
                            <button
                                type="button"
                                aria-label="Previous leaderboard page"
                                disabled={activeLeaderboardPage <= 1}
                                onclick={() => (leaderboardPage = Math.max(1, activeLeaderboardPage - 1))}
                            >
                                ‹
                            </button>
                            <span>
                                {leaderboardRangeStart}–{leaderboardRangeEnd} of {sortedPlayers.length}
                            </span>
                            <button
                                type="button"
                                aria-label="Next leaderboard page"
                                disabled={activeLeaderboardPage >= leaderboardPageCount}
                                onclick={() => (leaderboardPage = Math.min(leaderboardPageCount, activeLeaderboardPage + 1))}
                            >
                                ›
                            </button>
                        </nav>
                    {/if}
                </section>

                <aside class="insight-rail" aria-label="Leaderboard insights">
                    <section class="insight-card insight-card--distribution" data-shiny-surface="panel">
                        <div class="insight-card-header insight-card-header--distribution">
                            <div class="distribution-title-control">
                                <h2>Distribution</h2>
                                <select
                                    class="distribution-select"
                                    value={distributionMetric}
                                    onchange={(event) => (distributionMetric = event.currentTarget.value)}
                                    aria-label="Distribution metric"
                                >
                                    {#each distributionMetrics as metric (metric.key)}
                                        <option value={metric.key}>{metric.label}</option>
                                    {/each}
                                </select>
                            </div>
                            <span class="insight-info" title={`${activeSeasonLabel}: one dot per player. Players the table's filters leave out are faint; the dashed mean and the figures below cover the rest. Hover a dot to see who it is, and click to open their page.`}>i</span>
                        </div>
                        <div class="distribution-chart">
                            <DotDistribution
                                points={distributionPoints}
                                highlight={distributionHighlight}
                                mean={distribution.meanValue}
                                formatValue={(value) => formatDistributionValue(value, selectedDistributionMetric)}
                                formatTick={(value) => formatDistributionTick(value, selectedDistributionMetric)}
                                label={`Distribution of ${activeSeasonLabel.toLowerCase()} player ${selectedDistributionMetric.label}, one dot per player`}
                            />
                        </div>
                        <div class="distribution-stats">
                            <div>
                                <span>Mean</span>
                                <strong>{distribution.mean}</strong>
                            </div>
                            <div>
                                <span>Median</span>
                                <strong>{distribution.median}</strong>
                            </div>
                            <div>
                                <span>Top 10%</span>
                                <strong>{distribution.topTen}</strong>
                            </div>
                            <div>
                                <span>Players</span>
                                <strong>{distribution.players}</strong>
                            </div>
                        </div>
                        <p class="shiny-plot-caption">@kmedved | www.darko.app | @anpatt7</p>
                    </section>

                    <section class="insight-card" data-shiny-surface="panel">
                        <div class="insight-card-header">
                            <h2>Top DPM by Position</h2>
                            <span class="insight-info" title="Minimum 20 games played">i</span>
                        </div>
                        <div class="position-tabs" role="group" aria-label="Position filter">
                            {#each positionTabs as tab (tab.key)}
                                <button type="button" class:active={positionView === tab.key} onclick={() => (positionView = tab.key)}>
                                    {tab.label}
                                </button>
                            {/each}
                        </div>
                        <div class="position-list">
                            <div class="position-table-head" aria-hidden="true">
                                <span>#</span>
                                <span>Player</span>
                                <span>Pos</span>
                                <span>DPM</span>
                            </div>
                            {#if topPositionPlayers.length === 0}
                                <div class="empty-mini">No matching players.</div>
                            {:else}
                                {#each topPositionPlayers as player, index (player.nba_id)}
                                    <a class="position-player" href={datedHref(`/player/${player.nba_id}`)}>
                                        <span class="position-rank">{index + 1}</span>
                                        <span class="mini-headshot">
                                            {#if playerHeadshotUrl(player)}
                                                <img src={playerHeadshotUrl(player)} alt="" loading="lazy" onerror={hideBrokenImage} />
                                            {/if}
                                        </span>
                                        <span class="position-player-main">
                                            <span class="position-player-label">
                                                <span class="position-player-name">{player.player_name}</span>
                                                {#if player.position}<small class="position-player-position">{player.position}</small>{/if}
                                            </span>
                                            <span class="position-bar">
                                                <span style={`width: ${barWidth(player.dpm, topPositionPlayers)}%`}></span>
                                            </span>
                                        </span>
                                        <strong style={getMetricHeatVariables('dpm', player.dpm, leaderboardHeatScales)}>{formatSignedMetric(player.dpm)}</strong>
                                    </a>
                                {/each}
                            {/if}
                        </div>
                        <p class="insight-note">Minimum 20 games played</p>
                    </section>
                </aside>
            </div>
        {/if}
    </div>
</div>

{#snippet standardSemanticHeaderRow()}
    <tr class="table-semantic-row sr-only">
        {#each playerColumns as column (column.key)}
            {#if column.sortable === false}
                <th scope="col">{column.label}</th>
            {:else}
                <th scope="col" aria-sort={getSortAriaValue(activeSortColumn, sortDirection, column.key)}>{column.label}</th>
            {/if}
        {/each}
    </tr>
{/snippet}

{#snippet standardHeaderRows()}
    <tr class="header-row table-sizing-row">
        {#each playerColumns as column (column.key)}
            {#if column.sortable === false}
                <th class={column.alignClass}>{column.label}</th>
            {:else}
                <th
                    class="{column.alignClass} sortable {activeSortColumn === column.key ? 'active' : ''} {column.metricKey ? 'has-tooltip' : ''}"
                    onclick={() => toggleSort(column.key)}
                    aria-sort={getSortAriaValue(activeSortColumn, sortDirection, column.key)}
                >
                    <span class="header-label-wrap">
                        {#if column.metricKey}
                            <MetricTooltip text={getMetricDefinition(column.metricKey)}>
                                <span>{column.label}</span>
                            </MetricTooltip>
                        {:else}
                            <span>{column.label}</span>
                        {/if}
                        <!-- The keyboard's way to sort; clicking anywhere else in the header works too. -->
                        <button
                            type="button"
                            class="sort-button"
                            aria-label={`Sort by ${column.label}`}
                            onclick={(event) => {
                                event.stopPropagation();
                                toggleSort(column.key);
                            }}
                        >
                            <span class="sort-indicator" aria-hidden="true">{getSortGlyph(activeSortColumn, sortDirection, column.key)}</span>
                        </button>
                    </span>
                </th>
            {/if}
        {/each}
    </tr>
    {#if isShinyView}
        <tr class="column-filter-row table-sizing-row">
            {#each playerColumns as column (column.key)}
                <th class={column.alignClass}>
                    {#if column.key !== '_rank' && column.sortable !== false}
                        <input
                            type="text"
                            value={columnFilters[column.key] || ''}
                            oninput={(event) => updateColumnFilter(column.key, event.currentTarget.value)}
                            placeholder="All"
                            aria-label={`Filter ${column.label}`}
                        />
                    {/if}
                </th>
            {/each}
        </tr>
    {/if}
{/snippet}

<style>
    .leaderboard-page {
        min-height: calc(100dvh - var(--nav-sticky-offset));
        background: var(--bg);
    }

    .leaderboard-container {
        max-width: 1880px;
        padding-bottom: 28px;
    }

    .leader-player {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 6px;
        color: var(--text);
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
    }

    .leader-player:hover {
        color: var(--accent);
    }

    .leader-player img {
        width: 22px;
        height: 22px;
        object-fit: contain;
        flex: 0 0 auto;
    }

    .leader-player span {
        display: grid;
        min-width: 0;
    }

    .leader-player small {
        color: var(--text-muted);
        font-size: 11px;
        font-weight: 600;
    }

    .leader-player--empty {
        color: var(--text-muted);
    }

    .leaderboard-workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 390px);
        gap: 18px;
        align-items: start;
        margin-top: 18px;
    }

    .leaderboard-table-panel {
        min-width: 0;
    }

    /* Season, team, position and age, the search taking what's left, then the toggles and the
       export; the row wraps rather than squeezing. */
    .leaderboard-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        margin-bottom: 14px;
    }

    .leaderboard-controls .control-field {
        flex: 0 1 150px;
        min-width: 120px;
    }

    .leaderboard-controls .control-field--season {
        flex-basis: 180px;
    }

    .leaderboard-controls .control-field--search {
        flex: 1 1 220px;
    }

    .control-toggles {
        display: flex;
        gap: 8px;
    }

    .toggle-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 42px;
        padding: 0 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text-secondary);
        font-family: var(--font-sans);
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
        cursor: pointer;
    }

    .toggle-chip:hover {
        border-color: var(--text-muted);
        color: var(--text);
    }

    .toggle-chip:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 1px;
    }

    .toggle-chip.active {
        border-color: var(--accent);
        color: var(--text);
        background: color-mix(in srgb, var(--accent) 10%, var(--bg-surface));
    }

    .toggle-chip svg path {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.4;
        stroke-linejoin: round;
        stroke-linecap: round;
    }

    .toggle-chip.active svg path {
        color: var(--accent);
    }

    .toggle-count {
        min-width: 18px;
        padding: 1px 5px;
        border-radius: 999px;
        background: var(--bg-hover);
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 11px;
        text-align: center;
    }

    .leaderboard-value-note {
        margin: -2px 0 12px;
        color: var(--text-secondary);
        font-size: 12px;
        line-height: 1.5;
    }

    .leaderboard-value-note strong {
        color: var(--text);
    }

    .leaderboard-value-note a {
        color: var(--accent);
        font-weight: 750;
    }

    .leaderboard-value-note a:hover {
        text-decoration: underline;
        text-underline-offset: 2px;
    }

    .control-field {
        display: grid;
    }

    .control-field select,
    .search-control input {
        width: 100%;
        height: 42px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 13px;
        outline: none;
    }

    .control-field select {
        padding: 0 12px;
    }

    .search-control {
        position: relative;
    }

    .search-control::before {
        content: '';
        position: absolute;
        left: 14px;
        top: 50%;
        width: 11px;
        height: 11px;
        border: 1.6px solid var(--text-muted);
        border-radius: 50%;
        transform: translateY(-58%);
        pointer-events: none;
    }

    .search-control::after {
        content: '';
        position: absolute;
        left: 24px;
        top: 25px;
        width: 7px;
        height: 1.6px;
        background: var(--text-muted);
        transform: rotate(45deg);
        transform-origin: left center;
        pointer-events: none;
    }

    .search-control input {
        padding: 0 12px 0 40px;
    }

    .control-field select:focus,
    .search-control input:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }

    /* The toolbar's button matches its 42px inputs. */
    .leaderboard-controls .btn {
        height: 42px;
    }

    .leaderboard-pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        margin-top: 12px;
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 750;
    }

    .leaderboard-pagination button {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text);
        font-size: 20px;
        line-height: 1;
    }

    .leaderboard-pagination button:hover:not(:disabled) {
        border-color: var(--accent);
        color: var(--accent);
    }

    .leaderboard-pagination button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .table-wrapper {
        --wide-sticky-header-height: 44px;
        --frozen-rank-width: 52px;
        --frozen-player-width: 216px;
        position: relative;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg);
        overflow: visible;
        margin-bottom: 24px;
    }

    .table-shell {
        position: relative;
    }

    .sticky-header-shell {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 30;
        margin-bottom: calc(-1 * var(--wide-sticky-header-height));
        border-radius: var(--radius-sm) var(--radius-sm) 0 0;
        overflow: hidden;
    }

    .table-header-scroll {
        overflow: hidden;
    }

    .table-body-scroll {
        overflow-x: auto;
    }

    table {
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
        width: max-content;
        min-width: 100%;
    }

    th {
        height: var(--wide-sticky-header-height);
        background: color-mix(in srgb, var(--bg-elevated) 86%, var(--bg));
        box-shadow: inset 0 -1px 0 var(--border);
        border-bottom: 1px solid var(--border);
        padding: 0 7px;
        text-align: left;
        font-size: 11px;
        font-weight: 850;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-secondary);
        white-space: nowrap;
    }

    /* 7px a side keeps all eighteen columns on a 1440px screen. */
    td {
        height: 48px;
        padding: 7px;
        border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 72%, transparent);
        white-space: nowrap;
        background: var(--bg);
    }

    tbody tr:nth-child(even) td {
        background: color-mix(in srgb, var(--bg-surface) 42%, var(--bg));
    }

    th.sortable {
        cursor: pointer;
        user-select: none;
    }

    .header-label-wrap {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    th.sortable:hover {
        background: var(--bg-hover);
    }

    th.active {
        color: var(--text);
    }

    .sort-indicator {
        margin-left: 2px;
        opacity: 0.55;
        font-size: 11px;
        color: var(--text-muted);
    }

    th.active .sort-indicator {
        color: var(--accent);
        opacity: 1;
    }

    .leaderboard-cell--rank,
    .table-header-scroll :is(.header-row, .column-filter-row) th:nth-child(1) {
        position: sticky;
        left: 0;
        z-index: 1;
        background: var(--bg);
    }

    .table-header-scroll :is(.header-row, .column-filter-row) th:nth-child(1) {
        z-index: 22;
        background: color-mix(in srgb, var(--bg-elevated) 86%, var(--bg));
    }

    .leaderboard-cell--rank {
        width: var(--frozen-rank-width);
        min-width: var(--frozen-rank-width);
        max-width: var(--frozen-rank-width);
        color: var(--text-secondary);
        text-align: center;
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 700;
    }

    .leaderboard-cell--player,
    .table-header-scroll :is(.header-row, .column-filter-row) th:nth-child(2) {
        position: sticky;
        left: var(--frozen-rank-width);
        z-index: 1;
        min-width: var(--frozen-player-width);
        background: var(--bg);
        box-shadow: 1px 0 0 var(--border-subtle);
    }

    .table-header-scroll :is(.header-row, .column-filter-row) th:nth-child(2) {
        z-index: 21;
        background: color-mix(in srgb, var(--bg-elevated) 86%, var(--bg));
    }

    tbody tr:nth-child(even) .leaderboard-cell--rank,
    tbody tr:nth-child(even) .leaderboard-cell--player {
        background: color-mix(in srgb, var(--bg-surface) 42%, var(--bg));
    }

    .table-body-scroll tr:hover td,
    .table-body-scroll tr:hover .leaderboard-cell--rank,
    .table-body-scroll tr:hover .leaderboard-cell--player {
        background: var(--bg-hover);
    }

    .leaderboard-cell--num {
        text-align: right;
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 500;
    }

    .leaderboard-cell--dpm {
        font-weight: 700;
    }

    th.num {
        text-align: right;
    }

    .leaderboard-cell--team {
        min-width: 86px;
        color: var(--text-secondary);
    }

    .player-cell {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        margin-left: -4px;
    }

    /* Under each DPM, a small offense/defense split: offense orange, defense blue. */
    .dpm-figure,
    .dpm-split {
        display: block;
    }

    .leaderboard-cell--dpm {
        min-width: 68px;
    }

    .dpm-split :global(.od-bar) {
        width: 54px;
        height: 7px;
        margin: 3px 0 0 auto;
    }

    .dpm-split :global(.od-bar-half) {
        height: 5px;
        gap: 1px;
    }

    .dpm-split :global(.od-bar-zero) {
        height: 7px;
    }

    /* The season sparkline: drawn, so centred and unsorted. */
    th.drawn {
        text-align: center;
    }

    .leaderboard-cell--drawn {
        text-align: center;
    }

    .leaderboard-cell--trend :global(.sparkline) {
        margin: 0 auto;
    }

    .trend-pending {
        display: block;
        width: 84px;
        height: 2px;
        margin: 0 auto;
        border-radius: 1px;
        background: var(--border-subtle);
    }

    .player-link,
    .team-link {
        color: var(--text);
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .player-link {
        flex-direction: row;
        font-weight: 850;
    }

    .player-link small {
        color: var(--text-muted);
        font-size: 11px;
        font-weight: 700;
    }

    .player-link:hover,
    .team-link:hover {
        color: var(--accent);
    }

    .team-link {
        color: var(--text-secondary);
        font-weight: 800;
    }

    .team-mark {
        width: 22px;
        height: 22px;
        display: inline-grid;
        place-items: center;
        border-radius: 50%;
        background: var(--bg-elevated);
    }

    .team-mark img {
        width: 18px;
        height: 18px;
        object-fit: contain;
    }

    .metric-muted,
    .cell-muted {
        color: var(--text-muted);
    }

    .empty-row,
    .empty-state,
    .empty-mini {
        padding: 22px;
        text-align: center;
        color: var(--text-muted);
        font-family: var(--font-sans);
        font-size: 13px;
    }

    .insight-rail {
        display: grid;
        gap: 14px;
        position: sticky;
        top: calc(var(--nav-sticky-offset) + 18px);
    }

    .insight-card {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--bg-elevated) 72%, var(--bg));
        color: var(--text);
        padding: 18px;
        box-shadow: 0 16px 36px color-mix(in srgb, var(--text) 13%, transparent);
    }

    .insight-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 14px;
    }

    .insight-card-header--distribution {
        align-items: flex-start;
    }

    .distribution-title-control {
        display: grid;
        gap: 8px;
        min-width: 0;
    }

    .insight-card h2 {
        font-size: 16px;
        line-height: 1.1;
        font-weight: 850;
        letter-spacing: 0;
    }

    .insight-info {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: inline-grid;
        place-items: center;
        border: 1px solid var(--text-muted);
        color: var(--text-secondary);
        font-size: 11px;
        font-family: var(--font-mono);
    }

    .distribution-select {
        width: min(210px, 100%);
        min-height: 34px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 12px;
        font-weight: 700;
        padding: 0 28px 0 10px;
        outline: none;
    }

    .distribution-select:focus-visible {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }

    .distribution-chart {
        display: block;
        width: 100%;
        margin-top: 14px;
    }

    .distribution-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-top: 8px;
    }

    .distribution-stats div {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 9px 10px;
        background: color-mix(in srgb, var(--bg-surface) 45%, transparent);
    }

    .distribution-stats span {
        display: block;
        color: var(--text-secondary);
        font-size: 12px;
        margin-bottom: 4px;
    }

    .distribution-stats strong {
        display: block;
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 16px;
    }

    .position-tabs {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        border: 1px solid var(--border);
        background: var(--bg-surface);
        border-radius: var(--radius-sm);
        padding: 4px;
        margin-bottom: 16px;
    }

    .position-tabs button {
        border: none;
        border-radius: calc(var(--radius-sm) - 2px);
        background: transparent;
        color: var(--text-secondary);
        height: 34px;
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 12px;
        font-weight: 850;
    }

    .position-tabs button.active {
        background: color-mix(in srgb, var(--accent) 24%, var(--bg-surface));
        color: var(--text);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 46%, transparent);
    }

    .position-list {
        display: grid;
        gap: 13px;
    }

    .position-table-head,
    .shiny-plot-caption {
        display: none;
    }

    .position-player {
        display: grid;
        grid-template-columns: 22px 34px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        color: var(--text);
    }

    .position-player:hover {
        color: var(--accent);
    }

    .position-rank {
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-weight: 850;
    }

    .mini-headshot {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        overflow: hidden;
        background: var(--bg-surface);
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 850;
    }

    .mini-headshot img {
        grid-area: 1 / 1;
        width: 42px;
        height: 34px;
        object-fit: cover;
        object-position: center top;
    }

    .position-player-main {
        display: grid;
        gap: 7px;
        min-width: 0;
    }

    .position-player-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        font-weight: 850;
    }

    /* A bare <small> would shrink to 10.8px, under the 11px floor. */
    .position-player-position {
        font-size: 11px;
    }

    .position-player-main small {
        color: var(--text-secondary);
        margin-left: 3px;
        font-weight: 700;
    }

    .position-bar {
        height: 3px;
        border-radius: 999px;
        background: var(--border);
        overflow: hidden;
    }

    .position-bar span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--accent);
    }

    .position-player strong {
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 14px;
    }

    .insight-note {
        margin-top: 18px;
        color: var(--text-secondary);
        font-size: 12px;
    }

    /* The insight cards move under the table until the screen is wide enough for both (about
       1840px), so the table keeps its full width and every column. */
    @media (max-width: 1839px) {
        .leaderboard-workspace {
            grid-template-columns: 1fr;
        }

        .insight-rail {
            position: static;
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    /* Two selects a row, then the search on its own. */
    @media (max-width: 920px) {
        .leaderboard-controls .control-field {
            flex: 1 1 calc(50% - 5px);
        }

        .leaderboard-controls .control-field--search {
            flex-basis: 100%;
        }

        .insight-rail {
            grid-template-columns: 1fr;
        }
    }

    /* Touch/mobile scroll mode */
    @media (hover: none) and (pointer: coarse) and (max-width: 1024px),
        (any-hover: none) and (any-pointer: coarse) and (max-width: 1024px) {
        .sticky-header-shell {
            display: none;
        }

        .table-body-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .table-semantic-row {
            display: none;
        }

        .table-sizing-head .table-sizing-row th {
            visibility: visible;
            pointer-events: auto;
        }

        th,
        .leaderboard-cell--rank,
        .leaderboard-cell--player {
            position: static;
            left: auto;
            box-shadow: none;
        }

        table {
            width: max-content;
            min-width: 100%;
        }

        .btn {
            display: none;
        }
    }
    /* End touch/mobile scroll mode */

    @media (max-width: 768px) {
        .leaderboard-container {
            padding: 0 12px 24px;
        }

        .control-toggles {
            flex: 1 1 100%;
        }

        .toggle-chip {
            flex: 1 1 0;
            justify-content: center;
        }

        td {
            height: 42px;
            padding: 6px 9px;
        }

        th {
            padding: 0 9px;
        }

        .leaderboard-cell--player {
            min-width: 178px;
        }

        .distribution-stats {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>
