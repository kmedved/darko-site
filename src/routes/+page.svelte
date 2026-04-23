<script>
    import {
        exportCsvRows,
        leaderboardCsvColumns,
        formatFixed,
        formatPercent,
        formatSignedMetric
    } from '$lib/utils/csvPresets.js';
    import {
        formatLeaderboardCell,
        getLeaderboardCellValue,
        LEADERBOARD_COLUMNS,
        leaderboardSortConfig
    } from '$lib/utils/leaderboardColumns.js';
    import { filterPlayers } from '$lib/utils/legacyLeaderboard.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { buildLeaderboardCsvRows } from '$lib/utils/leaderboardCsv.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
    import { setupWideStickyTable } from '$lib/utils/wideStickyTable.js';
    import MetricTooltip from '$lib/components/MetricTooltip.svelte';

    let { data } = $props();

    let sortColumn = $state('dpm');
    let sortDirection = $state('desc');
    let searchQuery = $state('');
    let teamFilter = $state('all');
    let seasonFilter = $state('');
    let positionView = $state('all');
    let distributionMetric = $state('dpm');
    let standardTableRoot = $state(null);
    let standardBodyScroller = $state(null);
    let standardBodyTable = $state(null);
    let standardSourceHead = $state(null);
    let standardHeaderScroller = $state(null);
    let standardHeaderTable = $state(null);

    const TOP_POSITION_MIN_GAMES = 20;
    const players = $derived(data.players || []);
    const playerColumns = LEADERBOARD_COLUMNS;
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

    const seasonOptions = $derived.by(() => {
        const seasons = [];
        for (const player of players) {
            if (player?.season !== null && player?.season !== undefined) {
                const season = String(player.season);
                if (!seasons.includes(season)) seasons.push(season);
            }
        }
        return seasons.sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
    });

    const activeSeason = $derived(seasonFilter || seasonOptions[0] || '');
    const activeSeasonLabel = $derived(
        activeSeason ? formatSeasonLabel(activeSeason) : 'Current season'
    );

    const seasonPlayers = $derived.by(() => {
        if (!activeSeason) return players;
        return players.filter((player) => String(player?.season) === activeSeason);
    });

    const teamOptions = $derived.by(() => {
        const teams = [];
        for (const player of seasonPlayers) {
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
        if (activeTeamFilter === 'all') return seasonPlayers;
        return seasonPlayers.filter((player) => player?.team_name === activeTeamFilter);
    });

    const filteredPlayers = $derived.by(() =>
        filterPlayers(teamScopedPlayers, playerColumns, {
            player_name: searchQuery
        })
    );

    const sortedPlayers = $derived.by(() =>
        getSortedRows(filteredPlayers, {
            sortColumn,
            sortDirection,
            sortConfigs: leaderboardSortConfig
        })
    );

    const leaderCards = $derived.by(() => [
        buildLeaderCard(teamScopedPlayers, 'Best DPM', 'dpm'),
        buildLeaderCard(teamScopedPlayers, 'Best Offensive DPM', 'o_dpm'),
        buildLeaderCard(teamScopedPlayers, 'Best Defensive DPM', 'd_dpm'),
        buildLeaderCard(teamScopedPlayers, 'Best Three Point Shooter', 'x_fg3_pct', formatPercent),
        buildLeaderCard(teamScopedPlayers, 'Best Free Throw Shooter', 'x_ft_pct', formatPercent)
    ]);

    const selectedDistributionMetric = $derived(
        distributionMetrics.find((metric) => metric.key === distributionMetric) ?? distributionMetrics[0]
    );
    const distribution = $derived(buildDistribution(teamScopedPlayers, selectedDistributionMetric));

    const topPositionPlayers = $derived.by(() =>
        teamScopedPlayers
            .filter((player) => matchesPositionView(player, positionView))
            .filter((player) => hasMinimumGames(player, TOP_POSITION_MIN_GAMES))
            .filter((player) => Number.isFinite(toNumber(player?.dpm)))
            .slice()
            .sort((a, b) => toNumber(b.dpm) - toNumber(a.dpm))
            .slice(0, 5)
    );

    const leaderboardCsvColumnsForExport = leaderboardCsvColumns
        .filter((col) => col.accessor !== 'bayes_rapm_total' && col.accessor !== 'tr_minutes')
        .map((col) =>
            col.accessor === 'x_minutes'
                ? { ...col, format: fmtMpg }
                : col
        );

    $effect(() => {
        sortColumn;
        sortDirection;
        searchQuery;
        activeTeamFilter;
        activeSeason;
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
        const startYear = Number.parseInt(season, 10);
        if (!Number.isFinite(startYear)) return `${season} Season`;
        return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')} Season`;
    }

    function sortGlyph(column) {
        if (sortColumn !== column) return '↕';
        return sortDirection === 'asc' ? '↑' : '↓';
    }

    function toggleSort(column) {
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            return;
        }
        sortColumn = column;
        sortDirection = textSortColumns.has(column) ? 'asc' : 'desc';
    }

    function metricClass(value) {
        const n = toNumber(value);
        if (n === null) return '';
        return n >= 0 ? 'metric-positive' : 'metric-negative';
    }

    function pctClass(value) {
        const n = toNumber(value);
        if (n === null) return '';
        if (n >= 0.5) return 'metric-percentage metric-percentage-high';
        if (n >= 0.35) return 'metric-percentage metric-percentage-mid';
        if (n > 0) return 'metric-percentage metric-percentage-low';
        return 'metric-muted';
    }

    function statClass(column, value) {
        const n = toNumber(value);
        if (n === null) return 'metric-muted';

        if (column.endsWith('_pct')) return pctClass(n);
        if (column === 'sal_market_fixed' || column === 'actual_salary') return 'metric-neutral';
        if (column === 'x_minutes' || column === 'x_pace' || column === 'x_pts_100' || column === 'x_ast_100') {
            return 'metric-positive';
        }
        return metricClass(n);
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

    function distributionFloor(value, metric) {
        if (metric.kind === 'percent') return Math.max(0, value);
        return value;
    }

    function distributionCeiling(value, metric) {
        if (metric.kind === 'percent') return Math.min(1, value);
        return value;
    }

    function buildDistribution(rows, metric) {
        const values = rows
            .map((player) => toNumber(player?.[metric.key]))
            .filter((value) => value !== null)
            .sort((a, b) => a - b);

        if (values.length === 0) {
            return {
                areaPath: '',
                linePath: '',
                meanX: 160,
                mean: '—',
                median: '—',
                topTen: '—',
                players: 0,
                ticks: [
                    { x: 0, anchor: 'start', label: '—' },
                    { x: 160, anchor: 'middle', label: '—' },
                    { x: 320, anchor: 'end', label: '—' }
                ]
            };
        }

        const meanValue = values.reduce((sum, value) => sum + value, 0) / values.length;
        const medianValue = values[Math.floor(values.length / 2)];
        const variance = values.reduce((sum, value) => sum + (value - meanValue) ** 2, 0) / values.length;
        const minSd = metric.kind === 'percent' ? 0.02 : 1;
        const sd = Math.max(Math.sqrt(variance), minSd);
        const min = distributionFloor(Math.min(values[0], meanValue - sd * 3), metric);
        const max = distributionCeiling(Math.max(values[values.length - 1], meanValue + sd * 3), metric);
        const domainSpan = Math.max(max - min, metric.kind === 'percent' ? 0.01 : 1);
        const width = 320;
        const baseY = 138;
        const topY = 20;
        const mid = min + domainSpan / 2;
        const points = Array.from({ length: 72 }, (_, index) => {
            const xValue = min + (domainSpan * index) / 71;
            const density = Math.exp(-((xValue - meanValue) ** 2) / (2 * sd ** 2));
            const x = (index / 71) * width;
            const y = baseY - density * (baseY - topY);
            return { x, y };
        });
        const linePath = points
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
            .join(' ');
        const areaPath = `M 0 ${baseY} ${linePath.slice(1)} L ${width} ${baseY} Z`;
        const topCount = Math.max(1, Math.ceil(values.length * 0.1));
        const topValues = values.slice(-topCount);
        const topTenValue = topValues.reduce((sum, value) => sum + value, 0) / topValues.length;

        return {
            areaPath,
            linePath,
            meanX: ((meanValue - min) / domainSpan) * width,
            mean: formatDistributionValue(meanValue, metric),
            median: formatDistributionValue(medianValue, metric),
            topTen: formatDistributionValue(topTenValue, metric),
            players: values.length,
            ticks: [
                { x: 0, anchor: 'start', label: formatDistributionValue(min, metric, true) },
                { x: 160, anchor: 'middle', label: formatDistributionValue(mid, metric, true) },
                { x: 320, anchor: 'end', label: formatDistributionValue(max, metric, true) }
            ]
        };
    }

    function matchesPositionView(player, view) {
        if (view === 'all') return true;
        const position = String(player?.position || '').toUpperCase();
        if (view === 'guards') return position.includes('G');
        if (view === 'forwards') return position.includes('F');
        if (view === 'centers') return position.includes('C');
        return true;
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
    <title>DARKO DPM - NBA Player Projections</title>
</svelte:head>

<div class="leaderboard-page">
    <div class="container leaderboard-container">
        <section class="leaderboard-hero" aria-labelledby="leaderboard-title">
            <div class="leaderboard-title-block">
                <div class="leaderboard-icon" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div>
                    <h1 id="leaderboard-title">DPM Leaderboard</h1>
                    <p>Daily Player Metrics for every NBA player, updated nightly.</p>
                </div>
            </div>

            <div class="leader-card-grid" aria-label="Leaderboard leaders">
                {#each leaderCards as card (card.title)}
                    <article class="leader-card">
                        <div class="leader-card-copy">
                            <p>{card.title}</p>
                            <strong class={statClass(card.metric, card.value)}>{card.displayValue}</strong>
                            {#if card.player}
                                <a class="leader-player" href="/player/{card.player.nba_id}">
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
                        </div>
                        <div class="leader-photo" aria-hidden="true">
                            {#if playerHeadshotUrl(card.player)}
                                <img src={playerHeadshotUrl(card.player)} alt="" loading="lazy" onerror={hideBrokenImage} />
                            {/if}
                        </div>
                    </article>
                {/each}
            </div>
        </section>

        {#if players.length === 0}
            <div class="empty-state">No players are currently available.</div>
        {:else}
            <div class="leaderboard-workspace">
                <section class="leaderboard-table-panel" aria-label="Active player leaderboard">
                    <div class="leaderboard-controls">
                        <div class="control-field">
                            <select
                                id="season-filter"
                                value={activeSeason}
                                onchange={(event) => {
                                    seasonFilter = event.currentTarget.value;
                                    teamFilter = 'all';
                                }}
                                aria-label="Season"
                            >
                                {#each seasonOptions as season (season)}
                                    <option value={season}>{formatSeasonLabel(season)}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="control-field">
                            <select
                                id="team-filter"
                                value={activeTeamFilter}
                                onchange={(event) => (teamFilter = event.currentTarget.value)}
                                aria-label="Team"
                            >
                                <option value="all">All Teams</option>
                                {#each teamOptions as team (team)}
                                    <option value={team}>{teamAbbr(team)}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="control-field control-field--search">
                            <div class="search-control">
                                <input
                                    id="player-search"
                                    type="search"
                                    value={searchQuery}
                                    oninput={(event) => (searchQuery = event.currentTarget.value)}
                                    placeholder="Search players..."
                                    aria-label="Search players"
                                />
                            </div>
                        </div>

                        <button
                            class="page-action-btn"
                            type="button"
                            onclick={exportPlayersCsv}
                            disabled={sortedPlayers.length === 0}
                        >
                            Download CSV
                        </button>
                    </div>

                    <div class="table-wrapper table-shell" bind:this={standardTableRoot}>
                        <div class="sticky-header-shell">
                            <div class="table-header-scroll" bind:this={standardHeaderScroller}>
                                <table class="sticky-header-table" bind:this={standardHeaderTable}>
                                    <thead>
                                        {@render standardHeaderRows()}
                                    </thead>
                                </table>
                            </div>
                        </div>

                        <div class="table-body-scroll" bind:this={standardBodyScroller}>
                            <table bind:this={standardBodyTable}>
                                <thead class="table-sizing-head" aria-hidden="true" bind:this={standardSourceHead}>
                                    {@render standardHeaderRows()}
                                </thead>
                                <tbody>
                                    {#if sortedPlayers.length === 0}
                                        <tr>
                                            <td class="empty-row" colspan={playerColumns.length}>No matching players.</td>
                                        </tr>
                                    {:else}
                                        {#each sortedPlayers as player, index (player.nba_id)}
                                            <tr>
                                                {#each playerColumns as column (column.key)}
                                                    {@const value = getLeaderboardCellValue(player, column, index)}
                                                    {#if column.key === 'player_name'}
                                                        <td class={cellClass(column, value)}>
                                                            <a class="player-link" href="/player/{player.nba_id}">
                                                                <span>{player.player_name}</span>
                                                                {#if player.position}<small>{player.position}</small>{/if}
                                                            </a>
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
                                                        <td class={cellClass(column, value)}>
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
                </section>

                <aside class="insight-rail" aria-label="Leaderboard insights">
                    <section class="insight-card insight-card--distribution">
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
                            <span class="insight-info" title={`${activeSeasonLabel}, ${activeTeamFilter === 'all' ? 'all teams' : teamAbbr(activeTeamFilter)}`}>i</span>
                        </div>
                        <svg class="distribution-chart" viewBox="0 0 320 170" role="img" aria-label={`Distribution of active player ${selectedDistributionMetric.label}`}>
                            <line x1="0" y1="138" x2="320" y2="138" />
                            <line x1="0" y1="96" x2="320" y2="96" />
                            <line x1="0" y1="54" x2="320" y2="54" />
                            <line class="distribution-mean" x1={distribution.meanX} y1="20" x2={distribution.meanX} y2="138" />
                            {#if distribution.areaPath}
                                <path class="distribution-area" d={distribution.areaPath} />
                                <path class="distribution-line" d={distribution.linePath} />
                            {/if}
                            {#each distribution.ticks as tick (tick.anchor)}
                                <text x={tick.x} y="166" text-anchor={tick.anchor}>{tick.label}</text>
                            {/each}
                        </svg>
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
                    </section>

                    <section class="insight-card">
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
                            {#if topPositionPlayers.length === 0}
                                <div class="empty-mini">No matching players.</div>
                            {:else}
                                {#each topPositionPlayers as player, index (player.nba_id)}
                                    <a class="position-player" href="/player/{player.nba_id}">
                                        <span class="position-rank">{index + 1}</span>
                                        <span class="mini-headshot">
                                            {#if playerHeadshotUrl(player)}
                                                <img src={playerHeadshotUrl(player)} alt="" loading="lazy" onerror={hideBrokenImage} />
                                            {/if}
                                        </span>
                                        <span class="position-player-main">
                                            <span>
                                                {player.player_name}
                                                {#if player.position}<small>{player.position}</small>{/if}
                                            </span>
                                            <span class="position-bar">
                                                <span style={`width: ${barWidth(player.dpm, topPositionPlayers)}%`}></span>
                                            </span>
                                        </span>
                                        <strong>{formatSignedMetric(player.dpm)}</strong>
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

{#snippet standardHeaderRows()}
    <tr class="header-row">
        {#each playerColumns as column (column.key)}
            <th
                class="{column.alignClass} sortable {sortColumn === column.key ? 'active' : ''} {column.metricKey ? 'has-tooltip' : ''}"
                onclick={() => toggleSort(column.key)}
                aria-sort={sortColumn === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
                <span class="header-label-wrap">
                    {#if column.metricKey}
                        <MetricTooltip text={getMetricDefinition(column.metricKey)}>
                            <span>{column.label}</span>
                        </MetricTooltip>
                    {:else}
                        <span>{column.label}</span>
                    {/if}
                    <span class="sort-indicator">{sortGlyph(column.key)}</span>
                </span>
            </th>
        {/each}
    </tr>
{/snippet}

<style>
    .leaderboard-page {
        min-height: calc(100dvh - var(--nav-sticky-offset));
        background:
            radial-gradient(circle at 74% 10%, color-mix(in srgb, var(--accent) 13%, transparent), transparent 27rem),
            linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 72%, var(--bg)), var(--bg) 19rem);
    }

    .leaderboard-container {
        max-width: 1880px;
        padding-top: 28px;
        padding-bottom: 28px;
    }

    .leaderboard-hero {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        background:
            radial-gradient(circle at 92% -12%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 24rem),
            var(--bg);
        box-shadow: 0 18px 48px color-mix(in srgb, var(--text) 10%, transparent);
        padding: 26px 28px 30px;
    }

    .leaderboard-hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
            repeating-radial-gradient(circle at 72% 6%, transparent 0 34px, color-mix(in srgb, var(--border-subtle) 65%, transparent) 35px 36px);
        opacity: 0.42;
        pointer-events: none;
    }

    .leaderboard-title-block,
    .leader-card-grid {
        position: relative;
        z-index: 1;
    }

    .leaderboard-title-block {
        display: flex;
        align-items: center;
        gap: 18px;
        margin-bottom: 24px;
    }

    .leaderboard-title-block > div:last-child {
        flex: 1;
        min-width: 0;
    }

    .leaderboard-icon {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        display: grid;
        grid-template-columns: repeat(3, 7px);
        justify-content: center;
        align-items: end;
        gap: 5px;
        padding-bottom: 20px;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        box-shadow: 0 12px 28px color-mix(in srgb, var(--text) 12%, transparent);
    }

    .leaderboard-icon span {
        display: block;
        width: 7px;
        border-radius: 999px;
        background: var(--accent);
    }

    .leaderboard-icon span:nth-child(1) { height: 10px; opacity: 0.68; }
    .leaderboard-icon span:nth-child(2) { height: 18px; opacity: 0.82; }
    .leaderboard-icon span:nth-child(3) { height: 28px; }

    h1 {
        font-size: clamp(30px, 3vw, 44px);
        line-height: 0.98;
        letter-spacing: 0;
        color: var(--text);
        font-weight: 850;
    }

    .leaderboard-title-block p {
        color: var(--text-secondary);
        font-size: 17px;
        margin-top: 8px;
        overflow-wrap: anywhere;
    }

    .leader-card-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
    }

    .leader-card {
        min-height: 124px;
        overflow: hidden;
        position: relative;
        display: flex;
        justify-content: space-between;
        gap: 10px;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--bg-surface) 88%, var(--bg));
        box-shadow: 0 10px 24px color-mix(in srgb, var(--text) 7%, transparent);
        padding: 16px 0 0 16px;
    }

    .leader-card-copy {
        min-width: 0;
        padding-bottom: 16px;
    }

    .leader-card-copy p {
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 8px;
    }

    .leader-card-copy strong {
        display: block;
        font-family: var(--font-mono);
        font-size: 25px;
        line-height: 1;
        margin-bottom: 10px;
    }

    .leader-player {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--text);
        min-width: 0;
        font-size: 12px;
        font-weight: 800;
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
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 700;
    }

    .leader-player--empty {
        color: var(--text-muted);
    }

    .leader-photo {
        align-self: stretch;
        width: 98px;
        min-width: 74px;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        color: var(--text-muted);
        font-weight: 800;
    }

    .leader-photo img {
        position: relative;
        z-index: 1;
        width: 118px;
        max-width: none;
        object-fit: contain;
        object-position: center bottom;
        transform: translateY(8px);
        filter: drop-shadow(0 12px 12px color-mix(in srgb, var(--text) 16%, transparent));
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

    .leaderboard-controls {
        display: grid;
        grid-template-columns: minmax(150px, 180px) minmax(140px, 180px) minmax(220px, 1fr) auto;
        gap: 10px;
        align-items: center;
        margin-bottom: 14px;
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

    .page-action-btn {
        height: 42px;
        padding: 0 18px;
        font-size: 13px;
        font-weight: 800;
        white-space: nowrap;
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
        font-size: 12px;
        width: max-content;
        min-width: 100%;
    }

    th {
        height: var(--wide-sticky-header-height);
        background: color-mix(in srgb, var(--bg-elevated) 86%, var(--bg));
        box-shadow: inset 0 -1px 0 var(--border);
        border-bottom: 1px solid var(--border);
        padding: 0 12px;
        text-align: left;
        font-size: 10px;
        font-weight: 850;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-secondary);
        white-space: nowrap;
    }

    td {
        height: 48px;
        padding: 7px 12px;
        border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 72%, transparent);
        white-space: nowrap;
        background: var(--bg);
    }

    tbody tr:nth-child(even) td {
        background: color-mix(in srgb, var(--bg-surface) 42%, var(--bg));
    }

    .table-sizing-head th {
        visibility: hidden;
        pointer-events: none;
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
        font-size: 9px;
        color: var(--text-muted);
    }

    th.active .sort-indicator {
        color: var(--accent);
        opacity: 1;
    }

    .leaderboard-cell--rank,
    .table-header-scroll .header-row th:nth-child(1) {
        position: sticky;
        left: 0;
        z-index: 1;
        background: var(--bg);
    }

    .table-header-scroll .header-row th:nth-child(1) {
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
        font-size: 12px;
        font-weight: 700;
    }

    .leaderboard-cell--player,
    .table-header-scroll .header-row th:nth-child(2) {
        position: sticky;
        left: var(--frozen-rank-width);
        z-index: 1;
        min-width: var(--frozen-player-width);
        background: var(--bg);
        box-shadow: 1px 0 0 var(--border-subtle);
    }

    .table-header-scroll .header-row th:nth-child(2) {
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
        font-size: 12px;
        font-weight: 850;
    }

    th.num {
        text-align: right;
    }

    .leaderboard-cell--team {
        min-width: 86px;
        color: var(--text-secondary);
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

    .metric-positive {
        color: var(--positive);
    }

    .metric-negative {
        color: var(--negative);
    }

    .metric-percentage {
        color: var(--accent);
    }

    .metric-percentage-low,
    .metric-muted,
    .cell-muted {
        color: var(--text-muted);
    }

    .metric-neutral {
        color: var(--text-secondary);
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
        font-size: 15px;
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
        height: auto;
        color: var(--text-muted);
    }

    .distribution-chart line {
        stroke: var(--border);
        stroke-width: 1;
    }

    .distribution-chart .distribution-mean {
        stroke: var(--text-muted);
        stroke-dasharray: 3 4;
    }

    .distribution-area {
        fill: color-mix(in srgb, var(--accent) 24%, transparent);
    }

    .distribution-line {
        fill: none;
        stroke: var(--accent);
        stroke-width: 2.5;
    }

    .distribution-chart text {
        fill: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 11px;
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
        font-size: 10px;
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

    .position-player-main > span:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        font-weight: 850;
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
        font-size: 15px;
    }

    .insight-note {
        margin-top: 18px;
        color: var(--text-secondary);
        font-size: 12px;
    }

    @media (max-width: 1280px) {
        .leader-card-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .leaderboard-workspace {
            grid-template-columns: 1fr;
        }

        .insight-rail {
            position: static;
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 920px) {
        .leaderboard-controls {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .control-field--search,
        .page-action-btn {
            grid-column: span 2;
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

        .table-sizing-head th {
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

        .page-action-btn {
            display: none;
        }
    }
    /* End touch/mobile scroll mode */

    @media (max-width: 768px) {
        .leaderboard-container {
            padding: 18px 12px 24px;
        }

        .leaderboard-hero {
            padding: 20px 16px;
        }

        .leaderboard-title-block {
            align-items: flex-start;
            gap: 12px;
        }

        .leaderboard-icon {
            width: 54px;
            height: 54px;
            grid-template-columns: repeat(3, 5px);
            gap: 4px;
            padding-bottom: 14px;
        }

        .leaderboard-icon span {
            width: 5px;
        }

        .leaderboard-title-block p {
            font-size: 14px;
            line-height: 1.35;
            max-width: 220px;
        }

        h1 {
            font-size: 28px;
        }

        .leader-card-grid {
            grid-template-columns: 1fr;
        }

        .leaderboard-controls {
            grid-template-columns: 1fr;
        }

        .control-field--search,
        .page-action-btn {
            grid-column: auto;
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
