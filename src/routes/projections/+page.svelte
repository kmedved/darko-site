<svelte:head>
	<title>Daily Box Score Projections — DARKO DPM</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<div class="page-header-toolbar">
			<div>
				<h1>Daily Box Score Projections</h1>
				<p>Player-level stat projections for today's NBA games.</p>
			</div>
		</div>
	</div>

	<section class="projection-status" aria-labelledby="projection-status-title">
		<div>
			<p class="status-eyebrow">Not live yet</p>
			<h2 id="projection-status-title">Daily box score projections are still being prepared for beta.</h2>
			<p>
				This page will house player-level points, rebounds, assists, shooting, and minutes projections when the feed is ready.
			</p>
		</div>
		<div class="projection-links" aria-label="Current DARKO tools">
			<a href="/">View DPM leaderboard</a>
			<a href="/standings">View season simulations</a>
			<a href="/lineups">View lineup projections</a>
		</div>
	</section>
</div>

<style>
	.projection-status {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
		gap: 24px;
		align-items: start;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-surface);
		padding: 28px;
	}

	.status-eyebrow {
		color: var(--accent);
		font-size: 11px;
		font-weight: 850;
		letter-spacing: 0;
		margin-bottom: 8px;
		text-transform: uppercase;
	}

	.projection-status h2 {
		color: var(--text);
		font-size: 22px;
		line-height: 1.15;
		margin-bottom: 10px;
		overflow-wrap: anywhere;
	}

	.projection-status p:not(.status-eyebrow) {
		color: var(--text-secondary);
		font-size: 14px;
		max-width: 640px;
	}

	.projection-links {
		display: grid;
		gap: 8px;
	}

	.projection-links a {
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg);
		color: var(--text);
		font-size: 13px;
		font-weight: 800;
		padding: 10px 12px;
		transition: border-color 0.15s, background-color 0.15s;
	}

	.projection-links a:hover {
		border-color: var(--accent);
		background: var(--bg-elevated);
		color: var(--text);
	}

	@media (max-width: 720px) {
		.projection-status {
			grid-template-columns: 1fr;
			padding: 20px;
		}
	}
</style>
