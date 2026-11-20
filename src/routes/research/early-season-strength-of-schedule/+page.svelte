<script>
	import WowyStoryPage from '$lib/components/WowyStoryPage.svelte';
	import articleMarkdown from '$lib/content/research/early-season-strength-of-schedule.md?raw';
	import { renderArticleMarkdown } from '$lib/utils/renderArticleMarkdown.js';

	const articleHtml = renderArticleMarkdown(articleMarkdown);
	const title = 'In November, strength of schedule has stopped helping';
	const deck =
		'Ten games in, a point of schedule strength used to be worth about 0.7 of a point of margin. Since 2019-20 it has been worth about nothing.';
	const facts = [
		{ value: '0.7', label: 'a schedule point, 1994-95 to 2018-19' },
		{ value: 'About 0', label: 'a schedule point since 2019-20' },
		{ value: 'Game 20', label: 'when SRS works as well as ever' }
	];
	const toc = [
		{ id: 'the-test', label: 'The test' },
		{ id: 'noise-and-luck', label: 'Noise and luck' },
		{ id: 'when-the-schedule-makes-the-adjustment-wrong', label: 'Stacked schedules' },
		{ id: 'grading-each-season-against-its-own-schedule', label: 'Grading each season' },
		{ id: '2020-21-the-schedule-number-measured-nothing', label: '2020-21' },
		{ id: '2025-26-a-stacked-schedule-then-early-shooting', label: '2025-26' },
		{ id: 'what-else-i-checked', label: 'What else I checked' },
		{ id: 'what-to-do-about-it', label: 'What to do about it' }
	];
</script>

<svelte:head>
	<title>{title} — DARKO DPM</title>
	<meta name="description" content={deck} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={deck} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://www.darko.app/research/early-season-strength-of-schedule" />
</svelte:head>

<WowyStoryPage
	kicker="Research"
	{title}
	{deck}
	published="November 17, 2026 · This season's numbers through November 16"
	{facts}
	primaryAction={{ href: '#what-to-do-about-it', label: 'Skip to what to do about it' }}
	{articleHtml}
	footerLead="More from DARKO"
	footerLinks={[
		{ href: '/research', label: 'All research' },
		{ href: '/standings', label: 'Standings and projections' }
	]}
	{toc}
/>
