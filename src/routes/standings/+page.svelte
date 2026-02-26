<script>
    import { supabase } from '$lib/supabase.js';
    import ConferenceChart from '$lib/components/ConferenceChart.svelte';

    let standings = $state([]);
    let conference = $state('East');
    let loading = $state(true);
    let error = $state(null);

    async function loadStandings() {
        loading = true;
        const { data, error: err } = await supabase
            .from('season_sim')
            .select('*')
            .eq('conference', conference)
            .order('Rk', { ascending: true });

        if (err) { error = err.message; loading = false; return; }
        standings = data;
        loading = false;
    }

    $effect(() => { loadStandings(); });

    function fmt(val, d = 1) {
        if (val === null || val === undefined) return '\u2014';
        return parseFloat(val).toFixed(d);
    }

    function pctClass(val) {
        const n = parseFloat(val);
        if (n >= 80) return 'high';
        if (n >= 40) return 'mid';
        if (n > 0) return 'low';
        return 'zero';
    }
</script>

<svelte:head>
    <title>Standings \u2014 DARKO DPM</title>
</svelte:head>

<div class="container">
    <div class="page-header">
        <h1>Season Simulation</h1>
        <p>Win projections, playoff odds, and championship probabilities from 10,000 simulations.</p>
    </div>

    <div class="conf-toggle">
        <button class:active={conference === 'East'} onclick={() => { conference = 'East'; loadStandings(); }}>Eastern</button>
        <button class:active={conference === 'West'} onclick={() => { conference = 'West'; loadStandings(); }}>Western</button>
    </div>

    {#if loading}
        <div class="loading">Loading standings...</div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else}
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th class="rk">#</th>
                        <th class="name">Team</th>
                        <th class="rec">Current</th>
                        <th class="num">W</th>
                        <th class="num">L</th>
                        <th class="num">SRS</th>
                        <th class="num pct">Playoff%</th>
                        <th class="num pct">Conf</th>
                        <th class="num pct">Finals</th>
                        <th class="num pct">Lotto%</th>
                        <th class="num">E[Pick]</th>
                    </tr>
                </thead>
                <tbody>
                    {#each standings as team}
                        <tr>
                            <td class="rk">{team.Rk}</td>
                            <td class="name">
                                <a href="/standings/{team.team_name.replace(/ /g, '_')}">{team.team_name}</a>
                            </td>
                            <td class="rec">{team.Current}</td>
                            <td class="num">{fmt(team.W)}</td>
                            <td class="num">{fmt(team.L)}</td>
                            <td class="num {parseFloat(team.SRS) >= 0 ? 'pos' : 'neg'}">{fmt(team.SRS, 2)}</td>
                            <td class="num pct {pctClass(team.Playoffs)}">{fmt(team.Playoffs)}</td>
                            <td class="num pct {pctClass(team['Win Conf'])}">{fmt(team['Win Conf'])}</td>
                            <td class="num pct {pctClass(team['Win Finals'])}">{fmt(team['Win Finals'])}</td>
                            <td class="num pct {pctClass(team['Lottery%'])}">{fmt(team['Lottery%'])}</td>
                            <td class="num">{fmt(team.ExpPick)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <h2 class="section-title">{conference}ern Conference Overview</h2>
        <div class="chart-card">
            <ConferenceChart {standings} {conference} />
        </div>
    {/if}
</div>

<style>
    .conf-toggle {
        display: flex;
        gap: 0;
        margin-bottom: 24px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        width: fit-content;
        overflow: hidden;
    }
    .conf-toggle button {
        padding: 8px 20px;
        background: var(--bg-elevated);
        border: none;
        color: var(--text-muted);
        font-family: var(--font-sans);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.12s;
    }
    .conf-toggle button:first-child {
        border-right: 1px solid var(--border);
    }
    .conf-toggle button.active {
        background: var(--accent);
        color: white;
    }
    .conf-toggle button:hover:not(.active) {
        background: var(--bg-hover);
    }

    .table-wrapper { overflow-x: auto; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { position: sticky; top: 52px; z-index: 10; }

    th {
        background: var(--bg-surface);
        border-bottom: 1px solid var(--border);
        padding: 8px 10px;
        text-align: left;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        white-space: nowrap;
    }

    td {
        padding: 7px 10px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
    }

    tr:hover td { background: var(--bg-elevated); }
    .rk { width: 32px; color: var(--text-muted); font-family: var(--font-mono); font-size: 11px; }
    .name { font-weight: 500; }
    .name a { color: var(--text); }
    .name a:hover { color: var(--accent); }
    .rec { color: var(--text-secondary); font-family: var(--font-mono); font-size: 12px; }
    .num { text-align: right; font-family: var(--font-mono); font-size: 12px; font-weight: 500; }
    th.num, th.pct { text-align: right; }
    .pos { color: var(--positive); }
    .neg { color: var(--negative); }
    .pct.high { color: var(--positive); }
    .pct.mid { color: var(--accent); }
    .pct.low { color: var(--text-secondary); }
    .pct.zero { color: var(--text-muted); }

    .section-title {
        font-size: 16px;
        font-weight: 600;
        margin: 32px 0 16px;
        letter-spacing: -0.01em;
    }

    .chart-card {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        margin-bottom: 40px;
    }

    @media (max-width: 640px) {
        th, td { padding: 6px 6px; }
    }
</style>
