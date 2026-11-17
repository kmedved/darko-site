<script>
	import WowyStoryPage from '$lib/components/WowyStoryPage.svelte';
	import PaddingProjectionChart from '$lib/components/research/PaddingProjectionChart.svelte';
	import PaddingTable from '$lib/components/research/PaddingTable.svelte';
	import articleMarkdown from '$lib/content/research/stabilization-rates-and-the-padding-approach.md?raw';
	import paddingData from '$lib/content/research/padding-data.json';
	import { PLAYER_STATS, TEAM_STATS } from '$lib/utils/paddingStats.js';
	import { renderArticleMarkdown } from '$lib/utils/renderArticleMarkdown.js';

	// The Markdown marks where each interactive piece goes with <!-- interactive:name -->.
	const pieces = articleMarkdown.split(/<!-- interactive:(\w+) -->/);
	const sections = pieces.map((piece, index) =>
		index % 2 ? { component: piece } : { html: renderArticleMarkdown(piece) }
	);

	const title = 'NBA Stabilization Rates and the Padding Approach';
	const deck =
		'When is a hot start real? Add a fixed amount of league-average performance to a player’s numbers. How much you add is the stabilization rate.';
	const facts = [
		{ value: '2', label: 'games of padding for minutes' },
		{ value: '263', label: 'attempts of padding for 3P%' },
		{ value: '10', label: 'games of padding for team margin' }
	];
	const toc = [
		{ id: 'when-is-a-hot-start-real', label: 'When is a hot start real?' },
		{ id: 'the-padding-method', label: 'The padding method' },
		{ id: 'padding-values-are-stabilization-rates', label: 'Padding values are stabilization rates' },
		{ id: 'the-numbers-for-players', label: 'The numbers for players' },
		{ id: 'the-numbers-for-teams', label: 'The numbers for teams' },
		{ id: 'other-ways-to-do-this', label: 'Other ways to do this' }
	];
	const robinsonPresets = [
		{ value: 0, label: 'No padding' },
		{ value: 240, label: '240 (2020 post)' },
		{ value: 260, label: '260 (updated)' },
		{ value: 1000, label: '1,000' }
	];
</script>

<svelte:head>
	<title>{title} — DARKO DPM</title>
	<meta name="description" content={deck} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={deck} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://www.darko.app/research/stabilization-rates-and-the-padding-approach" />
</svelte:head>

<WowyStoryPage
	kicker="Research"
	{title}
	{deck}
	published="August 6, 2020 · Updated November 17, 2026"
	{facts}
	primaryAction={{ href: '#the-numbers-for-players', label: 'Skip to the padding numbers' }}
	footerLead="More from DARKO"
	footerLinks={[
		{ href: '/research', label: 'All research' },
		{ href: '/research/early-season-strength-of-schedule', label: 'Early-season strength of schedule' }
	]}
	{toc}
>
	{#snippet body()}
		{#each sections as section, index (index)}
			{#if section.html !== undefined}
				{@html section.html}
			{:else if section.component === 'robinson'}
				<PaddingProjectionChart
					games={paddingData.robinson.games}
					leagueAvg={0.355}
					defaultPadding={240}
					presets={robinsonPresets}
				/>
			{:else if section.component === 'players'}
				<PaddingTable
					rows={paddingData.players}
					stats={PLAYER_STATS}
					kind="player"
					defaultStat="fg3_pct"
					defaultValue={50}
					defaultSample={34}
					caption="Seasons 2000-01 through 2025-26. The 2020 column is the original post's value."
					csvName="player-padding"
				/>
			{:else if section.component === 'teams'}
				<PaddingTable
					rows={paddingData.teams}
					stats={TEAM_STATS}
					kind="team"
					defaultStat="margin"
					defaultValue={10}
					defaultSample={10}
					caption="Seasons 2000-01 through 2025-26. Games are at 2025-26 rates."
					csvName="team-padding"
					defaultSort="games"
				/>
			{/if}
		{/each}
	{/snippet}
</WowyStoryPage>
