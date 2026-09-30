<script>
	// DPM leans from the box score toward on/off data as a career's possessions pile up, sooner on
	// defense than on offense. Slide a career along; below, three players at different points.
	import { DPM_BLEND, onOffShare } from '$lib/utils/aboutDarko.js';
	import { formatSigned } from '$lib/utils/seismograph.js';

	/** examples: [{ nba_id, player_name, stage, box_dpm, on_off_dpm, dpm }] */
	let { examples = [] } = $props();

	const MAX = 50_000;
	const MILESTONES = [
		{ possessions: 0, label: 'A rookie' },
		{ possessions: 5_000, label: 'A season as a starter' },
		{ possessions: 25_000, label: 'Five seasons' },
		{ possessions: 50_000, label: 'Ten seasons' }
	];

	let possessions = $state(5_000);

	const sides = $derived([
		{ key: 'offense', label: 'Offense', share: onOffShare(possessions, DPM_BLEND.offense) },
		{ key: 'defense', label: 'Defense', share: onOffShare(possessions, DPM_BLEND.defense) }
	]);

	// Where DPM sits between the two, when they are far enough apart to say.
	function between(example) {
		const box = Number(example.box_dpm);
		const onOff = Number(example.on_off_dpm);
		const dpm = Number(example.dpm);
		if (![box, onOff, dpm].every(Number.isFinite) || Math.abs(onOff - box) < 0.3) return null;
		return Math.min(1, Math.max(0, (dpm - box) / (onOff - box)));
	}
</script>

<figure class="blend">
	<label class="blend-slider">
		<span>Career possessions</span>
		<input
			type="range"
			min="0"
			max={MAX}
			step="250"
			bind:value={possessions}
			aria-valuetext="{possessions.toLocaleString('en-US')} possessions"
		/>
		<strong>{possessions.toLocaleString('en-US')}</strong>
	</label>
	<div class="blend-milestones" role="group" aria-label="Jump to">
		{#each MILESTONES as milestone (milestone.possessions)}
			<button type="button" class:active={possessions === milestone.possessions} onclick={() => (possessions = milestone.possessions)}>
				{milestone.label}
			</button>
		{/each}
	</div>

	<div class="blend-sides" aria-live="polite">
		{#each sides as side (side.key)}
			<div class="blend-side">
				<span class="blend-side-label">{side.label}</span>
				<span class="blend-bar" aria-hidden="true">
					<i class="box" style:width="{(1 - side.share) * 100}%"></i>
					<i class="onoff" style:width="{side.share * 100}%"></i>
				</span>
				<span class="blend-side-value">
					{Math.round((1 - side.share) * 100)}% box score · {Math.round(side.share * 100)}% on/off
				</span>
			</div>
		{/each}
	</div>

	{#if examples.length}
		<table class="blend-examples">
			<thead>
				<tr>
					<th scope="col">Today</th>
					<th scope="col" class="num">Box DPM</th>
					<th scope="col" class="num">On/Off DPM</th>
					<th scope="col" class="num">DPM</th>
					<th scope="col" class="track-cell"><span class="sr-only">Where DPM sits</span></th>
				</tr>
			</thead>
			<tbody>
				{#each examples as example (example.nba_id)}
					{@const at = between(example)}
					<tr>
						<th scope="row">
							<span class="who">
								<a href="/player/{example.nba_id}">{example.player_name}</a>
								<small>{example.stage}</small>
							</span>
						</th>
						<td class="num">{formatSigned(example.box_dpm, 1)}</td>
						<td class="num">{formatSigned(example.on_off_dpm, 1)}</td>
						<td class="num strong">{formatSigned(example.dpm, 1)}</td>
						<td class="track-cell">
							{#if at !== null}
								<span class="track" title="DPM sits {Math.round(at * 100)}% of the way from Box DPM to On/Off DPM">
									<span class="end">Box</span>
									<span class="line"><i style:left="{at * 100}%"></i></span>
									<span class="end">On/off</span>
								</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	<figcaption>
		On/off's share is its career possessions over possessions plus {DPM_BLEND.offense.toLocaleString('en-US')} on
		offense, {DPM_BLEND.defense.toLocaleString('en-US')} on defense. A season as a starter is about 5,000.
	</figcaption>
</figure>

<style>
	.blend {
		margin: 24px 0 30px;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.blend-slider {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) 4.5em;
		align-items: center;
		gap: 12px;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 700;
	}

	.blend-slider input {
		width: 100%;
		accent-color: var(--accent);
	}

	.blend-slider strong {
		color: var(--text);
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
		text-align: right;
	}

	.blend-milestones {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
	}

	.blend-milestones button {
		min-height: 28px;
		padding: 3px 10px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg);
		color: var(--text-secondary);
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}

	.blend-milestones button.active,
	.blend-milestones button:hover {
		border-color: var(--accent);
		color: var(--text);
	}

	.blend-sides {
		display: grid;
		gap: 10px;
		margin-top: 16px;
	}

	.blend-side {
		display: grid;
		grid-template-columns: 5em minmax(0, 1fr);
		align-items: center;
		gap: 4px 12px;
	}

	.blend-side-label {
		color: var(--text);
		font-size: 13px;
		font-weight: 800;
	}

	.blend-bar {
		display: flex;
		height: 16px;
		overflow: hidden;
		border-radius: 4px;
		background: var(--border-subtle);
	}

	.blend-bar i {
		display: block;
		height: 100%;
		transition: width 0.18s ease-out;
	}

	.blend-bar .box {
		background: color-mix(in srgb, var(--text-muted) 45%, transparent);
	}

	.blend-bar .onoff {
		background: var(--accent);
	}

	.blend-side-value {
		grid-column: 2;
		color: var(--text-secondary);
		font-family: var(--font-mono);
		font-size: 12px;
	}

	.blend-examples {
		width: 100%;
		margin-top: 18px;
		border-collapse: collapse;
		font-size: 13px;
	}

	.blend-examples th,
	.blend-examples td {
		padding: 8px 6px;
		border-top: 1px solid var(--border-subtle);
		text-align: left;
	}

	.blend-examples thead th {
		border-top: 0;
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.blend-examples .who {
		display: grid;
		font-weight: 700;
	}

	.blend-examples th[scope='row'] a {
		color: var(--text);
		text-decoration: none;
	}

	.blend-examples th[scope='row'] a:hover {
		color: var(--accent);
	}

	.blend-examples small {
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 600;
	}

	.blend-examples .num {
		font-family: var(--font-mono);
		text-align: right;
		white-space: nowrap;
	}

	.blend-examples .strong {
		color: var(--text);
		font-weight: var(--figure-weight-strong);
	}

	.track-cell {
		width: 34%;
	}

	.track {
		display: grid;
		grid-template-columns: auto minmax(40px, 1fr) auto;
		align-items: center;
		gap: 6px;
		color: var(--text-muted);
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.track .line {
		position: relative;
		height: 2px;
		background: var(--border);
	}

	.track .line i {
		position: absolute;
		top: 50%;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--accent);
		transform: translate(-50%, -50%);
	}

	figcaption {
		margin-top: 12px;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 1.5;
	}

	@media (prefers-reduced-motion: reduce) {
		.blend-bar i {
			transition: none;
		}
	}

	@media (max-width: 560px) {
		.blend-slider {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.blend-slider > span {
			grid-column: 1 / -1;
		}

		.track-cell {
			display: none;
		}
	}
</style>
