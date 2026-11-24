<script>
    import TeamDetailView from '$lib/components/TeamDetailView.svelte';

    let { data } = $props();
</script>

<svelte:head>
    <title>{data.teamName ? `${data.teamName} — DARKO DPM` : 'Team — DARKO DPM'}</title>
</svelte:head>

<!-- Readers reach a team page from Teams, Lineups, the leaderboard and Ask DARKO, so the way
     back names the one place that lists every team. -->
<TeamDetailView
    teamName={data.teamName}
    players={data.players}
    league={data.league}
    sim={data.sim}
    winDist={data.winDist}
    ratingsThrough={data.ratingsThrough}
    lineups={data.lineups}
    backHref="/teams"
    backLabel="← All teams"
/>
