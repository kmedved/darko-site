<script>
	import OffenseDefenseSplit from '$lib/components/OffenseDefenseSplit.svelte';
	import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
	import { formatSigned } from '$lib/utils/seismograph.js';

	let { comps = [], referenceId = null } = $props();
	let failedPhotos = $state(new Set());
</script>

<ol class="current-comps">
	{#each comps as comp, index (comp.id)}
		<li class:reference={comp.self}>
			<div class="comp-identity">
				<span class="comp-rank" aria-label="Rank {index + 1}">{String(index + 1).padStart(2, '0')}</span>
				<div class="comp-photo" aria-hidden="true">
					{#if !failedPhotos.has(comp.id)}
						<img src="https://cdn.nba.com/headshots/nba/latest/260x190/{comp.id}.png" alt="" loading="lazy" onerror={() => (failedPhotos = new Set([...failedPhotos, comp.id]))} />
					{/if}
				</div>
				<div class="comp-name">
					<a href="/player/{comp.id}">{comp.name}</a>
					<span>{teamAbbr(comp.team)} · Age {comp.age.toFixed(1)}{#if comp.self} <strong>Reference player</strong>{/if}</span>
				</div>
				<div class="comp-match"><strong>{comp.similarity.toFixed(1)}</strong><span>match / 100</span></div>
			</div>
			<div class="match-track" aria-hidden="true"><span style:width="{comp.similarity}%"></span></div>
			<div class="comp-ratings">
				<span><strong>{formatSigned(comp.dpm, 1)}</strong> DPM</span>
				<OffenseDefenseSplit offense={comp.offense} defense={comp.defense} />
			</div>
			<div class="comp-bottom">
				<p><strong>{comp.points.toFixed(1)}</strong> PTS <strong>{comp.rebounds.toFixed(1)}</strong> REB <strong>{comp.assists.toFixed(1)}</strong> AST <span>/ 100 poss.</span></p>
				{#if !comp.self}<a class="compare-link" href="/compare?ids={referenceId},{comp.id}" aria-label="Compare with {comp.name}">Compare <span aria-hidden="true">↗</span></a>{/if}
			</div>
		</li>
	{/each}
</ol>
<details class="comp-method">
	<summary>How these matches work</summary>
	<p>Each player's latest published profile is compared with today's league. The score uses standardized differences in DPM, offense, defense, age, scoring, assists, rebounds, blocks, steals, turnovers, three-point shot share and free-throw rate. DPM and age carry the most weight. Historical trajectory and a same-age cutoff are not used here.</p>
	<p>100 is an identical profile, so a current player is his own first match. Scores fall by 8 points per unit of weighted distance, down to zero. This is a similarity index, not a probability. Box-score figures are projections per 100 possessions, so playing time does not distort the comparison.</p>
</details>

<style>
	.current-comps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 28px; margin: 16px 0 0; padding: 0; list-style: none; }
	.current-comps li { min-width: 0; padding: 16px 0; border-top: 1px solid var(--border-subtle); }
	.comp-identity { display: flex; align-items: center; gap: 10px; }
	.comp-rank { font: 12px var(--font-mono); color: var(--text-muted); }
	.comp-photo { width: 58px; height: 44px; flex: none; overflow: hidden; background: var(--bg-elevated); border-radius: var(--radius-sm); }
	.comp-photo img { width: 100%; height: 100%; object-fit: cover; }
	.comp-name { min-width: 0; flex: 1; }
	.comp-name a { display: block; width: fit-content; max-width: 100%; color: var(--text); font-weight: 650; font-size: 14px; text-decoration: none; }
	.comp-name a:hover, .comp-name a:focus-visible, .compare-link:hover { text-decoration: underline; }
	.comp-name > span { display: block; font-size: 11px; color: var(--text-muted); margin-top: 3px; }
	.comp-name strong { display: inline-block; color: var(--accent); font-weight: 500; margin-left: 4px; }
	.comp-match { text-align: right; flex: none; }
	.comp-match strong { display: block; font: var(--figure-weight-strong) 21px var(--font-mono); color: var(--text); letter-spacing: -1px; }
	.reference .comp-match strong { color: var(--accent); }
	.comp-match span { font-size: 10px; color: var(--text-muted); }
	.match-track { height: 2px; margin: 12px 0 10px; background: var(--border-subtle); }
	.match-track span { display: block; height: 100%; background: var(--graphic-muted); }
	.reference .match-track span { background: var(--accent); }
	.comp-ratings { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 12px; color: var(--text-muted); }
	.comp-ratings strong { font: var(--figure-weight-strong) 14px var(--font-mono); color: var(--text); }
	.comp-bottom { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-top: 8px; }
	.comp-bottom p { margin: 0; color: var(--text-muted); font-size: 10px; }
	.comp-bottom p strong { font: 11px var(--font-mono); color: var(--text-secondary); margin-left: 7px; }
	.comp-bottom p strong:first-child { margin-left: 0; }
	.comp-bottom p > span { white-space: nowrap; }
	.compare-link { color: var(--text-secondary); font-size: 11px; text-decoration: none; white-space: nowrap; }
	.comp-method { margin-top: 12px; color: var(--text-muted); font-size: 12px; }
	.comp-method summary { cursor: pointer; width: fit-content; }
	.comp-method p { max-width: 90ch; margin: 8px 0 0; line-height: 1.6; }
	@media (max-width: 740px) { .current-comps { grid-template-columns: 1fr; } }
	@media (max-width: 380px) { .comp-photo { width: 44px; height: 38px; } .comp-identity { gap: 7px; } .comp-bottom { flex-wrap: wrap; } }
</style>
