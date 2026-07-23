<script>
	import WowyStoryPage from '$lib/components/WowyStoryPage.svelte';
	import articleMarkdown from '$lib/content/wowy-season-adjusted.md?raw';
	import { renderArticleMarkdown } from '$lib/utils/renderArticleMarkdown.js';

	const articleHtml = renderArticleMarkdown(articleMarkdown);
	const facts = [
		{ value: '49', label: 'NBA seasons' },
		{ value: '21,128', label: 'player-seasons' },
		{ value: '1978–2026', label: 'one scoring procedure' }
	];
	const toc = [
		{ id: 'two-numbers-two-questions', label: 'Average vs. Adjusted' },
		{ id: 'why-not-just-average-the-daily-ratings', label: 'From daily to season ratings' },
		{ id: 'how-it-works-briefly', label: 'How the model works' },
		{ id: 'why-trust-it', label: 'Why trust it' },
		{ id: 'what-the-box-score-missed', label: 'WOWY vs. BPM' },
		{ id: 'what-the-model-cannot-know', label: 'What it cannot know' },
		{ id: 'how-to-read-the-site', label: 'How to read the site' }
	];
</script>

<svelte:head>
	<title>What Did Larry Bird Play Like in 1983? — DARKO</title>
	<meta
		name="description"
		content="How DARKO turned daily WOWY RAPM into season-by-season impact ratings from the 1977-78 NBA season onward."
	/>
	<meta property="og:title" content="What Did Larry Bird Play Like in 1983?" />
	<meta
		property="og:description"
		content="Season-by-season NBA impact ratings from 1977-78 onward."
	/>
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://www.darko.app/wowy/about" />
</svelte:head>

<WowyStoryPage
	kicker="Introducing Season-Adjusted WOWY"
	title="What Did Larry Bird Play Like in 1983?"
	deck="A season-by-season impact rating for every NBA player from 1977-78 onward, built from the daily WOWY model and the evidence of each completed season."
	published="Published July 17, 2026 · Updated July 23, 2026"
	{facts}
	primaryAction={{ href: '/wowy?rating=adjusted', label: 'Explore the ratings' }}
	{articleHtml}
	footerLead="Ready to compare eras?"
	footerLinks={[
		{ href: '/wowy?rating=adjusted', label: 'Open the Season-Adjusted WOWY leaderboard' }
	]}
	{toc}
/>
