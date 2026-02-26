<script>
    import TeamDetailView from '$lib/components/TeamDetailView.svelte';
    import { page } from '$app/stores';
    import { normalizeTeamSlug } from '$lib/utils/teamRouteUtils.js';

    const teamName = $derived(normalizeTeamSlug($page.params.slug || ''));
</script>

<svelte:head>
    <title>{teamName ? `${teamName} — DARKO DPM` : 'Team — DARKO DPM'}</title>
</svelte:head>

<TeamDetailView teamName={teamName} backHref="/standings" backLabel="← Back to Standings" />
