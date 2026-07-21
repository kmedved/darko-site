<script>
	import WowyStoryPage from '$lib/components/WowyStoryPage.svelte';
	import articleMarkdown from '$lib/content/wowy-timing-repair.md?raw';
	import { renderArticleMarkdown } from '$lib/utils/renderArticleMarkdown.js';

	const articleHtml = renderArticleMarkdown(articleMarkdown);
	const facts = [
		{ value: '9,374', label: 'game dates rebuilt' },
		{ value: '4.1M', label: 'state rows verified' },
		{ value: '21m 25s', label: 'clean-room rebuild' }
	];
	const toc = [
		{ id: 'proving-the-problem', label: 'Proving the problem' },
		{ id: 'rebuilding-the-input-honestly', label: 'Rebuilding the input' },
		{ id: 'how-much-did-the-ratings-move', label: 'How much changed' },
		{ id: 'rebuilding-everything-downstream', label: 'Rebuilding downstream' },
		{ id: 'why-publish-a-mistake', label: 'Why publish a mistake' }
	];
</script>

<svelte:head>
	<title>We Found Tomorrow in a Before-Game Rating — DARKO</title>
	<meta
		name="description"
		content="How DARKO found and repaired a future-information leak in causal Daily WOWY, then rebuilt and reproduced the ratings from raw inputs."
	/>
	<meta property="og:title" content="We Found Tomorrow in a Before-Game Rating" />
	<meta
		property="og:description"
		content="How a subtle timing mistake entered causal Daily WOWY, and how the ratings were rebuilt without it."
	/>
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://www.darko.app/wowy/timing" />
</svelte:head>

<WowyStoryPage
	kicker="Inside the model"
	title="We Found Tomorrow in a Before-Game Rating"
	deck="A subtle timing mistake made validation look better. Here is how I found it, repaired it, and rebuilt the ratings from the ground up."
	published="Published July 21, 2026"
	{facts}
	primaryAction={{ href: '/wowy', label: 'Explore WOWY RAPM' }}
	{articleHtml}
	footerLead="Keep exploring WOWY"
	footerLinks={[
		{ href: '/wowy', label: 'Open the WOWY leaderboard' },
		{ href: '/wowy/about', label: 'Read the Season-Adjusted WOWY story' }
	]}
	{toc}
/>
