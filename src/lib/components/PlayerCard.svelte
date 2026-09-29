<script>
    import DpmChart from './DpmChart.svelte';
    import { apiPlayerHistory } from '$lib/api.js';
    import { createRequestSequencer } from '$lib/utils/requestSequencer.js';
    import { formatMinutes, formatSignedMetric, formatPercent, formatFixed } from '$lib/utils/csvPresets.js';
    import { staleRapmDate } from '$lib/utils/latestRapm.js';
    import { formatAsOfDate } from '$lib/utils/timeMachine.js';
    import { snapshotNote } from '$lib/utils/headToHead.js';

    // `color` is this player's series colour on the Compare page, so each card's sparkline matches
    // its player rather than turning green or red with the sign of their DPM.
    let { player, onRemove, historyRows, color = 'var(--accent)' } = $props();

    // RAPM older than the card's ratings (it hasn't come with each day's ratings since March)
    // says when it's from.
    const rapmFrom = $derived(staleRapmDate([player]));

    let history = $state([]);
    let historyLoading = $state(true);
    const historySeq = createRequestSequencer();

    $effect(() => {
        const reqId = historySeq.next();

        if (historyRows !== undefined) {
            history = Array.isArray(historyRows) ? historyRows : [];
            historyLoading = false;
            return;
        }

        if (!player?.nba_id) {
            history = [];
            historyLoading = false;
            return;
        }

        historyLoading = true;
        apiPlayerHistory(player.nba_id, { full: true })
            .then((data) => {
                if (!historySeq.isCurrent(reqId)) return;
                history = Array.isArray(data) ? data : [];
                historyLoading = false;
            })
            .catch(() => {
                if (!historySeq.isCurrent(reqId)) return;
                history = [];
                historyLoading = false;
            });

        return () => {
            historySeq.next();
        };
    });

    function fmt(val, decimals = 1) {
        return formatFixed(val, decimals);
    }

    // No projected minutes (some are published below zero) reads as not projected.
    function mpg(val) {
        const n = Number.parseFloat(val);
        return Number.isFinite(n) && n > 0 ? formatFixed(n, 1) : '—';
    }

    function cls(val) {
        const n = Number.parseFloat(val);
        if (!Number.isFinite(n)) return '';
        return n >= 0 ? 'pos' : 'neg';
    }

</script>

<div class="player-card">
    <!-- Header -->
    <div class="player-card-header">
        <div class="info">
            <h2>{player.player_name}</h2>
            <div class="sub">
                {[player.team_name, player.position || '?', Number.isFinite(Number.parseFloat(player.age)) ? `Age ${Math.floor(Number.parseFloat(player.age))}` : null].filter(Boolean).join(' · ')}
            </div>
            {#if snapshotNote(player)}<div class="sub as-of">{snapshotNote(player)}</div>{/if}
        </div>
        <button type="button" class="remove-btn" onclick={onRemove} title="Remove">✕</button>
    </div>

    <!-- DPM Hero -->
    <div class="dpm-hero">
        <span class="number {cls(player.dpm)}">{formatSignedMetric(player.dpm)}</span>
        <span class="label">DPM</span>
    </div>

    <!-- Sparkline -->
    {#if !historyLoading && history.length > 10}
        <DpmChart
            data={history}
            {color}
            height={120}
            playerName={player.player_name}
        />
    {/if}

    <!-- DPM Breakdown -->
    <div class="stat-section">
        <div class="stat-section-title">DPM Breakdown</div>
        <div class="stat-row">
            <span class="label">Offense</span>
            <span class="value {cls(player.o_dpm)}">{formatSignedMetric(player.o_dpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Defense</span>
            <span class="value {cls(player.d_dpm)}">{formatSignedMetric(player.d_dpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Box DPM</span>
            <span class="value {cls(player.box_dpm)}">{formatSignedMetric(player.box_dpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Box offense</span>
            <span class="value {cls(player.box_odpm)}">{formatSignedMetric(player.box_odpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Box defense</span>
            <span class="value {cls(player.box_ddpm)}">{formatSignedMetric(player.box_ddpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">On/Off DPM</span>
            <span class="value {cls(player.on_off_dpm)}">{formatSignedMetric(player.on_off_dpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">RAPM{#if rapmFrom}{' '}<span class="as-of">{formatAsOfDate(rapmFrom, { short: true })}</span>{/if}</span>
            <span class="value {cls(player.bayes_rapm_total)}">{formatSignedMetric(player.bayes_rapm_total)}</span>
        </div>
    </div>

    <!-- Context -->
    <div class="stat-section">
        <div class="stat-section-title">Context</div>
        <div class="stat-row">
            <span class="label">Minutes (trend)</span>
            <span class="value">{formatMinutes(player.tr_minutes)}</span>
        </div>
        <!-- Games played since 1996-97 from the season table, as profiles count them (the page's
             note says so); the rows' career_game_num counts model rows, not games. -->
        <div class="stat-row">
            <span class="label">Regular-season games</span>
            <span class="value">{player.games_regular == null ? '—' : Number(player.games_regular).toLocaleString('en-US')}</span>
        </div>
        <div class="stat-row">
            <span class="label">Playoff games</span>
            <span class="value">{player.games_playoffs == null ? '—' : Number(player.games_playoffs).toLocaleString('en-US')}</span>
        </div>
        <div class="stat-row">
            <span class="label">3P% (trend)</span>
            <span class="value">{formatPercent(player.tr_fg3_pct)}</span>
        </div>
        <div class="stat-row">
            <span class="label">FT% (trend)</span>
            <span class="value">{formatPercent(player.tr_ft_pct)}</span>
        </div>
        <div class="stat-row">
            <span class="label">MPG</span>
            <span class="value">{mpg(player.x_minutes)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Pace</span>
            <span class="value">{fmt(player.x_pace, 1)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Pts per 100</span>
            <span class="value">{fmt(player.x_pts_100, 1)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Ast per 100</span>
            <span class="value">{fmt(player.x_ast_100, 1)}</span>
        </div>
        <div class="stat-row">
            <span class="label">FG%</span>
            <span class="value">{formatPercent(player.x_fg_pct)}</span>
        </div>
    </div>
</div>

<style>
    .as-of {
        font-weight: 400;
        color: var(--text-muted);
        font-size: 0.85em;
    }
</style>
