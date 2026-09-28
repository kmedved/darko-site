<script>
	// "Echoes today": current players whose closest comps include one of this player's seasons,
	// each linked to their own comps (echoRows in utils/playerSeasons.js).
	import { teamAbbr } from '$lib/utils/teamAbbreviations.js';

	let { echoes = [] } = $props();
</script>

<ol class="echoes">
	{#each echoes as echo (echo.id)}
		<li>
			<span class="echo-who">
				<a href="/player/{echo.id}#comps">{echo.name}</a>
				{#if echo.team}<span class="echo-team">{teamAbbr(echo.team)}</span>{/if}
			</span>
			<span class="echo-season">like his {echo.seasonLabel}</span>
			<span class="echo-score" title="Match score out of 100">{echo.similarity}</span>
		</li>
	{/each}
</ol>
<p class="echo-note">Match score out of 100: how close the current player's season is to that one.</p>

<style>
	.echoes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0 24px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.echoes li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		gap: 10px;
		align-items: baseline;
		padding: 7px 0;
		border-bottom: 1px solid var(--border-subtle);
		font-size: 13px;
	}

	.echo-who {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.echo-who a {
		font-weight: 600;
		color: var(--text);
		text-decoration: none;
	}

	.echo-who a:hover,
	.echo-who a:focus-visible {
		text-decoration: underline;
	}

	.echo-team {
		margin-left: 6px;
		font-size: 11px;
		color: var(--text-muted);
	}

	.echo-season {
		font-size: 12px;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.echo-score {
		min-width: 2ch;
		font-family: var(--font-mono);
		font-weight: 600;
		text-align: right;
		color: var(--text);
	}

	.echo-note {
		font-size: 12px;
		color: var(--text-muted);
	}
</style>
