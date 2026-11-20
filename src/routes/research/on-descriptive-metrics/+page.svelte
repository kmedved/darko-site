<script>
	import WowyStoryPage from '$lib/components/WowyStoryPage.svelte';
	import DescriptiveSpectrumFigure from '$lib/components/research/DescriptiveSpectrumFigure.svelte';
	import articleMarkdown from '$lib/content/research/on-descriptive-metrics.md?raw';
	import { renderArticleMarkdown } from '$lib/utils/renderArticleMarkdown.js';

	const pieces = articleMarkdown.split(/<!-- interactive:(\w+) -->/);
	const sections = pieces.map((piece, index) =>
		index % 2 ? { figure: piece } : { html: renderArticleMarkdown(piece) }
	);

	const title = 'On Descriptive Metrics';
	const deck =
		'Why there is no single-season DARKO, and why every attempt to build a purely descriptive MVP stat quietly turns into a predictive model.';
	const facts = [
		{ value: '74.5% vs. 81.7%', label: '2025-26 opponent FT% for SGA vs. Cade Cunningham' },
		{ value: '81.5 pts', label: 'raw scoreboard swing from those uncontested free throws' },
		{ value: 'No umpire', label: 'unlike forecasting, descriptive value has no ground truth' }
	];
	const toc = [
		{ id: 'the-neat-split', label: 'The neat split' },
		{ id: 'the-baseball-rabbit-hole', label: 'The baseball rabbit hole' },
		{ id: 'your-descriptive-stat-is-already-predicting', label: 'Already predicting' },
		{ id: 'the-clutch-and-leverage-trap', label: 'Clutch and leverage' },
		{ id: 'the-missing-north-star', label: 'The missing north star' },
		{ id: 'meaning-requires-a-model', label: 'Meaning requires a model' }
	];
</script>

<svelte:head>
	<title>{title} — DARKO DPM</title>
	<meta name="description" content={deck} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={deck} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://www.darko.app/research/on-descriptive-metrics" />
</svelte:head>

<WowyStoryPage
	kicker="Research · Work in progress"
	{title}
	{deck}
	published="November 20, 2026 · Stray ruminations"
	{facts}
	primaryAction={{ href: '#your-descriptive-stat-is-already-predicting', label: 'Skip to the basketball examples' }}
	footerLead="More from DARKO"
	footerLinks={[
		{ href: '/research', label: 'All research' },
		{ href: '/research/practice-vs-game-free-throws', label: 'Practice vs. game free throws' },
		{ href: '/research/stabilization-rates-and-the-padding-approach', label: 'Stabilization rates and padding' }
	]}
	{toc}
>
	{#snippet body()}
		{#each sections as section, index (index)}
			{#if section.html !== undefined}
				{@html section.html}
			{:else if section.figure === 'spectrum'}
				<DescriptiveSpectrumFigure />
			{/if}
		{/each}
	{/snippet}
</WowyStoryPage>
