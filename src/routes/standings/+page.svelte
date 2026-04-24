<script>
    import {
        exportCsvRows,
        standingsCsvColumns,
        standingsExpandedCsvColumns,
        formatFixed
    } from '$lib/utils/csvPresets.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { teamAbbr, teamId } from '$lib/utils/teamAbbreviations.js';

    let { data } = $props();

    let conference = $state('East');
    let sortColumn = $state('Rk');
    let sortDirection = $state('asc');
    let showExpandedStandings = $state(false);
    let teamSearch = $state('');

    const PLAYOFF_LOCK_THRESHOLD = 95;
    const PLAYOFF_LIKELY_THRESHOLD = 70;

    const standingsSortConfig = {
        Rk: { type: 'number' },
        team_name: { type: 'text' },
        Current: { type: 'record' },
        W: { type: 'number' },
        L: { type: 'number' },
        SRS: { type: 'number' },
        Playoffs: { type: 'percent' },
        'W/L%': { type: 'percent' },
        Remain: { type: 'record' },
        Best: { type: 'record' },
        Worst: { type: 'record' },
        Division: { type: 'percent' },
        seed_1: { type: 'percent' },
        seed_2: { type: 'percent' },
        seed_3: { type: 'percent' },
        seed_4: { type: 'percent' },
        seed_5: { type: 'percent' },
        seed_6: { type: 'percent' },
        seed_7: { type: 'percent' },
        seed_8: { type: 'percent' },
        seed_9: { type: 'percent' },
        seed_10: { type: 'percent' },
        '1-6': { type: 'percent' },
        '7': { type: 'percent' },
        '8': { type: 'percent' },
        '9': { type: 'percent' },
        '10': { type: 'percent' },
        Out: { type: 'percent' },
        'Win Conf': { type: 'percent' },
        'Win Finals': { type: 'percent' },
        'Lottery%': { type: 'percent' },
        ExpPick: { type: 'number' },
        conference: { type: 'text' }
    };

    const baseStandingsColumns = [
        { key: 'Rk', label: '#', alignClass: 'rk', dataType: 'number', format: 'integer' },
        { key: 'team_name', label: 'Team', alignClass: 'name', dataType: 'text', isTeam: true },
        { key: 'Current', label: 'Current', alignClass: 'rec', dataType: 'text' },
        { key: 'W', label: 'W', alignClass: 'num', dataType: 'number', format: 'decimal' },
        { key: 'L', label: 'L', alignClass: 'num', dataType: 'number', format: 'decimal' },
        { key: 'SRS', label: 'Projected Rating', alignClass: 'num', dataType: 'number', format: 'decimal', decimals: 2 },
        { key: 'Playoffs', label: 'Playoff%', alignClass: 'num', dataType: 'percent' },
        { key: 'Win Conf', label: 'Win Conf', alignClass: 'num', dataType: 'percent' },
        { key: 'Win Finals', label: 'Win Finals', alignClass: 'num', dataType: 'percent' },
        { key: 'Lottery%', label: 'Lotto%', alignClass: 'num', dataType: 'percent' },
        { key: 'ExpPick', label: 'E[Pick]', alignClass: 'num', dataType: 'number', format: 'decimal' }
    ];

    const expandedStandingsColumns = [
        { key: 'W/L%', label: 'W/L%', alignClass: 'num', dataType: 'percent' },
        { key: 'Remain', label: 'Remain', alignClass: 'rec', dataType: 'text' },
        { key: 'Best', label: 'Best', alignClass: 'rec', dataType: 'text' },
        { key: 'Worst', label: 'Worst', alignClass: 'rec', dataType: 'text' },
        { key: 'Division', label: 'Division', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_1', label: '1', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_2', label: '2', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_3', label: '3', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_4', label: '4', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_5', label: '5', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_6', label: '6', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_7', label: '7', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_8', label: '8', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_9', label: '9', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_10', label: '10', alignClass: 'num', dataType: 'percent' },
        { key: '1-6', label: '1-6', alignClass: 'num', dataType: 'percent' },
        { key: '7', label: '7', alignClass: 'num', dataType: 'percent' },
        { key: '8', label: '8', alignClass: 'num', dataType: 'percent' },
        { key: '9', label: '9', alignClass: 'num', dataType: 'percent' },
        { key: '10', label: '10', alignClass: 'num', dataType: 'percent' },
        { key: 'Out', label: 'Out', alignClass: 'num', dataType: 'percent' },
        { key: 'conference', label: 'Conference', alignClass: 'name', dataType: 'conference' }
    ];

    const visibleStandingsColumns = $derived.by(() =>
        showExpandedStandings ? [...baseStandingsColumns, ...expandedStandingsColumns] : [...baseStandingsColumns]
    );

    const standings = $derived(
        conference === 'East' ? (data.eastStandings || []) : (data.westStandings || [])
    );

    const filteredStandings = $derived.by(() => {
        const query = teamSearch.trim().toLowerCase();
        if (!query) return standings;
        return standings.filter((team) => {
            const fullName = String(team?.team_name || '').toLowerCase();
            const abbr = teamAbbr(team?.team_name).toLowerCase();
            return fullName.includes(query) || abbr.includes(query);
        });
    });

    const sortedStandings = $derived.by(() =>
        getSortedRows(filteredStandings, {
            sortColumn,
            sortDirection,
            sortConfigs: standingsSortConfig
        })
    );

    const summaryCards = $derived(buildSummaryCards(standings));
    const playoffDistribution = $derived(buildPlayoffDistribution(standings));
    const conferenceFavorites = $derived(
        standings
            .slice()
            .sort((a, b) => numberValue(b?.['Win Conf']) - numberValue(a?.['Win Conf']))
            .slice(0, 5)
    );
    const averageWins = $derived(formatFixed(average(standings.map((team) => numberValue(team?.W))), 1));
    const playoffLocks = $derived(standings.filter((team) => numberValue(team?.Playoffs) >= PLAYOFF_LOCK_THRESHOLD).length);
    const bubbleTeams = $derived(
        standings.filter((team) => {
            const playoffOdds = numberValue(team?.Playoffs);
            return playoffOdds > 0 && playoffOdds < PLAYOFF_LIKELY_THRESHOLD;
        }).length
    );

    function numberValue(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function average(values) {
        const finite = values.filter((value) => Number.isFinite(value));
        if (finite.length === 0) return 0;
        return finite.reduce((sum, value) => sum + value, 0) / finite.length;
    }

    function maxBy(rows, key) {
        return rows.reduce((best, row) => {
            if (!best) return row;
            return numberValue(row?.[key]) > numberValue(best?.[key]) ? row : best;
        }, null);
    }

    function formatSigned(value, decimals = 2) {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) return '—';
        return `${parsed >= 0 ? '+' : ''}${parsed.toFixed(decimals)}`;
    }

    function formatPercent(value) {
        const formatted = formatFixed(value, 1);
        return formatted === '—' ? formatted : `${formatted}%`;
    }

    function formatRecordProjection(team) {
        if (!team) return '—';
        return `${formatFixed(team.W, 1)}-${formatFixed(team.L, 1)}`;
    }

    function buildSummaryCards(rows) {
        const bestRecord = maxBy(rows, 'W');
        const finalsFavorite = maxBy(rows, 'Win Finals');
        const highestSrs = maxBy(rows, 'SRS');
        const topLottery = maxBy(rows, 'Lottery%');

        return [
            {
                title: 'Best Record Projection',
                team: bestRecord,
                value: formatRecordProjection(bestRecord),
                caption: 'Projected W-L'
            },
            {
                title: 'Top Finals Favorite',
                team: finalsFavorite,
                value: formatPercent(numberValue(finalsFavorite?.['Win Finals'])),
                caption: 'Win Finals'
            },
            {
                title: 'Highest SRS',
                team: highestSrs,
                value: formatSigned(numberValue(highestSrs?.SRS), 2),
                caption: 'Rating'
            },
            {
                title: 'Top Lottery Odds',
                team: topLottery,
                value: formatPercent(numberValue(topLottery?.['Lottery%'])),
                caption: 'Lotto Odds'
            },
            {
                title: 'Playoff Locks',
                value: String(rows.filter((team) => numberValue(team?.Playoffs) >= PLAYOFF_LOCK_THRESHOLD).length),
                caption: 'Teams',
                lock: true
            }
        ];
    }

    function buildPlayoffDistribution(rows) {
        const buckets = [
            { key: 'locks', label: 'Locks', count: rows.filter((team) => numberValue(team?.Playoffs) >= PLAYOFF_LOCK_THRESHOLD).length },
            {
                key: 'likely',
                label: 'Likely',
                count: rows.filter((team) => {
                    const odds = numberValue(team?.Playoffs);
                    return odds >= PLAYOFF_LIKELY_THRESHOLD && odds < PLAYOFF_LOCK_THRESHOLD;
                }).length
            },
            {
                key: 'bubble',
                label: 'Bubble',
                count: rows.filter((team) => {
                    const odds = numberValue(team?.Playoffs);
                    return odds > 0 && odds < PLAYOFF_LIKELY_THRESHOLD;
                }).length
            },
            { key: 'lottery', label: 'Lottery', count: rows.filter((team) => numberValue(team?.Playoffs) <= 0).length }
        ];
        const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);
        const total = Math.max(rows.length, 1);
        return buckets.map((bucket) => ({
            ...bucket,
            percent: (bucket.count / total) * 100,
            width: Math.max(4, (bucket.count / maxCount) * 100)
        }));
    }

    function formatConference(value) {
        if (value === 'East') return 'Eastern Conference';
        if (value === 'West') return 'Western Conference';
        return value || '—';
    }

    function formatCellValue(column, value) {
        if (column.dataType === 'conference') return formatConference(value);
        if (value === null || value === undefined || value === '') return '—';
        if (column.dataType === 'percent') return formatPercent(value);
        if (column.format === 'integer') return formatFixed(value, 0);
        if (column.format === 'decimal') return formatFixed(value, column.decimals ?? 1);
        return String(value);
    }

    function pctClass(value) {
        const n = Number.parseFloat(value);
        if (!Number.isFinite(n)) return '';
        if (n >= 80) return 'metric-positive';
        if (n >= 40) return 'metric-accent';
        if (n > 0) return 'metric-muted';
        return 'metric-muted';
    }

    function srsClass(value) {
        const n = Number.parseFloat(value);
        if (!Number.isFinite(n)) return '';
        return n >= 0 ? 'metric-positive metric-highlight-positive' : 'metric-negative metric-highlight-negative';
    }

    function getCellClass(column, value) {
        const classes = ['standings-cell', column.alignClass || 'num'];
        if (column.dataType === 'percent') classes.push('pct', pctClass(value));
        if (column.key === 'SRS') classes.push(srsClass(value));
        return classes.filter(Boolean).join(' ');
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
        sortDirection = column === 'Rk' || column === 'team_name' || column === 'Current' ? 'asc' : 'desc';
    }

    function exportStandingsCsv() {
        const columns = showExpandedStandings ? standingsExpandedCsvColumns : standingsCsvColumns;
        exportCsvRows({
            rows: sortedStandings,
            columns,
            filename: `${conference.toLowerCase()}-conference-standings.csv`
        });
    }

    function teamLogoUrl(teamName) {
        const id = teamId(teamName);
        return id ? `/api/img/logo/${id}` : null;
    }

    function hideBrokenImage(event) {
        event.currentTarget.hidden = true;
    }

    function barWidth(value, rows, key = 'Win Conf') {
        const max = Math.max(...rows.map((row) => numberValue(row?.[key])), 1);
        return Math.max(6, Math.min(100, (numberValue(value) / max) * 100));
    }
</script>

<svelte:head>
    <title>Standings — DARKO DPM</title>
</svelte:head>

<div class="standings-page">
    <div class="container standings-container">
        <section class="standings-hero" aria-labelledby="standings-title">
            <div class="standings-title-block">
                <div class="standings-icon" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div>
                    <h1 id="standings-title">Season Simulation</h1>
                    <p>Win projections, playoff odds, and championship probabilities from 10,000 simulations.</p>
                </div>
            </div>

            <div class="summary-card-grid" aria-label="Simulation leaders">
                {#each summaryCards as card (card.title)}
                    <article class="summary-card">
                        <div class="summary-media" aria-hidden="true">
                            {#if card.team && teamLogoUrl(card.team.team_name)}
                                <img src={teamLogoUrl(card.team.team_name)} alt="" loading="lazy" onerror={hideBrokenImage} />
                            {:else}
                                <span class="summary-lock"></span>
                            {/if}
                        </div>
                        <div class="summary-copy">
                            <p>{card.title}</p>
                            {#if card.team}
                                <a href="/standings/{encodeURIComponent(card.team.team_name)}">{card.team.team_name}</a>
                            {/if}
                            <strong>{card.value}</strong>
                            <small>{card.caption}</small>
                        </div>
                    </article>
                {/each}
            </div>
        </section>

        {#if standings.length === 0}
            <div class="empty-state">No standings data is currently available.</div>
        {:else}
            <div class="standings-workspace">
                <section class="standings-table-panel" aria-label="{conference} conference standings">
                    <div class="standings-controls">
                        <div class="conference-toggle" role="group" aria-label="Conference">
                            <button type="button" class:active={conference === 'East'} onclick={() => (conference = 'East')}>Eastern</button>
                            <button type="button" class:active={conference === 'West'} onclick={() => (conference = 'West')}>Western</button>
                        </div>

                        <div class="control-field control-field--search">
                            <div class="search-control">
                                <input
                                    id="team-search"
                                    type="search"
                                    value={teamSearch}
                                    oninput={(event) => (teamSearch = event.currentTarget.value)}
                                    placeholder="Search teams..."
                                    aria-label="Search teams"
                                />
                            </div>
                        </div>

                        <div class="view-toggle" role="group" aria-label="Standings view">
                            <button type="button" class:active={!showExpandedStandings} onclick={() => (showExpandedStandings = false)}>Standard</button>
                            <button type="button" class:active={showExpandedStandings} onclick={() => (showExpandedStandings = true)}>Detailed Odds</button>
                        </div>

                        <button
                            class="page-action-btn"
                            type="button"
                            onclick={exportStandingsCsv}
                            disabled={sortedStandings.length === 0}
                        >
                            Download CSV
                        </button>
                    </div>

                    <div class="table-scroll-region" class:scrollable={showExpandedStandings}>
                        <div class="table-wrapper {showExpandedStandings ? 'expanded' : ''}">
                            <table>
                                <thead>
                                    <tr>
                                        {#each visibleStandingsColumns as column (column.key)}
                                            <th
                                                class="{column.alignClass} {column.dataType === 'percent' ? 'pct' : ''} sortable {sortColumn === column.key ? 'active' : ''}"
                                                onclick={() => toggleSort(column.key)}
                                                aria-sort={sortColumn === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                                            >
                                                <span>{column.label}</span>
                                                <span class="sort-indicator">{sortGlyph(column.key)}</span>
                                            </th>
                                        {/each}
                                    </tr>
                                </thead>
                                <tbody>
                                    {#if sortedStandings.length === 0}
                                        <tr>
                                            <td class="empty-row" colspan={visibleStandingsColumns.length}>No matching teams.</td>
                                        </tr>
                                    {:else}
                                        {#each sortedStandings as team (team.team_name)}
                                            <tr>
                                                {#each visibleStandingsColumns as column (column.key)}
                                                    <td class={getCellClass(column, team?.[column.key])}>
                                                        {#if column.isTeam}
                                                            <a class="team-link" href="/standings/{encodeURIComponent(team.team_name)}">
                                                                <span class="team-mark">
                                                                    {#if teamLogoUrl(team.team_name)}
                                                                        <img src={teamLogoUrl(team.team_name)} alt="" loading="lazy" onerror={hideBrokenImage} />
                                                                    {/if}
                                                                </span>
                                                                <span>{team.team_name}</span>
                                                            </a>
                                                        {:else}
                                                            {formatCellValue(column, team?.[column.key])}
                                                        {/if}
                                                    </td>
                                                {/each}
                                            </tr>
                                        {/each}
                                    {/if}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <p class="standings-note">Results based on 10,000 season simulations.</p>
                </section>

                <aside class="standings-rail" aria-label="Simulation insights">
                    <section class="insight-card">
                        <div class="insight-card-header">
                            <h2>Playoff Odds Distribution</h2>
                            <span class="insight-info" title={`${conference}ern Conference`}>i</span>
                        </div>
                        <div class="odds-distribution">
                            {#each playoffDistribution as bucket (bucket.key)}
                                <div class="odds-row">
                                    <span>{bucket.label}</span>
                                    <div class="odds-bar" aria-hidden="true">
                                        <span style={`width: ${bucket.width}%`}></span>
                                    </div>
                                    <strong>{bucket.count} ({formatFixed(bucket.percent, 1)}%)</strong>
                                </div>
                            {/each}
                        </div>
                        <div class="rail-stat-grid">
                            <div>
                                <span>Avg Wins</span>
                                <strong>{averageWins}</strong>
                            </div>
                            <div>
                                <span>Playoff Locks</span>
                                <strong>{playoffLocks}</strong>
                            </div>
                            <div>
                                <span>Bubble Teams</span>
                                <strong>{bubbleTeams}</strong>
                            </div>
                            <div>
                                <span>Simulations</span>
                                <strong>10,000</strong>
                            </div>
                        </div>
                    </section>

                    <section class="insight-card">
                        <div class="insight-card-header">
                            <h2>Conference Favorites</h2>
                            <span>WIN CONF %</span>
                        </div>
                        <div class="favorite-list">
                            {#each conferenceFavorites as team, index (team.team_name)}
                                <a class="favorite-team" href="/standings/{encodeURIComponent(team.team_name)}">
                                    <span class="favorite-rank">{index + 1}</span>
                                    <span class="favorite-logo">
                                        {#if teamLogoUrl(team.team_name)}
                                            <img src={teamLogoUrl(team.team_name)} alt="" loading="lazy" onerror={hideBrokenImage} />
                                        {/if}
                                    </span>
                                    <span class="favorite-main">
                                        <span>{team.team_name}</span>
                                        <span class="favorite-bar">
                                            <span style={`width: ${barWidth(team['Win Conf'], conferenceFavorites)}%`}></span>
                                        </span>
                                    </span>
                                    <strong>{formatPercent(team['Win Conf'])}</strong>
                                </a>
                            {/each}
                        </div>
                        <a class="rail-link" href="/standings/{encodeURIComponent(conferenceFavorites[0]?.team_name || '')}">View full projections</a>
                    </section>
                </aside>
            </div>
        {/if}
    </div>
</div>

<style>
    .standings-page {
        min-height: calc(100dvh - var(--nav-sticky-offset));
        padding: 24px 0 34px;
        background:
            radial-gradient(circle at 92% 2%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 24rem),
            var(--bg);
    }

    .standings-container {
        display: grid;
        gap: 18px;
    }

    .standings-hero {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        background:
            radial-gradient(circle at 90% -8%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 24rem),
            var(--bg);
        box-shadow: 0 18px 48px color-mix(in srgb, var(--text) 10%, transparent);
        padding: 26px 28px 28px;
    }

    .standings-hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
            repeating-radial-gradient(circle at 72% 6%, transparent 0 34px, color-mix(in srgb, var(--border-subtle) 65%, transparent) 35px 36px);
        opacity: 0.42;
        pointer-events: none;
    }

    .standings-title-block,
    .summary-card-grid {
        position: relative;
        z-index: 1;
    }

    .standings-title-block {
        display: flex;
        align-items: center;
        gap: 18px;
        margin-bottom: 24px;
    }

    .standings-title-block > div:last-child {
        min-width: 0;
    }

    .standings-icon {
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

    .standings-icon span {
        display: block;
        width: 7px;
        border-radius: 999px;
        background: var(--accent);
    }

    .standings-icon span:nth-child(1) { height: 10px; opacity: 0.68; }
    .standings-icon span:nth-child(2) { height: 18px; opacity: 0.82; }
    .standings-icon span:nth-child(3) { height: 28px; }

    h1 {
        font-size: clamp(30px, 3vw, 44px);
        line-height: 0.98;
        letter-spacing: 0;
        color: var(--text);
        font-weight: 850;
    }

    .standings-title-block p {
        color: var(--text-secondary);
        font-size: 17px;
        margin-top: 8px;
        overflow-wrap: anywhere;
    }

    .summary-card-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
    }

    .summary-card {
        min-height: 120px;
        display: grid;
        grid-template-columns: 58px minmax(0, 1fr);
        align-items: center;
        gap: 12px;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--bg-surface) 88%, var(--bg));
        box-shadow: 0 10px 24px color-mix(in srgb, var(--text) 7%, transparent);
        padding: 14px 14px;
    }

    .summary-media {
        width: 54px;
        height: 54px;
        display: grid;
        place-items: center;
    }

    .summary-media img {
        max-width: 54px;
        max-height: 54px;
        object-fit: contain;
    }

    .summary-lock {
        width: 42px;
        height: 42px;
        display: block;
        border-radius: 50%;
        background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
        color: var(--accent);
        position: relative;
    }

    .summary-lock::before,
    .summary-lock::after {
        content: '';
        position: absolute;
        display: block;
    }

    .summary-lock::before {
        left: 12px;
        top: 8px;
        width: 18px;
        height: 15px;
        border: 2px solid currentColor;
        border-bottom: 0;
        border-radius: 10px 10px 0 0;
    }

    .summary-lock::after {
        left: 10px;
        top: 20px;
        width: 22px;
        height: 16px;
        border-radius: 2px;
        background: currentColor;
    }

    .summary-copy {
        min-width: 0;
    }

    .summary-copy p {
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 800;
        margin-bottom: 8px;
    }

    .summary-copy a {
        display: block;
        color: var(--text);
        font-weight: 850;
        font-size: 13px;
        line-height: 1.2;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .summary-copy strong {
        display: block;
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 23px;
        line-height: 1;
        margin-bottom: 6px;
    }

    .summary-copy small {
        color: var(--text-muted);
        font-weight: 700;
        font-size: 12px;
    }

    .standings-workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 350px;
        gap: 18px;
        align-items: start;
    }

    .standings-table-panel {
        min-width: 0;
        overflow-x: clip;
    }

    .standings-controls {
        display: grid;
        grid-template-columns: auto minmax(220px, 1fr) auto auto;
        gap: 10px;
        align-items: center;
        margin-bottom: 14px;
    }

    .conference-toggle,
    .view-toggle {
        display: inline-grid;
        grid-auto-flow: column;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        overflow: hidden;
        background: var(--bg-surface);
    }

    .view-toggle {
        grid-template-columns: repeat(2, minmax(126px, 1fr));
        min-width: 252px;
    }

    .conference-toggle button,
    .view-toggle button {
        min-height: 38px;
        border: none;
        background: transparent;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        font-size: 12px;
        font-weight: 800;
        padding: 0 20px;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 0.15s, color 0.15s;
    }

    .conference-toggle button.active,
    .view-toggle button.active {
        background: var(--accent);
        color: var(--bg);
    }

    .control-field--search {
        min-width: 220px;
    }

    .search-control {
        position: relative;
    }

    .search-control input {
        width: 100%;
        height: 38px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 13px;
        padding: 0 14px;
        outline: none;
    }

    .search-control input:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }

    .table-scroll-region {
        width: 100%;
    }

    .table-scroll-region.scrollable {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .table-wrapper {
        width: 100%;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        overflow: visible;
    }

    .table-scroll-region.scrollable .table-wrapper,
    .table-scroll-region.scrollable table {
        width: max-content;
        min-width: 100%;
    }

    table {
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
        width: 100%;
        min-width: 100%;
    }

    th {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 3;
        height: 44px;
        cursor: pointer;
        user-select: none;
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 850;
        letter-spacing: 0.04em;
        text-align: left;
        text-transform: uppercase;
        white-space: nowrap;
        padding: 0 11px;
    }

    th:hover {
        background: var(--bg-hover);
    }

    th.active {
        color: var(--text);
    }

    .table-scroll-region.scrollable th,
    .table-scroll-region.scrollable td.rk,
    .table-scroll-region.scrollable td.name,
    .table-scroll-region.scrollable th:nth-child(1),
    .table-scroll-region.scrollable th:nth-child(2) {
        position: static;
        left: auto;
        box-shadow: none;
    }

    th.num,
    th.rec,
    td.num,
    td.rec {
        text-align: right;
    }

    .sort-indicator {
        margin-left: 5px;
        color: var(--accent);
        opacity: 0.8;
        font-size: 10px;
    }

    td {
        border-bottom: 1px solid var(--border-subtle);
        color: var(--text);
        padding: 10px 11px;
        white-space: nowrap;
        background: var(--bg-surface);
    }

    tbody tr:last-child td {
        border-bottom: none;
    }

    tbody tr:hover td {
        background: var(--bg-elevated);
    }

    .rk,
    .num,
    .rec {
        font-family: var(--font-mono);
        font-weight: 700;
        font-size: 12px;
    }

    td.rk,
    th:nth-child(1) {
        position: sticky;
        left: 0;
        z-index: 4;
        min-width: 42px;
        width: 42px;
        text-align: right;
        background: var(--bg);
    }

    td.name,
    th:nth-child(2) {
        position: sticky;
        left: 42px;
        z-index: 4;
        min-width: 238px;
        background: var(--bg);
        box-shadow: 1px 0 0 var(--border-subtle);
    }

    td.name {
        background: var(--bg-surface);
    }

    tbody tr:hover td.rk,
    tbody tr:hover td.name {
        background: var(--bg-elevated);
    }

    .team-link {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        color: var(--text);
        font-weight: 850;
    }

    .team-link:hover {
        color: var(--accent);
    }

    .team-mark {
        width: 23px;
        height: 23px;
        display: inline-grid;
        place-items: center;
        border-radius: 50%;
        background: var(--bg-elevated);
        flex: 0 0 auto;
    }

    .team-mark img {
        width: 21px;
        height: 21px;
        object-fit: contain;
    }

    .metric-positive {
        color: var(--positive);
    }

    .metric-negative {
        color: var(--negative);
    }

    .metric-accent {
        color: var(--accent);
    }

    .metric-muted {
        color: var(--text-secondary);
    }

    td.metric-highlight-positive {
        background: color-mix(in srgb, var(--positive-bg) 82%, var(--bg-surface));
    }

    td.metric-highlight-negative {
        background: color-mix(in srgb, var(--negative-bg) 82%, var(--bg-surface));
    }

    tbody tr:hover td.metric-highlight-positive {
        background: color-mix(in srgb, var(--positive-bg) 70%, var(--bg-elevated));
    }

    tbody tr:hover td.metric-highlight-negative {
        background: color-mix(in srgb, var(--negative-bg) 70%, var(--bg-elevated));
    }

    .standings-note,
    .empty-row {
        color: var(--text-muted);
        font-size: 12px;
    }

    .standings-note {
        margin-top: 12px;
    }

    .empty-row {
        text-align: center;
        padding: 28px;
    }

    .standings-rail {
        display: grid;
        gap: 14px;
        position: sticky;
        top: calc(var(--nav-sticky-offset) + 18px);
        z-index: 5;
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
        margin-bottom: 16px;
    }

    .insight-card h2 {
        font-size: 15px;
        line-height: 1.1;
        font-weight: 850;
        letter-spacing: 0;
    }

    .insight-card-header > span,
    .insight-info {
        color: var(--text-secondary);
        font-size: 11px;
        font-family: var(--font-mono);
        font-weight: 800;
    }

    .insight-info {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: inline-grid;
        place-items: center;
        border: 1px solid var(--text-muted);
    }

    .odds-distribution {
        display: grid;
        gap: 14px;
        margin-bottom: 18px;
    }

    .odds-row {
        display: grid;
        grid-template-columns: 58px minmax(0, 1fr) 76px;
        align-items: center;
        gap: 12px;
        color: var(--text-secondary);
        font-size: 13px;
    }

    .odds-row strong {
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 12px;
        text-align: right;
    }

    .odds-bar {
        height: 20px;
        border-radius: 0;
        background: var(--bg-surface);
        overflow: hidden;
    }

    .odds-bar span {
        display: block;
        height: 100%;
        background: var(--accent);
    }

    .rail-stat-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
    }

    .rail-stat-grid div {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 9px 8px;
        background: color-mix(in srgb, var(--bg-surface) 45%, transparent);
        min-width: 0;
    }

    .rail-stat-grid span {
        display: block;
        color: var(--text-secondary);
        font-size: 11px;
        margin-bottom: 5px;
    }

    .rail-stat-grid strong {
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 16px;
    }

    .favorite-list {
        display: grid;
        gap: 13px;
        border-bottom: 1px solid var(--border);
        padding-bottom: 14px;
    }

    .favorite-team {
        display: grid;
        grid-template-columns: 22px 34px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        color: var(--text);
    }

    .favorite-team:hover {
        color: var(--accent);
    }

    .favorite-rank {
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-weight: 850;
    }

    .favorite-logo {
        width: 30px;
        height: 30px;
        display: inline-grid;
        place-items: center;
    }

    .favorite-logo img {
        max-width: 30px;
        max-height: 30px;
        object-fit: contain;
    }

    .favorite-main {
        display: grid;
        gap: 7px;
        min-width: 0;
        font-weight: 850;
        font-size: 13px;
    }

    .favorite-main > span:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .favorite-bar {
        display: block;
        height: 4px;
        background: var(--bg-surface);
    }

    .favorite-bar span {
        display: block;
        height: 100%;
        background: var(--accent);
    }

    .favorite-team strong {
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 14px;
    }

    .rail-link {
        display: inline-block;
        margin-top: 14px;
        color: var(--accent);
        font-weight: 850;
        font-size: 13px;
    }

    @media (max-width: 1180px) {
        .summary-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .standings-workspace {
            grid-template-columns: 1fr;
        }

        .standings-rail {
            position: static;
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (hover: hover) and (pointer: fine) and (max-width: 1460px) {
        .table-scroll-region:not(.scrollable) .table-wrapper th:nth-child(n + 10),
        .table-scroll-region:not(.scrollable) .table-wrapper td:nth-child(n + 10) {
            display: none;
        }
    }

    @media (hover: hover) and (pointer: fine) and (max-width: 1240px) {
        .table-scroll-region:not(.scrollable) .table-wrapper th:nth-child(n + 8),
        .table-scroll-region:not(.scrollable) .table-wrapper td:nth-child(n + 8) {
            display: none;
        }
    }

    /* Touch/mobile scroll mode */
    @media (hover: none) and (pointer: coarse) and (max-width: 1024px),
        (any-hover: none) and (any-pointer: coarse) and (max-width: 1024px) {
        .table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        table {
            width: max-content;
            min-width: 100%;
        }

        th {
            position: static;
        }

        td.rk,
        td.name,
        th:nth-child(1),
        th:nth-child(2) {
            position: static;
            left: auto;
            box-shadow: none;
        }
    }
    /* End touch/mobile scroll mode */

    @media (max-width: 820px) {
        .standings-page {
            padding-top: 14px;
        }

        .standings-hero {
            padding: 20px 16px;
        }

        .standings-title-block {
            align-items: flex-start;
        }

        .standings-icon {
            width: 54px;
            height: 54px;
            grid-template-columns: repeat(3, 6px);
            padding-bottom: 15px;
        }

        .standings-title-block p {
            font-size: 14px;
            line-height: 1.35;
        }

        .summary-card-grid,
        .standings-rail {
            grid-template-columns: 1fr;
        }

        .standings-controls {
            grid-template-columns: 1fr;
        }

        .conference-toggle,
        .view-toggle {
            width: 100%;
            grid-template-columns: repeat(2, 1fr);
            min-width: 0;
        }

        .control-field--search {
            min-width: 0;
        }

        .rail-stat-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>
