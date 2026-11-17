<script>
	import WowyStoryPage from '$lib/components/WowyStoryPage.svelte';
	import articleMarkdown from '$lib/content/research/stabilization-rates-and-the-padding-approach.md?raw';
	import { renderArticleMarkdown } from '$lib/utils/renderArticleMarkdown.js';

	const articleHtml = renderArticleMarkdown(articleMarkdown);
	const title = 'NBA Stabilization Rates and the Padding Approach';
	const deck =
		'When does a hot start become real? Pad a player’s numbers with a fixed amount of league-average performance, and the padding tells you.';
	const facts = [
		{ value: '1.5', label: 'games of padding for minutes' },
		{ value: '242', label: 'attempts of padding for 3P%' },
		{ value: '1,007', label: 'possessions of padding for plus-minus' }
	];
	const toc = [
		{ id: 'stabilization-rates', label: 'Stabilization rates' },
		{ id: 'the-padding-method', label: 'The padding method' },
		{ id: 'padding-values-are-stabilization-rates', label: 'Padding values are stabilization rates' }
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
	published="August 6, 2020 · First published on kmedved.com"
	{facts}
	primaryAction={{ href: '#padding-values-are-stabilization-rates', label: 'Skip to the padding numbers' }}
	{articleHtml}
	footerLead="More from DARKO"
	footerLinks={[
		{ href: '/research', label: 'All research' },
		{ href: '/research/early-season-strength-of-schedule', label: 'Padding team ratings: early-season strength of schedule' }
	]}
	{toc}
/>
