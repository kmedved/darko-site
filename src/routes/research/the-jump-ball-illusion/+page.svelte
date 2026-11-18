<script>
	import WowyStoryPage from '$lib/components/WowyStoryPage.svelte';
	import JumpBallFigure from '$lib/components/research/JumpBallFigure.svelte';
	import articleMarkdown from '$lib/content/research/the-jump-ball-illusion.md?raw';
	import jumpBallData from '$lib/content/research/jump-ball-data.json';
	import { renderArticleMarkdown } from '$lib/utils/renderArticleMarkdown.js';

	// The Markdown marks where each figure goes with <!-- interactive:name -->.
	const pieces = articleMarkdown.split(/<!-- interactive:(\w+) -->/);
	const sections = pieces.map((piece, index) =>
		index % 2 ? { figure: piece } : { html: renderArticleMarkdown(piece) }
	);

	const figures = {
		seasons: {
			title: 'The edge is small, and it moves',
			sub: 'Share of games won by the opening-tip winner, by season',
			caption:
				'The shaded band is where a season should land 95% of the time if the true edge were 52.8% every year. Five of 29 seasons fall outside it, where chance would give one or two, so the edge is not a fixed prize that every season pays out. Two seasons (2016-17 and 2024-25) dipped below a coin flip.'
		},
		quarters: {
			title: "The rulebook's fingerprint",
			sub: "Tip winner's average edge over the tip loser, by quarter",
			caption:
				'Possessions: the extra half-possession in Q1 is paid back in Q2 and Q3, and Q4 squares the account. Points follow the same seesaw, riding on top of the tip winner’s small overall quality edge.'
		},
		height: {
			title: 'Send the taller man',
			sub: 'How often a jumper wins the tip, by how many inches taller he is than the other jumper',
			caption:
				"Actual jump-ball participants from the league's play-by-play, 1997-98 to 2025-26. Four or more inches of height buys roughly a 63/37 edge."
		},
		jumpers: {
			title: 'Every regular jumper',
			sub: 'Opening-tip win rate against height, players with 150 or more career opening jumps',
			caption:
				'137 players. Dot area shows how many opening jumps each took. Height matters, but it explains little of who is good at this (the correlation is roughly 0.2 to 0.3).'
		},
		scatter: {
			title: 'Good at tips is not good at basketball',
			sub: '863 team-seasons: share of opening tips won against share of games won',
			caption:
				"Every regular-season team since 1997-98. The upward drift is real but loose. Big Z's 2002-03 Cavs owned center court and won a fifth of their games. LeBron's 2017-18 Cavs lost four of every five tips and won 50 games."
		},
		placebo: {
			title: 'A jump ball from another game predicts tonight',
			sub: 'Win rate of teams that won or lost the named tip, regular season',
			caption:
				'A tip from a different game cannot cause tonight’s result, yet it carries 2.5 points of the 5.8-point gap, about 40% of it. That part of the gap is identity: both tips are readings of the same thermometer. The rest needs another explanation, and the next tests go looking for it.'
		},
		ladder: {
			title: 'The incredible shrinking edge',
			sub: "Home team's win rate after winning the tip minus after losing it, in points. Dot = estimate, line = 95% range",
			caption:
				'All six rows use the same 32,394 regular-season games, 1999-2000 to 2025-26. Hollow dots have a range that includes zero, so the leftover edge cannot be told apart from no edge at all. It does not rule out an edge of up to about a point and a half.'
		},
		priced: {
			title: 'What the market already knew',
			sub: "Tip winners' win probability, 23,778 games with moneylines, 2006-07 to 2025-26",
			caption:
				'The market priced in 2.4 of the 2.8 points that tip winners won above a coin flip. The leftover 0.4 of a point has a 95% range of −0.2 to +1.0.'
		},
		iou: {
			title: 'The IOU',
			sub: "Tip winner's running edge in possessions, through the game",
			caption:
				'Through three quarters, tip winners lead by an average of just 0.24 points. By the final buzzer it is 0.84. The fourth-quarter possession is not a bonus. It is an IOU coming due.'
		},
		ledger: {
			title: 'The ledger',
			sub: 'How much of the raw gap each added control removes, in points',
			caption: 'Home teams that won the tip against home teams that lost it, adding one control at a time.'
		}
	};

	const title = 'The Jump Ball Illusion';
	const deck =
		'Teams that win the opening tip win 52.8% of their games. Almost all of that is who is playing. Count the closing point spread and what is left is about half a point, too small to tell apart from zero.';
	const facts = [
		{ value: '<0.01', label: 'possessions the tip winner nets per game' },
		{ value: '0.65', label: 'points left of a 4.9-point gap after the closing spread' },
		{ value: '55.7%', label: 'of games won by the overtime tip winner' }
	];
	const toc = [
		{ id: 'two-seconds-five-points', label: 'Two seconds, five points' },
		{ id: 'the-thing-being-won-is-nearly-worthless', label: 'The prize' },
		{ id: 'winning-tips-belongs-to-one-person', label: 'The skill' },
		{ id: 'the-tip-is-a-measurement-not-a-weapon', label: 'The illusion' },
		{ id: 'the-tip-takes-attendance', label: 'The roll call' },
		{ id: 'ask-the-bookmakers', label: 'The market test' },
		{ id: 'the-iou-and-the-one-jump-ball-worth-winning', label: 'Overtime' },
		{ id: 'where-the-five-points-go', label: 'The ledger' }
	];
</script>

<svelte:head>
	<title>{title} — DARKO DPM</title>
	<meta name="description" content={deck} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={deck} />
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://www.darko.app/research/the-jump-ball-illusion" />
</svelte:head>

<WowyStoryPage
	kicker="Research"
	{title}
	{deck}
	published="November 17, 2026"
	{facts}
	primaryAction={{ href: '#ask-the-bookmakers', label: 'Skip to the betting-line test' }}
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
			{:else if figures[section.figure]}
				<JumpBallFigure kind={section.figure} data={jumpBallData} {...figures[section.figure]} />
			{/if}
		{/each}
	{/snippet}
</WowyStoryPage>
