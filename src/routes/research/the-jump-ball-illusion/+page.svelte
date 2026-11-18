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
			title: 'Tip winners’ win rate by season',
			sub: 'Share of games won by the opening-tip winner, by season',
			caption:
				'The shaded band is where a season should land 95% of the time if the true edge were 52.8% every year. Five of 29 seasons fall outside it, where chance would give one or two, so the edge isn’t the same every year. Two seasons (2016-17 and 2024-25) dipped below a coin flip.'
		},
		quarters: {
			title: 'What the tip winner gains, quarter by quarter',
			sub: "Tip winner's average edge over the tip loser, by quarter",
			caption:
				'The tip winner gets an extra half possession in Q1, gives it back in Q2 and Q3, and gets it again in Q4. Points follow the same pattern, on top of the tip winner’s small edge in team quality.'
		},
		height: {
			title: 'Height and winning the tip',
			sub: 'How often a jumper wins the tip, by how many inches taller he is than the other jumper',
			caption:
				"Actual jump-ball participants from the league's play-by-play, 1997-98 to 2025-26. Four or more inches of height buys roughly a 63/37 edge."
		},
		jumpers: {
			title: 'Tip rate and height for every regular jumper',
			sub: 'Opening-tip win rate against height, players with 150 or more career opening jumps',
			caption:
				'137 players. Dot area shows how many opening jumps each took. Height matters, but it explains little of who is good at this (the correlation is roughly 0.2 to 0.3).'
		},
		scatter: {
			title: 'Tip rate and win rate by team-season',
			sub: '863 team-seasons: share of opening tips won against share of games won',
			caption:
				"Every regular-season team since 1997-98. The upward drift is real but loose. Ilgauskas’s 2002-03 Cavs won most of their tips and a fifth of their games. LeBron's 2017-18 Cavs lost four of every five tips and won 50 games."
		},
		placebo: {
			title: 'A tip from another game predicts tonight',
			sub: 'Win rate of teams that won or lost the named tip, regular season',
			caption:
				'A tip from a different game can’t cause tonight’s result, yet it carries 2.5 points of the 5.8-point gap, about 40% of it. That part of the gap is just who the team is. The rest needs another explanation, which the next sections look for.'
		},
		ladder: {
			title: 'The tip winner’s edge as controls are added',
			sub: "Home team's win rate after winning the tip minus after losing it, in points. Dot = estimate, line = 95% range",
			caption:
				'All six rows use the same 32,394 regular-season games, 1999-2000 to 2025-26. Hollow dots have a range that includes zero, so the leftover edge can’t be told apart from no edge at all. It doesn’t rule out an edge of up to about a point and a half.'
		},
		priced: {
			title: 'Tip winners against the betting market',
			sub: "Tip winners' win probability, 23,778 games with moneylines, 2006-07 to 2025-26",
			caption:
				'The market priced in 2.4 of the 2.8 points that tip winners won above a coin flip. The leftover 0.4 of a point has a 95% range of −0.2 to +1.0.'
		},
		iou: {
			title: 'The tip winner’s possession edge through the game',
			sub: "Tip winner's running edge in possessions, through the game",
			caption:
				'Through three quarters, tip winners lead by an average of just 0.24 points. By the final buzzer it is 0.84. The fourth-quarter possession isn’t a bonus. It evens out the possessions given up in the second and third quarters.'
		},
		ledger: {
			title: 'Where the five points go',
			sub: 'How much of the raw gap each added control removes, in points',
			caption: 'Home teams that won the tip against home teams that lost it, adding one control at a time.'
		}
	};

	const title = 'Does winning the tip matter?';
	const deck =
		'Teams that win the opening tip win 52.8% of their games. Most of that is who is playing. Once you account for the closing point spread, about half a point is left, too small to tell apart from zero.';
	const facts = [
		{ value: '<0.01', label: 'possessions the tip winner nets per game' },
		{ value: '0.65', label: 'points left of a 4.9-point gap after the closing spread' },
		{ value: '55.7%', label: 'of games won by the overtime tip winner' }
	];
	const toc = [
		{ id: 'the-five-point-gap', label: 'The five-point gap' },
		{ id: 'what-the-tip-actually-wins', label: 'What the tip wins' },
		{ id: 'winning-tips-is-a-skill', label: 'Winning tips is a skill' },
		{ id: 'good-teams-win-more-tips', label: 'Good teams win more tips' },
		{ id: 'who-takes-the-tip', label: 'Who takes the tip' },
		{ id: 'controlling-for-the-betting-line', label: 'The betting line' },
		{ id: 'close-games-and-overtime', label: 'Overtime' },
		{ id: 'where-the-five-points-go', label: 'Where the gap goes' }
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
	primaryAction={{ href: '#controlling-for-the-betting-line', label: 'Skip to the betting-line test' }}
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
