<script>
    import TeamDetailView from '$lib/components/TeamDetailView.svelte';

    let { data } = $props();
</script>

<svelte:head>
    <title>{data.teamName ? `${data.teamName} — DARKO DPM` : 'Team — DARKO DPM'}</title>
</svelte:head>

<TeamDetailView
    teamName={data.teamName}
    players={data.players}
    sim={data.sim}
    winDist={data.winDist}
    backHref="/standings"
    backLabel="← Back to Standings"
/>
