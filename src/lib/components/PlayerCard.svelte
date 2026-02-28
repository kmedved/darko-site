<script>
    import DpmChart from './DpmChart.svelte';
    import { apiPlayerHistory } from '$lib/api.js';
    import { createRequestSequencer } from '$lib/utils/requestSequencer.js';
    import { formatMinutes, formatSignedMetric, formatPercent, formatFixed } from '$lib/utils/csvPresets.js';

    let { player, onRemove, historyRows } = $props();

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
        // Card view keeps a small cap for quick rendering of the sparkline.
        apiPlayerHistory(player.nba_id, { limit: 200 })
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

    function cls(val) {
        const n = Number.parseFloat(val);
        if (!Number.isFinite(n)) return '';
        return n >= 0 ? 'pos' : 'neg';
    }

    function dpmColor(val) {
        const n = Number.parseFloat(val);
        if (!Number.isFinite(n)) return 'var(--text-muted)';
        return n >= 0 ? 'var(--positive)' : 'var(--negative)';
    }
</script>

<div class="player-card">
    <!-- Header -->
    <div class="player-card-header">
        <div class="info">
            <h2>{player.player_name}</h2>
            <div class="sub">
                {player.team_name} · {player.position || '?'} · Age {formatFixed(player.age, 0)}
            </div>
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
            color={dpmColor(player.dpm)}
            height={120}
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
            <span class="label">Box Total</span>
            <span class="value {cls(player.box_dpm)}">{formatSignedMetric(player.box_dpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Box Off</span>
            <span class="value {cls(player.box_odpm)}">{formatSignedMetric(player.box_odpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Box Def</span>
            <span class="value {cls(player.box_ddpm)}">{formatSignedMetric(player.box_ddpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">On/Off DPM</span>
            <span class="value {cls(player.on_off_dpm)}">{formatSignedMetric(player.on_off_dpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">RAPM</span>
            <span class="value {cls(player.bayes_rapm_total)}">{formatSignedMetric(player.bayes_rapm_total)}</span>
        </div>
    </div>

    <!-- Context -->
    <div class="stat-section">
        <div class="stat-section-title">Context</div>
        <div class="stat-row">
            <span class="label">Minutes</span>
            <span class="value">{formatMinutes(player.tr_minutes)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Career Games</span>
            <span class="value">{formatFixed(player.career_game_num, 0)}</span>
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
            <span class="value">{fmt(player.x_minutes, 1)}</span>
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
