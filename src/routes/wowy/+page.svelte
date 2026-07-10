<script>
    import {
        exportCsvRows,
        formatFixed,
        formatSignedMetric,
        wowyLeaderboardCsvColumns
    } from '$lib/utils/csvPresets.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';
    import { getNextSortState, getSortGlyph, getSortedRows } from '$lib/utils/sortableTable.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
    import MetricTooltip from '$lib/components/MetricTooltip.svelte';

    let { data } = $props();

    const PAGE_SIZE = 50;
    const textSortColumns = new Set(['player_name', 'team_name']);
    const wowySortConfig = {
        player_name: { type: 'text' },
        team_name: { type: 'text' },
        wowy_rapm: { type: 'number' },
        wowy_orapm: { type: 'number' },
        wowy_drapm: { type: 'number' },
        exposure: { type: 'number' },
        career_game_num: { type: 'number' },
        date: { type: 'text' }
    };
    const tableColumns = [
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

    let sortColumn = $state('wowy_rapm');
    let sortDirection = $state('desc');
    let searchQuery = $state('');
    let teamFilter = $state('all');
    let leaderboardPage = $state(1);

    const players = $derived(data.players || []);
    const publication = $derived(data.publication || null);
    const teamOptions = $derived.by(() => {
        const teams = new Set();
        for (const player of players) {
            if (player?.team_name) teams.add(player.team_name);
        }
        return [...teams].sort((left, right) => teamAbbr(left).localeCompare(teamAbbr(right)));
    });
    const activeTeamFilter = $derived(
        teamFilter === 'all' || teamOptions.includes(teamFilter) ? teamFilter : 'all'
    );
    const teamScopedPlayers = $derived.by(() =>
        activeTeamFilter === 'all'
            ? players
            : players.filter((player) => player?.team_name === activeTeamFilter)
    );
    const filteredPlayers = $derived.by(() => {
        const query = searchQuery.trim().toLocaleLowerCase();
        if (!query) return teamScopedPlayers;

        return teamScopedPlayers.filter((player) => {
            const searchable = [
                player?.player_name,
                player?.team_name,
                teamAbbr(player?.team_name),
                player?.position
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
        const start = (activeLeaderboardPage - 1) * PAGE_SIZE;
        return sortedPlayers.slice(start, start + PAGE_SIZE);
    });
    const rangeStart = $derived(
        sortedPlayers.length === 0 ? 0 : (activeLeaderboardPage - 1) * PAGE_SIZE + 1
    );
    const rangeEnd = $derived(Math.min(activeLeaderboardPage * PAGE_SIZE, sortedPlayers.length));
    const leaderCards = $derived.by(() => [
        buildLeaderCard('Total impact', 'wowy_rapm', 'WOWY RAPM', true),
        buildLeaderCard('Offensive impact', 'wowy_orapm', 'WOWY O-RAPM'),
        buildLeaderCard('Defensive impact', 'wowy_drapm', 'WOWY D-RAPM')
    ]);
    const freshnessLabel = $derived(
        publication?.data_through
            ? `Data through ${formatObservedDate(publication.data_through)}`
            : 'Latest published observations'
    );

    function toNumber(value) {
        const number = Number.parseFloat(value);
        return Number.isFinite(number) ? number : null;
    }

    function buildLeaderCard(label, metric, metricLabel, featured = false) {
        const leader = players.reduce((best, player) => {
            const value = toNumber(player?.[metric]);
            if (value === null) return best;
            if (!best || value > best.value) return { player, value };
            return best;
        }, null);

        return {
            label,
            metric,
            metricLabel,
            featured,
            player: leader?.player ?? null,
            value: leader?.value ?? null
        };
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
    }

    function setSearchQuery(value) {
        searchQuery = value;
        leaderboardPage = 1;
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

    function playerTrajectoryUrl(player) {
        return `/trajectories?ids=${encodeURIComponent(player.nba_id)}&metric=wowy_rapm`;
    }

    function teamLogoUrl(player) {
        const teamId = Number.parseInt(player?.tm_id, 10);
        return Number.isInteger(teamId) && teamId > 0 ? `/api/img/logo/${teamId}` : null;
    }

    function teamUrl(player) {
        return player?.team_name ? `/team/${encodeURIComponent(player.team_name)}` : null;
    }

    function hideBrokenImage(event) {
        event.currentTarget.hidden = true;
    }

    function exportPlayersCsv() {
        exportCsvRows({
            rows: sortedPlayers.map((player, index) => ({ ...player, rank: index + 1 })),
            columns: wowyLeaderboardCsvColumns,
            filename: 'darko-wowy-rapm-current-active.csv'
        });
    }
</script>

<svelte:head>
    <title>WOWY RAPM — DARKO</title>
    <meta
        name="description"
        content="Latest observed WOWY RAPM ratings for current active NBA players."
    />
</svelte:head>

<div class="wowy-page">
    <div class="container wowy-container">
        <section class="wowy-hero" aria-labelledby="wowy-title">
            <div class="wowy-hero-copy">
                <p class="wowy-eyebrow">Game-level impact</p>
                <div class="wowy-title-row">
                    <div class="wowy-icon" aria-hidden="true">
                        <svg viewBox="0 0 64 64" role="presentation">
                            <path d="M9 45V13" />
                            <path d="M9 45H56" />
                            <path d="M15 37L27 25L36 32L53 15" />
                            <circle cx="15" cy="37" r="2.5" />
                            <circle cx="27" cy="25" r="2.5" />
                            <circle cx="36" cy="32" r="2.5" />
                            <circle cx="53" cy="15" r="2.5" />
                        </svg>
                    </div>
                    <div>
                        <h1 id="wowy-title">WOWY RAPM</h1>
                        <p class="wowy-subtitle">Synthetic game-level RAPM for current active players.</p>
                    </div>
                </div>
                <div class="wowy-status">
                    <strong>Latest observed</strong>
                    <span>{freshnessLabel}</span>
                </div>
                <p class="wowy-projection-note">Observed player-game ratings only. This page does not use DARKO projection rows.</p>
            </div>

            <aside class="wowy-method" aria-label="How to read WOWY RAPM">
                <p class="wowy-method-label">Reading the table</p>
                <p>{getMetricDefinition('wowy_rapm')}</p>
                <p>Each player row is dated to that player’s most recent observed game; team and position reflect the current DARKO roster.</p>
                <a href="/trajectories?metric=wowy_rapm">Explore career WOWY trajectories <span aria-hidden="true">→</span></a>
            </aside>
        </section>

        {#if players.length > 0}
            <section class="wowy-leader-section" aria-label="Observed WOWY leaders">
                <div class="wowy-section-heading">
                    <p>Observed leaders</p>
                    <span>Current active roster</span>
                </div>
                <div class="wowy-leader-grid">
                    {#each leaderCards as card (card.metric)}
                        <article class={`wowy-leader-card ${card.featured ? 'wowy-leader-card--featured' : ''}`}>
                            <div class="wowy-leader-card-topline">
                                <span>{card.label}</span>
                                <small>{card.metricLabel}</small>
                            </div>
                            {#if card.player}
                                <strong class={metricTone(card.value)}>{formatSignedMetric(card.value)}</strong>
                                <a
                                    class="wowy-leader-player"
                                    href={playerTrajectoryUrl(card.player)}
                                    aria-label={`Open ${playerName(card.player)}'s WOWY RAPM trajectory`}
                                >
                                    {#if teamLogoUrl(card.player)}
                                        <span class="wowy-team-mark">
                                            <img src={teamLogoUrl(card.player)} alt="" loading="lazy" onerror={hideBrokenImage} />
                                        </span>
                                    {/if}
                                    <span>
                                        {playerName(card.player)}
                                        <small>{teamAbbr(card.player.team_name)}{card.player.position ? ` · ${card.player.position}` : ''}</small>
                                    </span>
                                </a>
                            {:else}
                                <strong class="metric-muted">—</strong>
                                <span class="wowy-leader-player wowy-leader-player--empty">No observed rating</span>
                            {/if}
                        </article>
                    {/each}
                </div>
            </section>
        {/if}

        <section class="wowy-table-panel" aria-labelledby="wowy-table-title">
            <div class="wowy-table-heading">
                <div>
                    <p class="wowy-eyebrow">Leaderboard</p>
                    <h2 id="wowy-table-title">Current active players</h2>
                    <p>
                        {#if sortedPlayers.length === 0}
                            No current active players match these filters.
                        {:else}
                            Showing {rangeStart}–{rangeEnd} of {sortedPlayers.length} players with an observed WOWY rating.
                        {/if}
                    </p>
                </div>
                <button
                    class="wowy-export-button"
                    type="button"
                    onclick={exportPlayersCsv}
                    disabled={sortedPlayers.length === 0}
                >
                    Download CSV
                </button>
            </div>

            <div class="wowy-controls">
                <label class="wowy-control-field" for="wowy-team-filter">
                    <span class="sr-only">Filter by team</span>
                    <select
                        id="wowy-team-filter"
                        value={activeTeamFilter}
                        onchange={(event) => setTeamFilter(event.currentTarget.value)}
                    >
                        <option value="all">All teams</option>
                        {#each teamOptions as team (team)}
                            <option value={team}>{teamAbbr(team)}</option>
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
                        placeholder="Search players, teams, or positions..."
                    />
                </label>
            </div>

            <div class="wowy-table-shell">
                <table class="wowy-table">
                    <thead>
                        <tr>
                            {#each tableColumns as column (column.key)}
                                <th
                                    scope="col"
                                    aria-sort={sortColumn === column.key
                                        ? (sortDirection === 'asc' ? 'ascending' : 'descending')
                                        : 'none'}
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
                    </thead>
                    <tbody>
                        {#if visiblePlayers.length === 0}
                            <tr>
                                <td class="wowy-empty-row" colspan={tableColumns.length}>
                                    No players match the selected team and search terms.
                                </td>
                            </tr>
                        {:else}
                            {#each visiblePlayers as player, index (player.nba_id)}
                                {@const rank = (activeLeaderboardPage - 1) * PAGE_SIZE + index + 1}
                                <tr>
                                    <td class="align-right wowy-rank-cell">{rank}</td>
                                    <td class="wowy-player-cell">
                                        <a
                                            class="wowy-player-link"
                                            href={playerTrajectoryUrl(player)}
                                            aria-label={`Open ${playerName(player)}'s WOWY RAPM trajectory`}
                                        >
                                            <span>{playerName(player)}</span>
                                            {#if player.position}<small>{player.position}</small>{/if}
                                        </a>
                                    </td>
                                    <td>
                                        {#if teamUrl(player)}
                                            <a class="wowy-team-link" href={teamUrl(player)} title={player.team_name}>
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
                                    <td class={`align-right wowy-metric-cell ${metricTone(player.wowy_rapm)}`}>
                                        {formatSignedMetric(player.wowy_rapm)}
                                    </td>
                                    <td class={`align-right wowy-metric-cell ${metricTone(player.wowy_orapm)}`}>
                                        {formatSignedMetric(player.wowy_orapm)}
                                    </td>
                                    <td class={`align-right wowy-metric-cell ${metricTone(player.wowy_drapm)}`}>
                                        {formatSignedMetric(player.wowy_drapm)}
                                    </td>
                                    <td class="align-right wowy-sample-cell">{formatFixed(player.exposure, 1)}</td>
                                    <td class="align-right wowy-sample-cell">{formatWholeNumber(player.career_game_num)}</td>
                                    <td class="align-right wowy-date-cell">
                                        <time datetime={player.date || undefined}>{formatObservedDate(player.date)}</time>
                                    </td>
                                </tr>
                            {/each}
                        {/if}
                    </tbody>
                </table>
            </div>

            {#if sortedPlayers.length > PAGE_SIZE}
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
                Exposure is shown without a cutoff. Sample games include the available WOWY regular-season and postseason appearances.
            </p>
        </section>
    </div>
</div>

<style>
    .wowy-page {
        min-height: calc(100dvh - var(--nav-sticky-offset));
        padding: 24px 0 34px;
        background: var(--bg);
    }

    .wowy-container {
        max-width: 1680px;
        display: grid;
        gap: 18px;
    }

    .wowy-hero {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(270px, 0.65fr);
        gap: 28px;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        background: var(--bg-surface);
        box-shadow: 0 18px 44px color-mix(in srgb, var(--text) 10%, transparent);
        padding: 27px 30px;
    }

    .wowy-hero::before {
        content: '';
        position: absolute;
        z-index: -1;
        inset: 0 0 0 57%;
        opacity: 0.42;
        background-image:
            linear-gradient(color-mix(in srgb, var(--border-subtle) 82%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--border-subtle) 82%, transparent) 1px, transparent 1px);
        background-size: 28px 28px;
        mask-image: linear-gradient(90deg, transparent, black 22%, black);
        pointer-events: none;
    }

    .wowy-hero-copy {
        min-width: 0;
    }

    .wowy-eyebrow,
    .wowy-method-label,
    .wowy-section-heading p {
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 850;
        letter-spacing: 0.12em;
        line-height: 1.2;
        text-transform: uppercase;
    }

    .wowy-title-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 10px;
    }

    .wowy-icon {
        width: 62px;
        height: 62px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border: 1px solid color-mix(in srgb, var(--accent) 42%, var(--border));
        border-radius: 50%;
        background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface));
        color: var(--accent);
    }

    .wowy-icon svg {
        width: 38px;
        height: 38px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 3.5;
    }

    .wowy-icon circle {
        fill: var(--bg-surface);
    }

    h1 {
        color: var(--text);
        font-size: clamp(32px, 3.2vw, 46px);
        font-weight: 875;
        letter-spacing: -0.04em;
        line-height: 0.95;
    }

    .wowy-subtitle {
        margin-top: 8px;
        color: var(--text-secondary);
        font-size: 16px;
        line-height: 1.35;
    }

    .wowy-status {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 22px;
        color: var(--text-secondary);
        font-size: 12px;
    }

    .wowy-status strong {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .wowy-status strong::before {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--positive);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--positive) 14%, transparent);
        content: '';
    }

    .wowy-projection-note {
        max-width: 580px;
        margin-top: 8px;
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.45;
    }

    .wowy-method {
        align-self: stretch;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
        border-left: 1px solid var(--border);
        padding-left: 26px;
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

    .wowy-leader-section {
        display: grid;
        gap: 10px;
    }

    .wowy-section-heading {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        padding: 0 2px;
    }

    .wowy-section-heading span {
        color: var(--text-muted);
        font-size: 12px;
    }

    .wowy-leader-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1fr);
        gap: 12px;
    }

    .wowy-leader-card {
        min-width: 0;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        box-shadow: 0 12px 28px color-mix(in srgb, var(--text) 7%, transparent);
        padding: 16px 18px;
    }

    .wowy-leader-card--featured {
        border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
        background: color-mix(in srgb, var(--accent) 6%, var(--bg-surface));
    }

    .wowy-leader-card-topline {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 750;
        line-height: 1.2;
    }

    .wowy-leader-card-topline small {
        color: var(--text-muted);
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.04em;
        text-align: right;
        text-transform: uppercase;
    }

    .wowy-leader-card > strong {
        display: block;
        margin-top: 15px;
        font-family: var(--font-mono);
        font-size: 29px;
        letter-spacing: -0.04em;
        line-height: 1;
    }

    .wowy-leader-player {
        display: inline-flex;
        align-items: center;
        min-width: 0;
        gap: 9px;
        margin-top: 13px;
        color: var(--text);
        font-size: 14px;
        font-weight: 800;
    }

    .wowy-leader-player:hover {
        color: var(--accent);
    }

    .wowy-leader-player > span:last-child {
        min-width: 0;
    }

    .wowy-leader-player small {
        display: block;
        margin-top: 1px;
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 700;
    }

    .wowy-leader-player--empty {
        color: var(--text-muted);
        font-size: 12px;
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
        box-shadow: 0 16px 36px color-mix(in srgb, var(--text) 9%, transparent);
        padding: 20px;
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
        font-size: 24px;
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
    .wowy-pagination button {
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
    .wowy-pagination button:hover:not(:disabled) {
        border-color: var(--accent);
        color: var(--accent);
    }

    .wowy-export-button:disabled,
    .wowy-pagination button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
    }

    .wowy-controls {
        display: grid;
        grid-template-columns: minmax(145px, 170px) minmax(240px, 1fr);
        gap: 10px;
        margin-bottom: 14px;
    }

    .wowy-control-field {
        min-width: 0;
    }

    .wowy-control-field select,
    .wowy-control-field input {
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
    .wowy-export-button:focus-visible,
    .wowy-pagination button:focus-visible,
    .wowy-column-heading > button:focus-visible {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }

    .wowy-table-shell {
        width: 100%;
        overflow: visible;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
    }

    .wowy-table {
        width: 100%;
        min-width: 900px;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
    }

    .wowy-table th {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 2;
        height: 42px;
        border-bottom: 1px solid var(--border);
        background: var(--bg);
        color: var(--text-secondary);
        font-size: 10px;
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
        font-size: 8px;
        font-weight: 850;
        letter-spacing: 0;
        line-height: 1;
        text-transform: lowercase;
    }

    .wowy-table td {
        border-bottom: 1px solid var(--border-subtle);
        background: var(--bg-surface);
        color: var(--text);
        font-size: 12px;
        padding: 11px 10px;
        white-space: nowrap;
    }

    .wowy-table tbody tr:last-child td {
        border-bottom: 0;
    }

    .wowy-table tbody tr:hover td {
        background: var(--bg-elevated);
    }

    .wowy-rank-cell,
    .wowy-metric-cell,
    .wowy-sample-cell,
    .wowy-date-cell {
        font-family: var(--font-mono);
        font-weight: 750;
    }

    .wowy-rank-cell,
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
        font-size: 10px;
        font-weight: 750;
    }

    .wowy-team-link {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 800;
    }

    .wowy-team-link .wowy-team-mark {
        width: 23px;
        height: 23px;
    }

    .wowy-team-link .wowy-team-mark img {
        width: 21px;
        height: 21px;
    }

    .metric-positive {
        color: var(--positive) !important;
    }

    .metric-negative {
        color: var(--negative) !important;
    }

    .metric-neutral {
        color: var(--text-secondary) !important;
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

    .wowy-table-note {
        margin-top: 12px;
        color: var(--text-muted);
        font-size: 11px;
        line-height: 1.45;
    }

    @media (hover: hover) and (pointer: fine) and (max-width: 980px) {
        .wowy-table th:nth-child(7),
        .wowy-table td:nth-child(7),
        .wowy-table th:nth-child(8),
        .wowy-table td:nth-child(8) {
            display: none;
        }

        .wowy-table {
            min-width: 720px;
        }
    }

    /* Touch/mobile scroll mode */
    @media (hover: none) and (pointer: coarse) and (max-width: 1024px),
        (any-hover: none) and (any-pointer: coarse) and (max-width: 1024px) {
        .wowy-table-shell {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .wowy-table {
            width: max-content;
            min-width: 900px;
        }

        .wowy-table th {
            position: static;
        }
    }
    /* End touch/mobile scroll mode */

    /* Narrow fine-pointer windows need the same scroll-safe table behavior. */
    @media (max-width: 840px) {
        .wowy-table-shell {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .wowy-table {
            width: max-content;
            min-width: 720px;
        }

        .wowy-table th {
            position: static;
        }
    }

    @media (max-width: 900px) {
        .wowy-hero {
            grid-template-columns: 1fr;
        }

        .wowy-hero::before {
            inset: 46% 0 0;
            mask-image: linear-gradient(transparent, black 25%);
        }

        .wowy-method {
            border-top: 1px solid var(--border);
            border-left: 0;
            padding-top: 20px;
            padding-left: 0;
        }

        .wowy-leader-grid {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 680px) {
        .wowy-page {
            padding: 16px 0 26px;
        }

        .wowy-hero,
        .wowy-table-panel {
            padding: 18px;
        }

        .wowy-title-row {
            align-items: flex-start;
            gap: 12px;
        }

        .wowy-icon {
            width: 52px;
            height: 52px;
        }

        .wowy-icon svg {
            width: 33px;
            height: 33px;
        }

        h1 {
            font-size: 30px;
        }

        .wowy-subtitle {
            font-size: 14px;
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

        .wowy-pagination {
            justify-content: space-between;
        }
    }
</style>
