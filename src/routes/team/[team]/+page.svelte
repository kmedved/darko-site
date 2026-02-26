<script>
    import { page } from '$app/stores';
    import { supabase } from '$lib/supabase.js';
    import { getActivePlayers } from '$lib/supabase.js';
    import { exportCsvRows, formatMinutes, formatSignedMetric, teamPlayersCsvColumns, standingsCsvColumns } from '$lib/utils/csvPresets.js';

    let team = $state('');
    let players = $state([]);
    let sim = $state(null);
    let loading = $state(true);
    let simLoading = $state(true);
    let error = $state(null);

    function dpmClass(val) {
        return parseFloat(val) >= 0 ? 'pos' : 'neg';
    }

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

    function exportTeamCsv() {
        exportCsvRows({
            rows: players,
            columns: teamPlayersCsvColumns,
            filename: `${team || 'team'}-players.csv`
        });
    }

    $effect(() => {
        const encodedTeam = $page.params.team || '';
        let decodedTeam = '';

        try {
            decodedTeam = decodeURIComponent(encodedTeam);
        } catch (err) {
            error = 'Invalid team in URL';
            loading = false;
            return;
        }

        team = decodedTeam;

        if (!decodedTeam) {
            error = 'Team not specified';
            loading = false;
            return;
        }

        error = null;
        loading = true;
        simLoading = true;

        getActivePlayers({ teamName: decodedTeam })
            .then((data) => {
                players = data;
                loading = false;
            })
            .catch((err) => {
                error = err.message;
                loading = false;
            });

        supabase
            .from('season_sim')
            .select('*')
            .eq('team_name', decodedTeam)
            .limit(1)
            .then(({ data, error: err }) => {
                if (data && data.length > 0) sim = data[0];
                simLoading = false;
            });
    });
</script>

<svelte:head>
    <title>{team ? `${team} — DARKO DPM` : 'Team — DARKO DPM'}</title>
</svelte:head>

<div class="container">
    <a class="back-link" href="/">← Back to leaderboard</a>

    <div class="page-header">
        <div class="page-header-toolbar">
            <div>
                <h1>{team || 'Team'}</h1>
                {#if sim}
                    <p>{sim.conference}ern Conference · Current: {sim.Current} · Projected: {fmt(sim.W)}-{fmt(sim.L)}</p>
                {:else}
                    <p>Current ratings for all active players on the team.</p>
                {/if}
            </div>
            <div class="page-header-actions">
                <button
                    class="page-action-btn"
                    type="button"
                    onclick={exportTeamCsv}
                    disabled={loading || players.length === 0}
                >
                    Download CSV
                </button>
            </div>
        </div>
    </div>

    {#if !simLoading && sim}
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">Playoff%</div>
                <div class="stat-value pct {pctClass(sim.Playoffs)}">{fmt(sim.Playoffs)}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Win Conf</div>
                <div class="stat-value pct {pctClass(sim['Win Conf'])}">{fmt(sim['Win Conf'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Win Finals</div>
                <div class="stat-value pct {pctClass(sim['Win Finals'])}">{fmt(sim['Win Finals'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">SRS</div>
                <div class="stat-value {parseFloat(sim.SRS) >= 0 ? 'srs-pos' : 'srs-neg'}">{fmt(sim.SRS, 2)}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Lottery%</div>
                <div class="stat-value pct {pctClass(sim['Lottery%'])}">{fmt(sim['Lottery%'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">E[Pick]</div>
                <div class="stat-value">{fmt(sim.ExpPick)}</div>
            </div>
        </div>
    {/if}

    {#if loading}
        <div class="loading">Loading team roster...</div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if players.length === 0}
        <div class="empty-state">No active players found for {team}.</div>
    {:else}
        <h2 class="section-title">Players</h2>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th class="name">Player</th>
                        <th class="pos-col">Pos</th>
                        <th class="num">Min</th>
                        <th class="num">DPM</th>
                        <th class="num">ODPM</th>
                        <th class="num">DDPM</th>
                        <th class="num">Box</th>
                    </tr>
                </thead>
                <tbody>
                    {#each players as player}
                        <tr>
                            <td class="name">
                                <a href={`/compare?ids=${player.nba_id}`}>{player.player_name}</a>
                            </td>
                            <td class="position">{player.position || '\u2014'}</td>
                            <td class="num">{formatMinutes(player.tr_minutes)}</td>
                            <td class="num {dpmClass(player.dpm)}">{formatSignedMetric(player.dpm)}</td>
                            <td class="num {dpmClass(player.o_dpm)}">{formatSignedMetric(player.o_dpm)}</td>
                            <td class="num {dpmClass(player.d_dpm)}">{formatSignedMetric(player.d_dpm)}</td>
                            <td class="num {dpmClass(player.box_dpm)}">{formatSignedMetric(player.box_dpm)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}

    {#if !simLoading && sim}
        <h2 class="section-title">Team Outlook</h2>
        <div class="outlook-img">
            <img
                src="/team_outlooks/{sim.team_name.replace(/ /g, '_')}_outlook.png"
                alt="{sim.team_name} outlook"
            />
        </div>
    {/if}
</div>

<style>
    .back-link {
        display: inline-block;
        margin: 10px 0 22px;
        font-size: 13px;
        color: var(--text-muted);
    }

    .back-link:hover {
        color: var(--accent);
    }

    /* --- Stats grid --- */
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

    .stat-value.pct.high { color: var(--positive); }
    .stat-value.pct.mid { color: var(--accent); }
    .stat-value.pct.low { color: var(--text-secondary); }
    .stat-value.pct.zero { color: var(--text-muted); }
    .stat-value.srs-pos { color: var(--positive); }
    .stat-value.srs-neg { color: var(--negative); }

    /* --- Section title --- */
    .section-title {
        font-size: 16px;
        font-weight: 600;
        margin: 8px 0 16px;
        letter-spacing: -0.01em;
    }

    /* --- Players table --- */
    .table-wrapper {
        margin-bottom: 32px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    }

    th {
        position: sticky;
        top: 210px;
        z-index: 20;
        background: var(--bg-surface);
        box-shadow: inset 0 -1px 0 var(--border);
        border-bottom: 1px solid var(--border);
        padding: 8px 12px;
        text-align: left;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        white-space: nowrap;
    }

    td {
        padding: 7px 12px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
    }

    tr:hover td {
        background: var(--bg-elevated);
    }

    .name {
        font-weight: 500;
    }

    .name a {
        color: var(--text);
    }

    .name a:hover {
        color: var(--accent);
    }

    .num {
        text-align: right;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 500;
    }

    th.num { text-align: right; }

    .position {
        color: var(--text-muted);
        width: 46px;
        font-size: 12px;
    }

    .pos {
        color: var(--positive);
    }

    .neg {
        color: var(--negative);
    }

    /* --- Outlook image --- */
    .outlook-img {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 16px;
        margin-bottom: 32px;
    }

    .outlook-img img {
        width: 100%;
        height: auto;
        border-radius: var(--radius-sm);
    }

    @media (max-width: 768px) {
        .stats-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media (max-width: 480px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 640px) {
        th, td { padding: 6px 8px; }
    }
</style>
