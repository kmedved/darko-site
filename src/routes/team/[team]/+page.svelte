<script>
    import TeamDetailView from '$lib/components/TeamDetailView.svelte';
    import { page } from '$app/stores';
    import { decodeTeamParam } from '$lib/utils/teamRouteUtils.js';

    const teamName = $derived(decodeTeamParam($page.params.team || ''));
</script>

<svelte:head>
    <title>{teamName ? `${teamName} — DARKO DPM` : 'Team — DARKO DPM'}</title>
</svelte:head>

<TeamDetailView teamName={teamName} backHref="/" backLabel="← Back to leaderboard" />
