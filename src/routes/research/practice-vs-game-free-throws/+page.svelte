<script>
	import WowyStoryPage from '$lib/components/WowyStoryPage.svelte';
	import FreeThrowBarChart from '$lib/components/research/FreeThrowBarChart.svelte';
	import FreeThrowLakersChart from '$lib/components/research/FreeThrowLakersChart.svelte';
	import FreeThrowSummaryChart from '$lib/components/research/FreeThrowSummaryChart.svelte';
	import articleMarkdown from '$lib/content/research/practice-vs-game-free-throws.md?raw';
	import freeThrowData from '$lib/content/research/free-throw-data.json';
	import { renderArticleMarkdown } from '$lib/utils/renderArticleMarkdown.js';
	import { count, signed } from '$lib/utils/freeThrowCharts.js';

	// The Markdown marks where each figure goes with <!-- interactive:name -->.
	// Markers without a figure below render as nothing.
	const pieces = articleMarkdown.split(/<!-- interactive:(\w+) -->/);
	const sections = pieces.map((piece, index) =>
		index % 2 ? { figure: piece } : { html: renderArticleMarkdown(piece) }
	);

	const title = 'Why are NBA players so much worse at free throws in games?';
	const deck =
		'The 2013 Lakers made 89% of their free throws in practice and 69% in games. I went through about 1.76 million game free throws to see what explains the gap, e.g., fatigue, pressure, the crowd, or rhythm.';
	const facts = [
		{ value: '89% vs. 69%', label: 'the 2013 Lakers in practice and in games' },
		{ value: '+4.6', label: 'points on the second of two free throws, against the first' },
		{ value: '-3.7', label: 'points in the last 10 seconds of a one-point game' }
	];
	const { warmup, rhythm, summary } = freeThrowData;
	const minutes = (bucket) => `${bucket} ${bucket === '0-1' ? 'minute' : 'minutes'}`;
	const warmupBars = warmup.buckets.map((d) => ({
		...d,
		key: d.bucket,
		label: d.bucket,
		value: d.gap,
		aria: `${minutes(d.bucket)}: ${signed(d.gap)} points, ${d.pct.toFixed(1)}% against ${warmup.baseline.toFixed(1)}%, ${count(d.n)} free throws`
	}));
	const rhythmBars = rhythm.positions.map((d) => ({
		...d,
		key: d.position,
		label: d.position,
		value: d.gap,
		aria: `${d.position} free throw in a row: ${signed(d.gap)} points, ${count(d.n)} free throws`
	}));
	const tripled = summary.league + summary.practice;
	const practiceRow = {
		label: 'Practice (if the odds triple)',
		effect: summary.practice,
		aria: `Practice, if the odds triple: ${signed(summary.practice)} points`,
		tip: `${signed(summary.practice)} points: the average game free throw (${summary.league.toFixed(1)}%) with its odds tripled is ${tripled.toFixed(1)}%`
	};

	const toc = [
		{ id: 'the-lakers-board', label: 'The Lakers board' },
		{ id: 'what-could-explain-it', label: 'What could explain it?' },
		{ id: 'rhythm', label: 'Rhythm' },
		{ id: 'everything-else', label: 'Everything else' },
		{ id: 'icing-and-the-free-chicken', label: 'Icing and free chicken' },
		{ id: 'the-g-league', label: 'The G League' },
		{ id: 'adding-it-up', label: 'Adding it up' },
		{ id: 'is-any-of-this-a-skill', label: 'Is it a skill?' }
	];
</script>

<svelte:head>
	<title>{title} | DARKO DPM</title>
	<meta name="description" content={deck} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={deck} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://www.darko.app/research/practice-vs-game-free-throws" />
</svelte:head>

<WowyStoryPage
	kicker="Research"
	{title}
	{deck}
	published="November 20, 2026"
	{facts}
	primaryAction={{ href: '#adding-it-up', label: 'Skip to adding it up' }}
	footerLead="More from DARKO"
	footerLinks={[
		{ href: '/research', label: 'All research' },
		{ href: '/research/stabilization-rates-and-the-padding-approach', label: 'Stabilization rates and padding' }
	]}
	{toc}
>
	{#snippet body()}
		{#each sections as section, index (index)}
			{#if section.html !== undefined}
				{@html section.html}
			{:else if section.figure === 'lakers'}
				<FreeThrowLakersChart
					rows={freeThrowData.lakers}
					title="Every Laker was better in practice"
					caption="Practice free throws through the 2013 All-Star break, from the board above, against each player's DARKO free-throw projection at the time. The tick is what dividing practice odds by three would predict."
				/>
			{:else if section.figure === 'rhythm'}
				<FreeThrowBarChart
					bars={rhythmBars}
					title="The second free throw is the jump, and it levels off after that"
					caption="Free throws taken back to back by the same player, compared with the first one in the run, same player and season. 1996-97 through 2024-25."
					axisTitle="Free throw in a row"
					ariaLabel="Bar chart. Each free throw in an unbroken run compared with the first one: {rhythmBars
						.map((d) => `${d.label}, ${signed(d.value)} points`)
						.join('; ')}."
				>
					{#snippet tip(d)}
						<b>{d.position} free throw in a row</b><br />
						<b>{signed(d.gap)}</b> points against the first one<br />
						{count(d.n)} free throws
					{/snippet}
				</FreeThrowBarChart>
			{:else if section.figure === 'warmup'}
				<FreeThrowBarChart
					bars={warmupBars}
					title="One free throw warms you up, and it wears off in about half an hour"
					caption="First shot of a trip, compared with the same player's first trip of the game that season (71.4%), by real minutes since their previous free throw. 1996-97 through 2018-19."
					axisTitle="Minutes since the player's last free throw"
					refLine={{ value: warmup.secondShotBump, label: 'second shot of the same trip' }}
					ariaLabel="Bar chart. First shot of a trip compared with the player's first trip of the game, by minutes since his previous free throw: {warmupBars
						.map((d) => `${minutes(d.bucket)}, ${signed(d.value)} points`)
						.join('; ')}. The second shot of the same trip is {signed(warmup.secondShotBump)} points."
				>
					{#snippet tip(d)}
						<b>{minutes(d.bucket)}</b> since the last free throw<br />
						<b>{signed(d.gap)}</b> points: {d.pct.toFixed(1)}% against {warmup.baseline.toFixed(1)}% on the first trip<br />
						{count(d.n)} free throws
					{/snippet}
				</FreeThrowBarChart>
			{:else if section.figure === 'summary'}
				<FreeThrowSummaryChart
					rows={summary.rows}
					practice={practiceRow}
					title="Everything inside a game is small next to practice"
					caption="How much better or worse players shoot in each situation, in percentage points, with all of them estimated together and each player compared with their own season. The top bar is what tripling the odds of the average game free throw (75.8%) would add."
				/>
			{/if}
		{/each}
	{/snippet}
</WowyStoryPage>

<style>
	:global(.story-body figure.story-photo) {
		max-width: 630px;
		margin: 28px 0 34px;
	}

	:global(.story-body figure.story-photo p) {
		margin: 0;
	}

	:global(.story-body figure.story-photo img) {
		width: 100%;
		margin: 0;
	}

	:global(.story-body figure.story-photo figcaption) {
		margin-top: 8px;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 1.5;
	}
</style>
