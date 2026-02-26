<script>
    import { page } from '$app/stores';
    import { supabase } from '$lib/supabase.js';
    import WinDistChart from '$lib/components/WinDistChart.svelte';
    import SeedChart from '$lib/components/SeedChart.svelte';

    let team = $state(null);
    let winDist = $state([]);
    let loading = $state(true);

    $effect(() => {
        const slug = $page.params.slug;
        const teamName = slug.replace(/_/g, ' ');

        Promise.all([
            supabase.from('season_sim').select('*').eq('team_name', teamName).limit(1),
            supabase.from('win_distribution').select('*').eq('team_name', teamName).order('wins', { ascending: true }),
        ]).then(([simRes, distRes]) => {
            if (simRes.data && simRes.data.length > 0) team = simRes.data[0];
            if (distRes.data) winDist = distRes.data;
            loading = false;
        });
    });

    function fmt(val, d = 1) {
        if (val === null || val === undefined) return '—';
        return parseFloat(val).toFixed(d);
    }

    function currentWins(currentStr) {
        if (!currentStr) return 0;
        const parts = currentStr.split('-');
        return parseInt(parts[0]) || 0;
    }
</script>

<svelte:head>
    <title>{team ? team.team_name : 'Team'} — DARKO DPM</title>
</svelte:head>

<div class="container">
    {#if loading}
        <div class="loading">Loading...</div>
    {:else if team}
        <div class="page-header">
            <h1>{team.team_name}</h1>
            <p>{team.conference}ern Conference · Current: {team.Current} · Projected: {fmt(team.W)}-{fmt(team.L)}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">Playoff%</div>
                <div class="stat-value">{fmt(team.Playoffs)}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Win Conf</div>
                <div class="stat-value">{fmt(team['Win Conf'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Win Finals</div>
                <div class="stat-value">{fmt(team['Win Finals'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">SRS</div>
                <div class="stat-value">{fmt(team.SRS, 2)}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Lottery%</div>
                <div class="stat-value">{fmt(team['Lottery%'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">E[Pick]</div>
                <div class="stat-value">{fmt(team.ExpPick)}</div>
            </div>
        </div>

        {#if winDist.length > 0}
            <h2 class="section-title">Win Distribution</h2>
            <div class="chart-card">
                <WinDistChart data={winDist} meanWins={parseFloat(team.W)} currentWins={currentWins(team.Current)} />
            </div>
        {/if}

        <h2 class="section-title">Seed Probabilities</h2>
        <div class="chart-card">
            <SeedChart {team} />
        </div>

        <div style="margin-top: 24px; margin-bottom: 40px;">
            <a href="/standings">← Back to Standings</a>
        </div>
    {:else}
        <div class="empty-state">Team not found.</div>
    {/if}
</div>

<style>
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 12px;
        margin-bottom: 28px;
    }

    .stat-box {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 14px 16px;
        text-align: center;
    }

    .stat-label {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        margin-bottom: 6px;
    }

    .stat-value {
        font-family: var(--font-mono);
        font-size: 20px;
        font-weight: 700;
        color: var(--text);
    }

    .section-title {
        font-size: 16px;
        font-weight: 600;
        margin: 28px 0 12px;
        letter-spacing: -0.01em;
    }

    .chart-card {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        margin-bottom: 8px;
    }

    @media (max-width: 768px) {
        .stats-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 480px) {
        .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
</style>
