<script>
	import OffenseDefenseSplit from '$lib/components/OffenseDefenseSplit.svelte';
	import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
	import { formatSigned } from '$lib/utils/seismograph.js';

	let { comps = [], referenceId = null } = $props();
	let failedPhotos = $state(new Set());
</script>

<div class="comp-columns" aria-hidden="true">
	<span>Player</span>
	<div class="comp-stat-columns"><span>DPM</span><span>Off / Def</span><span>PTS / REB / AST · per 100</span></div>
	<span>Match / 100</span>
</div>
<ol class="current-comps">
	{#each comps as comp, index (comp.id)}
		<li class:reference={comp.self}>
			<div class="comp-identity">
				<span class="comp-rank" aria-label="Rank {index + 1}">{index + 1}</span>
				<div class="comp-photo" aria-hidden="true">
					{#if !failedPhotos.has(comp.id)}
						<img src="https://cdn.nba.com/headshots/nba/latest/260x190/{comp.id}.png" alt="" loading="lazy" onerror={() => (failedPhotos = new Set([...failedPhotos, comp.id]))} />
					{/if}
				</div>
				<a class="comp-name" href="/player/{comp.id}">{comp.name}</a>
				<span class="comp-team">{teamAbbr(comp.team)}</span>
				{#if comp.self}
					<span class="comp-self" title="Reference player">Self</span>
				{:else}
					<a class="compare-link" href="/compare?ids={referenceId},{comp.id}" aria-label="Compare with {comp.name}" title="Compare with {comp.name}">↗</a>
				{/if}
			</div>
			<div class="comp-stats">
				<span class="comp-dpm"><strong>{formatSigned(comp.dpm, 1)}</strong><span class="mobile-label"> DPM</span><span class="sr-only"> DPM</span></span>
				<OffenseDefenseSplit offense={comp.offense} defense={comp.defense} />
				<span class="comp-box"><span class="sr-only">Per 100 possessions: </span>{comp.points.toFixed(1)}<span class="sr-only"> points</span><span aria-hidden="true"> / </span>{comp.rebounds.toFixed(1)}<span class="sr-only"> rebounds</span><span aria-hidden="true"> / </span>{comp.assists.toFixed(1)}<span class="sr-only"> assists</span><span class="mobile-label"> P/R/A</span></span>
			</div>
			<strong class="comp-match" aria-label="Match score {comp.similarity.toFixed(1)} out of 100">{comp.similarity.toFixed(1)}</strong>
		</li>
	{/each}
</ol>
<details class="comp-method">
	<summary>How these matches work</summary>
	<p>Each player's latest published profile is compared with today's league. The score uses standardized differences in DPM, offense, defense, age, scoring, assists, rebounds, blocks, steals, turnovers, three-point shot share and free-throw rate. DPM and age carry the most weight. Historical trajectory and a same-age cutoff are not used here.</p>
	<p>100 is an identical profile, so a current player is his own first match. Scores fall by 8 points per unit of weighted distance, down to zero. This is a similarity index, not a probability. Box-score figures are projections per 100 possessions, so playing time does not distort the comparison.</p>
</details>

<style>
	.comp-columns, .current-comps li { display: grid; grid-template-columns: minmax(240px, 1fr) 350px 72px; align-items: center; column-gap: 20px; }
	.comp-columns { margin-top: 14px; padding-bottom: 5px; color: var(--text-muted); font-size: 11px; }
	.comp-columns > span:last-child { text-align: right; }
	.comp-stat-columns, .comp-stats { display: grid; grid-template-columns: 60px 120px minmax(0, 1fr); align-items: baseline; gap: 10px; }
	.current-comps { margin: 0; padding: 0; list-style: none; }
	.current-comps li { min-width: 0; min-height: 36px; padding: 4px 0; border-top: 1px solid var(--border-subtle); }
	.comp-identity { display: flex; align-items: center; gap: 8px; min-width: 0; }
	.comp-rank { width: 18px; flex: none; font: 11px var(--font-mono); color: var(--text-muted); text-align: right; }
	.comp-photo { width: 28px; height: 24px; flex: none; overflow: hidden; border-radius: 2px; background: var(--bg-elevated); }
	.comp-photo img { width: 100%; height: 100%; object-fit: cover; }
	.comp-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); font-size: 13px; font-weight: 600; text-decoration: none; }
	.comp-name:hover, .comp-name:focus-visible { text-decoration: underline; }
	.comp-team { flex: none; font-size: 11px; color: var(--text-muted); }
	.comp-self { font-size: 11px; color: var(--accent); }
	.compare-link { flex: none; padding: 2px 4px; font-size: 15px; line-height: 1; color: var(--text-muted); text-decoration: none; }
	.compare-link:hover, .compare-link:focus-visible { color: var(--accent); }
	.comp-stats { color: var(--text-secondary); font-size: 12px; }
	.comp-dpm strong { color: var(--text); font: var(--figure-weight-strong) 12px var(--font-mono); }
	.comp-box { font: 11px var(--font-mono); white-space: nowrap; }
	.comp-match { text-align: right; font: var(--figure-weight-strong) 14px var(--font-mono); color: var(--text); }
	.reference .comp-match { color: var(--accent); }
	.mobile-label { display: none; }
	.comp-method { margin-top: 10px; color: var(--text-muted); font-size: 11px; }
	.comp-method summary { cursor: pointer; width: fit-content; }
	.comp-method p { max-width: 90ch; margin: 8px 0 0; font-size: 12px; line-height: 1.6; }
	@media (max-width: 850px) {
		.comp-columns { grid-template-columns: minmax(0, 1fr) 62px; }
		.comp-stat-columns { display: none; }
		.current-comps li { grid-template-columns: minmax(0, 1fr) 62px; row-gap: 3px; padding: 5px 0; }
		.comp-identity { grid-column: 1; grid-row: 1; gap: 6px; }
		.comp-match { grid-column: 2; grid-row: 1; }
		.comp-stats { grid-column: 1 / -1; grid-row: 2; grid-template-columns: 68px 114px minmax(0, 1fr); gap: 6px; }
		.mobile-label { display: inline; font: 11px var(--font-sans); color: var(--text-muted); }
	}
</style>
