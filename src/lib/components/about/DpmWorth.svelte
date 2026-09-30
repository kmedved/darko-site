<script>
	// What a player's DPM is worth to a team, as the Roster Lab counts it: put him with four
	// average teammates at his projected minutes and see the team's rating and wins move.
	import { playerWorth } from '$lib/utils/aboutDarko.js';
	import { searchByName } from '$lib/utils/nameSearch.js';
	import { formatSigned } from '$lib/utils/seismograph.js';
	import { WINS_PER_POINT } from '$lib/utils/rosterLab.js';

	let { players = [], leagueMean = 0 } = $props();

	let pickedId = $state(null);
	let query = $state('');

	const ranked = $derived(
		players.filter((player) => Number.isFinite(player?.dpm)).sort((a, b) => b.dpm - a.dpm)
	);
	const player = $derived(ranked.find((entry) => entry.nba_id === pickedId) ?? ranked[0] ?? null);
	const worth = $derived(player ? playerWorth({ dpm: player.dpm, minutes: player.minutes }, leagueMean) : null);
	const matches = $derived(
		query.trim().length >= 2
			? searchByName(ranked, query, { rank: (entry) => entry.dpm, limit: 6 })
			: []
	);

	function choose(entry) {
		pickedId = entry.nba_id;
		query = '';
	}

	function money(value) {
		const n = Number(value);
		return Number.isFinite(n) && n > 0 ? `$${(n / 1e6).toFixed(1)}M` : null;
	}
</script>

<div class="worth">
	<div class="worth-pick">
		<label for="worth-search">Pick a player</label>
		<div class="worth-search">
			<input
				id="worth-search"
				type="search"
				placeholder={player ? player.player_name : 'Search players'}
				autocomplete="off"
				bind:value={query}
				onkeydown={(event) => {
					if (event.key === 'Enter' && matches[0]) choose(matches[0]);
				}}
			/>
			{#if matches.length}
				<ul class="worth-matches">
					{#each matches as entry (entry.nba_id)}
						<li>
							<button type="button" onclick={() => choose(entry)}>
								<span>{entry.player_name}</span>
								<small>{entry.team ?? ''} {formatSigned(entry.dpm, 1)}</small>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	{#if player && worth}
		<ol class="worth-steps" aria-live="polite">
			<li>
				<span class="step-label">DPM</span>
				<strong>{formatSigned(player.dpm, 1)}</strong>
				<span class="step-note">
					<a href="/player/{player.nba_id}">{player.player_name}</a>: offense {formatSigned(player.o_dpm, 1)},
					defense {formatSigned(player.d_dpm, 1)}
				</span>
			</li>
			<li>
				<span class="step-label">Minutes</span>
				<strong>{player.minutes.toFixed(1)}</strong>
				<span class="step-note">DARKO's projection a game: {Math.round(worth.share * 100)}% of the 48</span>
			</li>
			<li>
				<span class="step-label">Team rating</span>
				<strong>{formatSigned(worth.lift, 1)}</strong>
				<span class="step-note">above an average team, with four average teammates</span>
			</li>
			<li>
				<span class="step-label">Wins</span>
				<strong>{Math.round(worth.wins)}</strong>
				<span class="step-note">over 82 games, where an average team wins 41</span>
			</li>
			{#if money(player.salary)}
				<li>
					<span class="step-label">Fair salary</span>
					<strong>{money(player.salary)}</strong>
					<span class="step-note">a season, <a href="/about/fair-salary">from his DPM and minutes</a></span>
				</li>
			{/if}
		</ol>
		<p class="worth-note">
			Each point of team rating is worth about {WINS_PER_POINT} wins, as in the
			<a href="/lab">Roster Lab</a>.
		</p>
	{/if}
</div>

<style>
	.worth {
		margin: 22px 0 30px;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.worth-pick {
		display: grid;
		gap: 6px;
	}

	.worth-pick label {
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.worth-search {
		position: relative;
		max-width: 360px;
	}

	.worth-search input {
		width: 100%;
		min-height: 40px;
		padding: 0 12px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text);
		font: inherit;
		font-size: 15px;
	}

	.worth-search input::placeholder {
		color: var(--text);
		opacity: 0.75;
	}

	.worth-matches {
		position: absolute;
		z-index: 5;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 4px;
		list-style: none;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		box-shadow: 0 12px 30px -12px color-mix(in srgb, #000 40%, transparent);
	}

	.worth-matches button {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		width: 100%;
		padding: 8px 10px;
		border: 0;
		border-radius: 6px;
		background: none;
		color: var(--text);
		font: inherit;
		font-size: 14px;
		text-align: left;
		cursor: pointer;
	}

	.worth-matches button:hover,
	.worth-matches button:focus-visible {
		background: var(--bg-hover);
	}

	.worth-matches small {
		color: var(--text-muted);
		font-family: var(--font-mono);
	}

	.worth-steps {
		display: grid;
		gap: 2px;
		margin: 16px 0 0;
		padding: 0;
		list-style: none;
	}

	.worth-steps li {
		display: grid;
		grid-template-columns: 7.5em 5.5em minmax(0, 1fr);
		align-items: baseline;
		gap: 12px;
		padding: 9px 0;
		border-top: 1px solid var(--border-subtle);
	}

	.step-label {
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 700;
	}

	.worth-steps strong {
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 18px;
		font-weight: var(--figure-weight-strong);
		text-align: right;
	}

	.step-note {
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.45;
	}

	.step-note a,
	.worth-note a {
		color: var(--accent);
	}

	.worth-note {
		margin: 10px 0 0;
		color: var(--text-muted);
		font-size: 13px;
	}

	@media (max-width: 560px) {
		.worth-steps li {
			grid-template-columns: 6.5em 5.5em minmax(0, 1fr);
			gap: 8px;
		}

		.worth-steps li .step-note {
			grid-column: 1 / -1;
		}
	}
</style>
