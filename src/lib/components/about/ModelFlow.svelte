<script>
	// DARKO in five steps, each a link to where the page explains it.
	const STEPS = [
		{ href: '#model-inputs', title: 'Every game', text: 'Box scores, tracking data and play-by-play, since 1996-97.' },
		{ href: '#model-decay', title: 'A memory for every stat', text: 'Exponential decay and a Kalman filter weigh every game a player has played.' },
		{ href: '#model-adjustments', title: 'Adjusted', text: 'For rest, travel and home court, opponents, age, the time of season and team changes.' },
		{ href: '#model-combine', title: 'Combined', text: 'A gradient-boosted decision tree turns them into a projection for every stat.' },
		{ href: '#box-to-dpm', title: 'DPM', text: 'The projections become Box DPM; adding on-off data makes DPM.' }
	];
</script>

<ol class="flow" aria-label="How DARKO works">
	{#each STEPS as step, index (step.href)}
		<li>
			<a href={step.href}>
				<span class="flow-step">{index + 1}</span>
				<strong>{step.title}</strong>
				<span class="flow-text">{step.text}</span>
			</a>
		</li>
	{/each}
</ol>

<style>
	.flow {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 10px;
		margin: 24px 0 28px;
		padding: 0;
		list-style: none;
	}

	.flow li {
		position: relative;
	}

	/* An arrow between the steps. */
	.flow li:not(:last-child)::after {
		content: '';
		position: absolute;
		top: 50%;
		right: -9px;
		width: 8px;
		height: 8px;
		border-top: 2px solid var(--border);
		border-right: 2px solid var(--border);
		transform: translateY(-50%) rotate(45deg);
	}

	.flow a {
		display: grid;
		align-content: start;
		gap: 6px;
		height: 100%;
		padding: 14px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
		color: var(--text-secondary);
		text-decoration: none;
		transition: border-color 0.15s ease;
	}

	.flow a:hover,
	.flow a:focus-visible {
		border-color: var(--accent);
	}

	.flow-step {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: var(--figure-weight-strong);
	}

	.flow strong {
		color: var(--text);
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 800;
		line-height: 1.2;
	}

	.flow-text {
		font-size: 13px;
		line-height: 1.45;
	}

	@media (max-width: 900px) {
		.flow {
			grid-template-columns: 1fr;
		}

		.flow li:not(:last-child)::after {
			top: auto;
			right: auto;
			bottom: -9px;
			left: 26px;
			transform: rotate(135deg);
		}

		.flow a {
			grid-template-columns: 24px minmax(0, 1fr);
			column-gap: 12px;
		}

		.flow-text {
			grid-column: 2;
		}
	}
</style>
