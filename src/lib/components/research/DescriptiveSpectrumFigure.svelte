<script>
	import { getContext } from 'svelte';
	import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
	import { getSeriesColor } from '$lib/utils/chartTheme.js';

	let {
		title = 'The Descriptive-to-Predictive Spectrum',
		caption = 'Click any metric to inspect what it keeps from the scoreboard and what predictive machinery it quietly adds.'
	} = $props();

	const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
	const ledgerColor = $derived(getSeriesColor(0, displayMode.view));
	const vibesColor = $derived(getSeriesColor(1, displayMode.view));
	const predictiveColor = $derived(getSeriesColor(2, displayMode.view));

	const BASEBALL_NODES = [
		{ id: 'mlb_wl', name: 'W-L / RBIs', tag: 'Pure scoreboard', zone: 'ledger' },
		{ id: 'mlb_era', name: 'ERA', tag: 'Excuses errors', zone: 'vibes' },
		{ id: 'mlb_bwar', name: 'bWAR / RA9', tag: 'Models defense', zone: 'vibes' },
		{ id: 'mlb_fip', name: 'FIP / xFIP', tag: 'Expected runs', zone: 'vibes' },
		{ id: 'mlb_stuff', name: 'Stuff+ / Proj.', tag: 'True-talent model', zone: 'predictive' }
	];

	const BASKETBALL_NODES = [
		{ id: 'nba_pm', name: 'Raw +/-', tag: '"Wemby was +5"', zone: 'ledger' },
		{ id: 'nba_apm', name: '1-Yr APM', tag: 'OLS, no shrinkage', zone: 'vibes' },
		{ id: 'nba_rapm', name: '1-Yr RAPM', tag: 'LOOCV λ, prior = 0', zone: 'vibes' },
		{ id: 'nba_boxrapm', name: 'Box-Prior RAPM', tag: 'EPM / LEBRON', zone: 'vibes' },
		{ id: 'nba_darko', name: 'DARKO', tag: 'Decay + priors', zone: 'predictive' }
	];

	const DETAILS = {
		mlb_wl: {
			title: 'Pitcher Wins / RBIs / WPA',
			zone: 'ledger',
			zoneLabel: 'Pure Ledger',
			keeps:
				'Raw team wins, runners driven in, or exact win-probability swings from what actually happened on the field.',
			hidden: 'None: no counterfactuals, no shrinkage, no model of teammate or opponent quality.',
			catch:
				'Credit depends wildly on run support, bullpens, and whether teammates got on base ahead of you.'
		},
		mlb_era: {
			title: 'Earned Run Average (ERA)',
			zone: 'vibes',
			zoneLabel: 'Vibes Frontier',
			keeps: 'Actual runs scored against the pitcher, stripping out bullpen blowups and team offense.',
			hidden:
				'Already makes a causal judgment: pretends runs after official fielding errors never happened on the pitcher ledger.',
			catch:
				'Excuses a shortstop error, yet still punishes the pitcher for a slow fielder who never gets a glove on the ball.'
		},
		mlb_bwar: {
			title: 'bWAR / Defense-Adjusted RA9',
			zone: 'vibes',
			zoneLabel: 'Vibes Frontier',
			keeps: 'All runs actually allowed, including unearned runs, anchored to realized outcomes.',
			hidden:
				'Subtracts a modeled estimate of team fielding value (DRS or OAA) alongside park and opponent adjustments.',
			catch:
				'Still leaves the pitcher owning single-season batted-ball luck, and depends heavily on which fielding model you trust.'
		},
		mlb_fip: {
			title: 'FIP / xFIP',
			zone: 'vibes',
			zoneLabel: 'Vibes Frontier',
			keeps: 'Actual strikeouts, walks, hit batters, and home runs (or fly balls in xFIP).',
			hidden:
				'Replaces balls in play with league-average expected run outcomes, explicitly isolating what repeats out of sample.',
			catch:
				'Once you replace actual batted-ball results with expected run values, your "descriptive" stat has basically become a forecast.'
		},
		mlb_stuff: {
			title: 'Stuff+ / Projection Systems',
			zone: 'predictive',
			zoneLabel: 'Predictive',
			keeps: 'Velocity, movement, release point, and multi-year history weighted by predictive signal.',
			hidden:
				'Not hidden at all: every parameter is openly tuned to minimize out-of-sample forecasting error.',
			catch:
				'Great for knowing who is best tomorrow; does not care if a pitcher happened to strand 90% of baserunners this year.'
		},
		nba_pm: {
			title: 'Raw Plus-Minus',
			zone: 'ledger',
			zoneLabel: 'Pure Ledger',
			keeps: 'Exact scoreboard margin while a player was on the court ("last night Wemby was +5").',
			hidden: 'None: pure accounting of points scored and allowed during a player\'s minutes.',
			catch:
				'Tangles player impact with teammates, opponents, garbage time, and whether opponents shot 74.5% or 81.7% at the free-throw line.'
		},
		nba_apm: {
			title: 'Unregularized Single-Season APM',
			zone: 'vibes',
			zoneLabel: 'Vibes Frontier',
			keeps:
				'Only this season\'s stints, using ordinary least squares to control for the other nine players on the floor.',
			hidden:
				'Assumes additive linear player effects across lineups: still a causal model, just without regularization.',
			catch:
				'Multicollinearity explodes the estimates: in 2025-26, Oso Ighodaro and Hugo González jump into the top 10 ahead of Nikola Jokić.'
		},
		nba_rapm: {
			title: 'Single-Season RAPM',
			zone: 'vibes',
			zoneLabel: 'Vibes Frontier',
			keeps:
				'Only this season\'s stints and scoreboard margins, with no player-specific prior from prior years.',
			hidden:
				'Shrinks every player toward 0.0 using a ridge penalty λ chosen by cross-validation to predict held-out stints best.',
			catch:
				'Changing λ rewrites the leaderboard on identical games, and a zero prior treats Jokić like a rookie on Opening Night.'
		},
		nba_boxrapm: {
			title: 'Box-Prior Single-Season RAPM (EPM / LEBRON)',
			zone: 'vibes',
			zoneLabel: 'Vibes Frontier',
			keeps:
				'This season\'s box stats and on-court stints, keeping a "clean slate" for each player\'s own past seasons.',
			hidden:
				'Uses multi-year league history to learn box-score weights, filters garbage time, drops clutch leverage, and often luck-adjusts shooting.',
			catch:
				'Draws a purely cultural line: 10 years of league-wide history is fine, but a player\'s own prior-season rating is taboo.'
		},
		nba_darko: {
			title: 'DARKO',
			zone: 'predictive',
			zoneLabel: 'Predictive',
			keeps: 'Box scores, tracking, and lineup impact, weighted dynamically across multiple seasons.',
			hidden:
				'Explicitly predictive: Kalman filtering, time decay, aging curves, and priors all answer directly to out-of-sample error.',
			catch:
				'Has an objective umpire (future games), which is precisely why turning it into a "purely descriptive" MVP stat has no principled recipe.'
		}
	};

	let selectedId = $state('nba_rapm');
	const selected = $derived(DETAILS[selectedId] ?? DETAILS.nba_rapm);
</script>

<figure
	class="spectrum-figure"
	style:--zone-ledger={ledgerColor}
	style:--zone-vibes={vibesColor}
	style:--zone-predictive={predictiveColor}
>
	{#if title}
		<h3 class="spectrum-heading">{title}</h3>
	{/if}

	<div class="spectrum-stage">
		<div class="spectrum-zones-bg" aria-hidden="true">
			<div class="spectrum-bg-left"></div>
			<div class="spectrum-bg-mid"></div>
			<div class="spectrum-bg-right"></div>
		</div>

		<div class="spectrum-zone-headers">
			<div class="spectrum-zh spectrum-zh-left">
				<div class="spectrum-zh-kicker">Pure Ledger</div>
				<div class="spectrum-zh-sub">What actually happened</div>
			</div>
			<div class="spectrum-zh spectrum-zh-mid">
				<div class="spectrum-zh-kicker">The Vibes Frontier</div>
				<div class="spectrum-zh-sub">Adjusted for "enough" context; no objective stop sign</div>
			</div>
			<div class="spectrum-zh spectrum-zh-right">
				<div class="spectrum-zh-kicker">Predictive</div>
				<div class="spectrum-zh-sub">Optimized for future error</div>
			</div>
		</div>

		<div class="spectrum-era-strip" aria-label="Historical shift of what felt like enough context">
			<div class="spectrum-era-pill"><span>1970s: W-L</span></div>
			<div class="spectrum-era-pill"><span>1990s: ERA</span></div>
			<div class="spectrum-era-pill"><span>2010s: WAR / RAPM</span></div>
			<div class="spectrum-era-pill"><span>Today: Box-Prior / FIP</span></div>
			<div class="spectrum-era-arrow">shifting right →</div>
		</div>

		<div class="spectrum-tracks">
			<div class="spectrum-track">
				<div class="spectrum-track-header">
					<span class="spectrum-track-sport">Baseball</span>
					<span class="spectrum-track-hint">Team results → pitch-level talent</span>
				</div>
				<div class="spectrum-rail-grid" role="group" aria-label="Baseball metrics spectrum">
					{#each BASEBALL_NODES as node (node.id)}
						<button
							type="button"
							class="spectrum-node"
							class:is-active={selectedId === node.id}
							data-zone={node.zone}
							aria-pressed={selectedId === node.id}
							onclick={() => (selectedId = node.id)}
						>
							<span class="spectrum-node-name">{node.name}</span>
							<span class="spectrum-node-tag">{node.tag}</span>
						</button>
					{/each}
				</div>
			</div>

			<div class="spectrum-track">
				<div class="spectrum-track-header">
					<span class="spectrum-track-sport">Basketball</span>
					<span class="spectrum-track-hint">Raw +/- → multi-year DARKO</span>
				</div>
				<div class="spectrum-rail-grid" role="group" aria-label="Basketball metrics spectrum">
					{#each BASKETBALL_NODES as node (node.id)}
						<button
							type="button"
							class="spectrum-node"
							class:is-active={selectedId === node.id}
							data-zone={node.zone}
							aria-pressed={selectedId === node.id}
							onclick={() => (selectedId = node.id)}
						>
							<span class="spectrum-node-name">{node.name}</span>
							<span class="spectrum-node-tag">{node.tag}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<div class="spectrum-axis-foot">
			<span>← Zero causal claims</span>
			<span class="spectrum-axis-line" aria-hidden="true"></span>
			<span>More context stripped and priors added →</span>
		</div>
	</div>

	<div class="spectrum-inspector" aria-live="polite">
		<div class="spectrum-insp-top">
			<div class="spectrum-insp-title-group">
				<span class="spectrum-insp-title">{selected.title}</span>
				<span class="spectrum-insp-badge" data-zone={selected.zone}>{selected.zoneLabel}</span>
			</div>
			<span class="spectrum-insp-hint">Click any metric above to inspect</span>
		</div>
		<div class="spectrum-insp-grid">
			<div class="spectrum-insp-col">
				<div class="spectrum-insp-label">What it keeps</div>
				<div class="spectrum-insp-text">{selected.keeps}</div>
			</div>
			<div class="spectrum-insp-col">
				<div class="spectrum-insp-label">Hidden predictive step</div>
				<div class="spectrum-insp-text">{selected.hidden}</div>
			</div>
			<div class="spectrum-insp-col">
				<div class="spectrum-insp-label">Why the line breaks</div>
				<div class="spectrum-insp-text">{selected.catch}</div>
			</div>
		</div>
	</div>

	<div class="spectrum-umpire-bar">
		<div class="spectrum-ump-card" data-zone="ledger">
			<div class="spectrum-ump-kicker">Objective Ledger</div>
			<div class="spectrum-ump-body">
				<strong>Zero model, zero ambiguity.</strong> Exact record of the scoreboard, but poor at isolating who caused it.
			</div>
		</div>
		<div class="spectrum-ump-card" data-zone="vibes">
			<div class="spectrum-ump-kicker">No Objective Umpire</div>
			<div class="spectrum-ump-body">
				<strong>No ground truth to score against.</strong> Every stop is a cultural negotiation over how much noise to strip.
			</div>
		</div>
		<div class="spectrum-ump-card" data-zone="predictive">
			<div class="spectrum-ump-kicker">Objective Umpire</div>
			<div class="spectrum-ump-body">
				<strong>The future grades every knob.</strong> Decay, priors, and shrinkage stay only if they beat out-of-sample error.
			</div>
		</div>
	</div>

	{#if caption}
		<figcaption class="spectrum-caption">{caption}</figcaption>
	{/if}
</figure>

<style>
	.spectrum-figure {
		margin: 30px 0 36px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.spectrum-heading {
		margin: 0 0 2px;
		color: var(--text);
		font-size: 18px;
		font-weight: 700;
		line-height: 1.3;
	}

	.spectrum-stage {
		position: relative;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 16px;
		overflow: hidden;
	}

	.spectrum-zones-bg {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: calc(20% + 7px) 1fr calc(20% + 7px);
		pointer-events: none;
	}

	.spectrum-bg-left {
		background: color-mix(in srgb, var(--zone-ledger) 6%, transparent);
		border-right: 1px dashed color-mix(in srgb, var(--zone-vibes) 48%, var(--border));
	}

	.spectrum-bg-mid {
		background: color-mix(in srgb, var(--zone-vibes) 7%, transparent);
		border-right: 1px dashed color-mix(in srgb, var(--zone-vibes) 48%, var(--border));
	}

	.spectrum-bg-right {
		background: color-mix(in srgb, var(--zone-predictive) 6%, transparent);
	}

	.spectrum-zone-headers {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: calc(20% - 2px) 1fr calc(20% - 2px);
		margin-bottom: 14px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.spectrum-zh {
		padding: 0 6px;
	}

	.spectrum-zh-left {
		text-align: left;
		padding-left: 0;
	}

	.spectrum-zh-mid {
		text-align: center;
	}

	.spectrum-zh-right {
		text-align: right;
		padding-right: 0;
	}

	.spectrum-zh-kicker {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-bottom: 2px;
	}

	.spectrum-zh-left .spectrum-zh-kicker {
		color: var(--zone-ledger);
	}

	.spectrum-zh-mid .spectrum-zh-kicker {
		color: var(--zone-vibes);
	}

	.spectrum-zh-right .spectrum-zh-kicker {
		color: var(--zone-predictive);
	}

	.spectrum-zh-sub {
		font-size: 11px;
		color: var(--text-muted);
		line-height: 1.3;
	}

	.spectrum-era-strip {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 8px;
		align-items: center;
		margin-bottom: 12px;
	}

	.spectrum-era-pill {
		font-family: var(--font-mono);
		font-size: 11px;
		text-align: center;
		min-width: 0;
	}

	.spectrum-era-pill span {
		display: inline-block;
		padding: 2px 7px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--zone-vibes) 12%, var(--bg-surface));
		border: 1px solid color-mix(in srgb, var(--zone-vibes) 35%, var(--border));
		color: var(--text);
		white-space: nowrap;
	}

	.spectrum-era-arrow {
		text-align: center;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.spectrum-tracks {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.spectrum-track-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 8px;
	}

	.spectrum-track-sport {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.spectrum-track-hint {
		font-size: 11px;
		color: var(--text-muted);
	}

	.spectrum-rail-grid {
		position: relative;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 8px;
		align-items: stretch;
	}

	.spectrum-rail-grid::before {
		content: '';
		position: absolute;
		left: 6%;
		right: 6%;
		top: 50%;
		height: 2px;
		transform: translateY(-50%);
		background: linear-gradient(
			90deg,
			var(--zone-ledger) 0%,
			var(--zone-vibes) 50%,
			var(--zone-predictive) 100%
		);
		opacity: 0.45;
		z-index: 0;
	}

	.spectrum-node {
		position: relative;
		z-index: 1;
		appearance: none;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 10px 7px;
		text-align: center;
		cursor: pointer;
		color: var(--text);
		font-family: var(--font-sans);
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 3px;
		transition:
			border-color 140ms ease,
			transform 140ms ease,
			box-shadow 140ms ease,
			background-color 140ms ease;
	}

	.spectrum-node:hover {
		border-color: var(--accent);
		transform: translateY(-1px);
	}

	.spectrum-node:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.spectrum-node[data-zone='ledger'] {
		border-top: 2.5px solid var(--zone-ledger);
	}

	.spectrum-node[data-zone='vibes'] {
		border-top: 2.5px solid var(--zone-vibes);
	}

	.spectrum-node[data-zone='predictive'] {
		border-top: 2.5px solid var(--zone-predictive);
	}

	.spectrum-node.is-active[data-zone='ledger'] {
		background: color-mix(in srgb, var(--zone-ledger) 14%, var(--bg-surface));
		border-color: var(--zone-ledger);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--zone-ledger) 26%, transparent);
	}

	.spectrum-node.is-active[data-zone='vibes'] {
		background: color-mix(in srgb, var(--zone-vibes) 14%, var(--bg-surface));
		border-color: var(--zone-vibes);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--zone-vibes) 26%, transparent);
	}

	.spectrum-node.is-active[data-zone='predictive'] {
		background: color-mix(in srgb, var(--zone-predictive) 14%, var(--bg-surface));
		border-color: var(--zone-predictive);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--zone-predictive) 26%, transparent);
	}

	.spectrum-node-name {
		font-size: 12px;
		font-weight: 700;
		line-height: 1.25;
		color: var(--text);
	}

	.spectrum-node-tag {
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1.25;
		color: var(--text-muted);
	}

	.spectrum-axis-foot {
		position: relative;
		z-index: 1;
		margin-top: 16px;
		padding-top: 10px;
		border-top: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.spectrum-axis-line {
		flex: 1;
		height: 1px;
		background: linear-gradient(90deg, var(--zone-ledger), var(--zone-vibes), var(--zone-predictive));
		opacity: 0.5;
	}

	.spectrum-inspector {
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.spectrum-insp-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.spectrum-insp-title-group {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.spectrum-insp-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--text);
	}

	.spectrum-insp-badge {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 2px 8px;
		border-radius: 999px;
	}

	.spectrum-insp-badge[data-zone='ledger'] {
		background: color-mix(in srgb, var(--zone-ledger) 16%, transparent);
		color: var(--zone-ledger);
	}

	.spectrum-insp-badge[data-zone='vibes'] {
		background: color-mix(in srgb, var(--zone-vibes) 16%, transparent);
		color: var(--zone-vibes);
	}

	.spectrum-insp-badge[data-zone='predictive'] {
		background: color-mix(in srgb, var(--zone-predictive) 16%, transparent);
		color: var(--zone-predictive);
	}

	.spectrum-insp-hint {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.spectrum-insp-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
	}

	.spectrum-insp-col {
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 11px 12px;
	}

	.spectrum-insp-label {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: 5px;
	}

	.spectrum-insp-text {
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.spectrum-umpire-bar {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.spectrum-ump-card {
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 12px 14px;
	}

	.spectrum-ump-kicker {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		margin-bottom: 4px;
	}

	.spectrum-ump-card[data-zone='ledger'] .spectrum-ump-kicker {
		color: var(--zone-ledger);
	}

	.spectrum-ump-card[data-zone='vibes'] .spectrum-ump-kicker {
		color: var(--zone-vibes);
	}

	.spectrum-ump-card[data-zone='predictive'] .spectrum-ump-kicker {
		color: var(--zone-predictive);
	}

	.spectrum-ump-body {
		font-size: 12px;
		line-height: 1.48;
		color: var(--text-muted);
	}

	.spectrum-ump-body strong {
		color: var(--text);
		font-weight: 700;
	}

	.spectrum-caption {
		margin-top: 2px;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 1.5;
	}

	@media (max-width: 680px) {
		.spectrum-zones-bg,
		.spectrum-era-strip,
		.spectrum-rail-grid::before,
		.spectrum-axis-line {
			display: none;
		}

		.spectrum-zone-headers {
			grid-template-columns: 1fr;
			gap: 8px;
			text-align: left;
		}

		.spectrum-zh,
		.spectrum-zh-mid,
		.spectrum-zh-right {
			text-align: left;
			padding: 0;
		}

		.spectrum-rail-grid {
			grid-template-columns: 1fr;
			gap: 6px;
		}

		.spectrum-node {
			flex-direction: row;
			justify-content: space-between;
			text-align: left;
			padding: 10px 12px;
		}

		.spectrum-insp-grid,
		.spectrum-umpire-bar {
			grid-template-columns: 1fr;
		}

		.spectrum-axis-foot {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
