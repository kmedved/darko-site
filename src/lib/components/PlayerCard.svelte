<script>
    import DpmChart from './DpmChart.svelte';
    import { getPlayerHistory } from '$lib/supabase.js';

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
            getPlayerHistory(player.nba_id, 200)
                .then(data => { history = data; historyLoading = false; })
                .catch(() => { historyLoading = false; });
        }
    });

    function fmt(val, decimals = 1) {
        if (val === null || val === undefined) return '—';
        return parseFloat(val).toFixed(decimals);
    }

    function fmtDpm(val) {
        if (val === null || val === undefined) return '—';
        const n = parseFloat(val);
        return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
    }

    function fmtPct(val) {
        if (val === null || val === undefined) return '—';
        return (parseFloat(val) * 100).toFixed(1) + '%';
    }

    function fmtMin(seconds) {
        if (!seconds) return '—';
        return (seconds / 60).toFixed(1);
    }

    function cls(val) {
        return parseFloat(val) >= 0 ? 'pos' : 'neg';
    }
</script>

<div class="player-card">
    <!-- Header -->
    <div class="player-card-header">
        <div class="info">
            <h2>{player.player_name}</h2>
            <div class="sub">
                {player.team_name} · {player.position || '?'} · Age {fmt(player.age, 0)}
            </div>
        </div>
        <button class="remove-btn" onclick={onRemove} title="Remove">✕</button>
    </div>

    <!-- DPM Hero -->
    <div class="dpm-hero">
        <span class="number {cls(player.dpm)}">{fmtDpm(player.dpm)}</span>
        <span class="label">DPM</span>
    </div>

    <!-- Sparkline -->
    {#if !historyLoading && history.length > 10}
        <DpmChart
            data={history}
            color={parseFloat(player.dpm) >= 0 ? 'var(--positive)' : 'var(--negative)'}
            height={120}
        />
    {/if}

    <!-- DPM Breakdown -->
    <div class="stat-section">
        <div class="stat-section-title">DPM Breakdown</div>
        <div class="stat-row">
            <span class="label">Offense</span>
            <span class="value {cls(player.o_dpm)}">{fmtDpm(player.o_dpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Defense</span>
            <span class="value {cls(player.d_dpm)}">{fmtDpm(player.d_dpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Box Total</span>
            <span class="value {cls(player.box_dpm)}">{fmtDpm(player.box_dpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Box Off</span>
            <span class="value {cls(player.box_odpm)}">{fmtDpm(player.box_odpm)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Box Def</span>
            <span class="value {cls(player.box_ddpm)}">{fmtDpm(player.box_ddpm)}</span>
        </div>
    </div>

    <!-- Context -->
    <div class="stat-section">
        <div class="stat-section-title">Context</div>
        <div class="stat-row">
            <span class="label">Minutes</span>
            <span class="value">{fmtMin(player.tr_minutes)}</span>
        </div>
        <div class="stat-row">
            <span class="label">Career Games</span>
            <span class="value">{player.career_game_num ?? '—'}</span>
        </div>
        <div class="stat-row">
            <span class="label">3P% (trend)</span>
            <span class="value">{fmtPct(player.tr_fg3_pct)}</span>
        </div>
        <div class="stat-row">
            <span class="label">FT% (trend)</span>
            <span class="value">{fmtPct(player.tr_ft_pct)}</span>
        </div>
    </div>
</div>
