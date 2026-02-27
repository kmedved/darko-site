<script>
    import DpmChart from './DpmChart.svelte';
    import { apiPlayerHistory } from '$lib/api.js';
    import { formatMinutes, formatSignedMetric, formatPercent, formatFixed } from '$lib/utils/csvPresets.js';

    let { player, onRemove, historyRows } = $props();

    let history = $state([]);
    let historyLoading = $state(true);

    $effect(() => {
        if (historyRows !== undefined) {
            history = Array.isArray(historyRows) ? historyRows : [];
            historyLoading = false;
            return;
        }

        if (player?.nba_id) {
            apiPlayerHistory(player.nba_id, { limit: 200 })
                .then(data => { history = data; historyLoading = false; })
                .catch(() => { historyLoading = false; });
        }
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
        <button class="remove-btn" onclick={onRemove} title="Remove">✕</button>
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
    </div>
</div>
