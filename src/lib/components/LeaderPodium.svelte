<script>
	// The top five in DPM for one of the leaderboard rail's cards (a position, a year in the
	// league): the first three on a podium in their teams' colours, each headshot standing on its
	// block, and the next two in rows below. The podium rises once, when it comes into view; a new
	// five (another tab, team or board) fades in over it. The Shiny view keeps its plain list
	// instead (routes/+page.svelte).
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { formatSignedMetric } from '$lib/utils/csvPresets.js';
	import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
	import { teamColor, teamInk } from '$lib/utils/teamColors.js';

	/** players: the five, best first; href and photo map a player to URLs. */
	let { players = [], href, photo } = $props();

	const PLACES = ['1st', '2nd', '3rd'];
	const podium = $derived(players.slice(0, 3));
	const chasers = $derived(players.slice(3, 5));
	const lineup = $derived(players.map((player) => player.nba_id).join());

	// 'painted': the entrance runs as the page paints, the podium being in view. 'waiting': off
	// screen at first, it holds its starting pose until a third of it shows. 'settled': it has
	// risen, and the next five fade in instead of rising again.
	let entrance = $state('painted');
	let shownLineup = untrack(() => lineup);

	$effect.pre(() => {
		if (lineup === shownLineup) return;
		shownLineup = lineup;
		if (untrack(() => entrance) !== 'waiting') entrance = 'settled';
	});

	function reducedMotion() {
		return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function riseInView(node) {
		if (reducedMotion() || typeof IntersectionObserver !== 'function') return;
		const box = node.getBoundingClientRect();
		if (box.bottom > 0 && box.top < window.innerHeight) return;
		entrance = 'waiting';
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				entrance = 'painted';
			},
			{ threshold: 0.35 }
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}

	function fadeIn(node) {
		return fade(node, { duration: reducedMotion() ? 0 : 150 });
	}

	function lastName(player) {
		const name = String(player?.player_name ?? '');
		return name.split(' ').slice(1).join(' ') || name;
	}

	// A name with a word too long for a narrow column (Antetokounmpo) sets tighter rather than
	// breaking mid-word; a hyphenated one (Gilgeous-Alexander) breaks at its hyphen.
	function isLongName(name) {
		return name.split(/[\s-]/).some((part) => part.length >= 11);
	}

	function team(player) {
		return teamAbbr(player?.team_name) || '';
	}

	function hideBrokenImage(event) {
		event.currentTarget.hidden = true;
	}
</script>

<div
	class="podium-stage"
	class:waiting={entrance === 'waiting'}
	class:settled={entrance === 'settled'}
	style:--lead={teamColor(podium[0]?.team_name) ?? 'var(--accent)'}
	use:riseInView
>
	{#key lineup}
		<div class="podium-lineup" in:fadeIn>
			<ol class="podium">
				{#each podium as player, index (player.nba_id)}
					<li
						class="podium-place podium-place--{index + 1}"
						style:--team={teamColor(player.team_name) ?? 'var(--accent)'}
						style:--ink={teamInk(player.team_name) ?? '#ffffff'}
					>
						<a
							href={href(player)}
							aria-label={`${PLACES[index]}: ${player.player_name}${team(player) ? `, ${team(player)}` : ''}, DPM ${formatSignedMetric(player.dpm)}`}
						>
							<span class="podium-stand">
								<span class="podium-figure">
									{#if photo(player)}
										<img class="podium-photo" src={photo(player)} alt="" loading="lazy" onerror={hideBrokenImage} />
									{/if}
								</span>
								<span class="podium-block">
									<span class="podium-rank">{PLACES[index]}</span>
									<strong class="podium-value">{formatSignedMetric(player.dpm)}</strong>
								</span>
							</span>
							<span class="podium-caption">
								<span class="podium-name" class:podium-name--long={isLongName(lastName(player))}>{lastName(player)}</span>
								<small>{team(player)}{player.position ? `${team(player) ? ' · ' : ''}${player.position}` : ''}</small>
							</span>
						</a>
					</li>
				{/each}
			</ol>
			{#if chasers.length > 0}
				<ol class="chasers" start="4">
					{#each chasers as player, index (player.nba_id)}
						<li style:--team={teamColor(player.team_name) ?? 'var(--accent)'} style:--order={index}>
							<a class="chaser" href={href(player)}>
								<span class="chaser-rank" aria-hidden="true">{index + 4}</span>
								<span class="chaser-face">
									{#if photo(player)}
										<img src={photo(player)} alt="" loading="lazy" onerror={hideBrokenImage} />
									{/if}
								</span>
								<span class="chaser-name">
									<span>{player.player_name}</span>
									<small>{team(player)}{player.position ? `${team(player) ? ' · ' : ''}${player.position}` : ''}</small>
								</span>
								<strong class="chaser-value">{formatSignedMetric(player.dpm)}</strong>
							</a>
						</li>
					{/each}
				</ol>
			{/if}
		</div>
	{/key}
</div>

<style>
	.podium-stage {
		position: relative;
		isolation: isolate;
		max-width: 460px;
		margin: 0 auto;
		container-type: inline-size;
	}

	/* A spotlight in the leader's colour behind the podium. */
	.podium-stage::before {
		content: '';
		position: absolute;
		inset: 0 0 auto;
		height: 72%;
		z-index: -1;
		background: radial-gradient(
			ellipse 58% 64% at 50% 58%,
			color-mix(in srgb, var(--lead) 30%, transparent),
			transparent 72%
		);
		pointer-events: none;
	}

	/* Winner in the middle and widest, second on the left, third on the right, while the list
	   reads 1-2-3; the blocks share a floor and the captions a row, however the names wrap. */
	.podium {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr);
		grid-template-rows: auto auto;
		column-gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.podium-place {
		display: grid;
		grid-row: 1 / span 2;
		grid-template-rows: subgrid;
	}

	.podium-place--1 {
		grid-column: 2;
		--rise-delay: 0.2s;
	}

	.podium-place--2 {
		grid-column: 1;
		--rise-delay: 0.1s;
	}

	.podium-place--3 {
		grid-column: 3;
		--rise-delay: 0s;
	}

	.podium-place a {
		display: grid;
		grid-row: 1 / span 2;
		grid-template-rows: subgrid;
		border-radius: 12px;
		color: var(--text);
		text-decoration: none;
	}

	.podium-place a:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	.podium-stand {
		display: grid;
		align-self: end;
	}

	.podium-figure {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		aspect-ratio: 1040 / 760;
		margin-bottom: -1px;
	}

	.podium-photo {
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center bottom;
		filter: drop-shadow(0 8px 10px color-mix(in srgb, #000 24%, transparent));
		transform-origin: 50% 100%;
		transition: transform 0.25s ease;
		animation: podium-pop 0.5s cubic-bezier(0.2, 1.3, 0.4, 1) backwards;
		animation-delay: calc(var(--rise-delay) + 0.32s);
	}

	.podium-place a:hover .podium-photo {
		transform: translateY(-4px) scale(1.04);
	}

	/* The text sits in the block's upper part, in the team's colour; the shade below it only adds
	   depth, so the ink keeps its contrast (teamInk). */
	.podium-block {
		position: relative;
		overflow: hidden;
		display: grid;
		align-content: start;
		justify-items: center;
		gap: 3px;
		padding: 10px 6px 0;
		border-radius: 12px 12px 4px 4px;
		background: linear-gradient(180deg, var(--team) 58%, color-mix(in srgb, #000 22%, var(--team)));
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, #fff 45%, transparent),
			0 14px 26px -12px color-mix(in srgb, var(--team) 80%, transparent);
		color: var(--ink);
		animation: podium-rise 0.62s cubic-bezier(0.22, 1, 0.36, 1) backwards;
		animation-delay: var(--rise-delay);
	}

	.podium-place--1 .podium-block {
		height: 100px;
	}

	.podium-place--2 .podium-block {
		height: 76px;
	}

	.podium-place--3 .podium-block {
		height: 60px;
	}

	/* A glint across the winner's block once it has risen. */
	.podium-place--1 .podium-block::after {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 45%;
		background: linear-gradient(90deg, transparent, color-mix(in srgb, #fff 55%, transparent), transparent);
		transform: translateX(-130%) skewX(-18deg);
		animation: podium-glint 0.9s ease-in-out 0.95s both;
		pointer-events: none;
	}

	.podium-rank {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.08em;
		line-height: 1;
		text-transform: uppercase;
	}

	.podium-value {
		font-family: var(--font-display);
		font-size: 22px;
		font-weight: 800;
		font-stretch: 112%;
		letter-spacing: -0.02em;
		line-height: 1;
	}

	.podium-place--1 .podium-value {
		font-size: 30px;
	}

	.podium-caption {
		display: grid;
		align-content: start;
		gap: 2px;
		padding-top: 8px;
		text-align: center;
	}

	/* Sized to the podium, so a side column (about 100px on a phone) holds Wembanyama whole, and a
	   longer word (Antetokounmpo) a size down. */
	.podium-name {
		font-family: var(--font-display);
		font-size: clamp(12px, 3.8cqi, 14px);
		font-weight: 800;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}

	.podium-name--long {
		font-size: clamp(11px, 3.1cqi, 13px);
		letter-spacing: -0.01em;
	}

	.podium-place a:hover .podium-name {
		color: var(--accent);
	}

	.podium-caption small {
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 700;
	}

	.chasers {
		display: grid;
		gap: 6px;
		margin: 14px 0 0;
		padding: 0;
		list-style: none;
	}

	.chaser {
		display: grid;
		grid-template-columns: 16px 34px minmax(0, 1fr) auto;
		align-items: center;
		gap: 10px;
		padding: 6px 12px 6px 12px;
		border-radius: 10px;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--team) 22%, transparent),
			color-mix(in srgb, var(--team) 4%, transparent) 78%
		);
		box-shadow: inset 3px 0 0 var(--team);
		color: var(--text);
		text-decoration: none;
		transition: background-color 0.2s ease;
		animation: chaser-in 0.42s ease-out backwards;
		animation-delay: calc(0.5s + var(--order) * 0.09s);
	}

	.chaser:hover {
		background-color: color-mix(in srgb, var(--team) 12%, transparent);
	}

	.chaser:hover .chaser-name span {
		color: var(--accent);
	}

	.chaser:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.chaser-rank {
		color: var(--text-secondary);
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
	}

	.chaser-face {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		overflow: hidden;
		border-radius: 50%;
		background: var(--bg-surface);
		box-shadow: 0 0 0 2px var(--team);
	}

	.chaser-face img {
		width: 46px;
		height: 34px;
		object-fit: cover;
		object-position: center top;
	}

	.chaser-name {
		display: grid;
		min-width: 0;
		line-height: 1.2;
	}

	.chaser-name span {
		overflow: hidden;
		font-size: 13px;
		font-weight: 850;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chaser-name small {
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 700;
	}

	.chaser-value {
		font-family: var(--font-mono);
		font-size: 15px;
		font-weight: var(--figure-weight-strong);
	}

	@keyframes podium-rise {
		from {
			clip-path: inset(100% 0 0 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}

	@keyframes podium-pop {
		from {
			opacity: 0;
			transform: translateY(18px) scale(0.9);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes podium-glint {
		from {
			transform: translateX(-130%) skewX(-18deg);
		}
		to {
			transform: translateX(260%) skewX(-18deg);
		}
	}

	@keyframes chaser-in {
		from {
			opacity: 0;
			transform: translateX(-14px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	/* Waiting off screen: the entrance's starting pose, played when the podium shows. */
	.waiting .podium-block {
		animation: none;
		clip-path: inset(100% 0 0 0);
	}

	.waiting .podium-photo,
	.waiting .chaser {
		animation: none;
		opacity: 0;
	}

	/* Risen once: a new five only fades in (the podium-lineup's fadeIn). */
	.settled .podium-block,
	.settled .podium-photo,
	.settled .chaser,
	.waiting .podium-place--1 .podium-block::after,
	.settled .podium-place--1 .podium-block::after {
		animation: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.podium-block,
		.podium-photo,
		.chaser,
		.podium-place--1 .podium-block::after {
			animation: none;
		}
	}

	@media print {
		.waiting .podium-block {
			clip-path: none;
		}

		.waiting .podium-photo,
		.waiting .chaser {
			opacity: 1;
		}
	}
</style>
