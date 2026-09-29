<script>
	// The leaderboard's leaders: the DPM leader first and widest, then offense, defense and the two
	// shooting leaders. Each card glows in its player's team colour behind the headshot and says how
	// far the leader is ahead of the next player. The Shiny view keeps its plain value boxes: the
	// cards carry the shared stat-tile classes its styles target, and drop the glow and margin.
	import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
	import { teamColor } from '$lib/utils/teamColors.js';

	/** cards: [{ title, player, displayValue, margin }]; href, photo and logo map a player to URLs. */
	let { cards = [], href, photo, logo } = $props();

	function hideBrokenImage(event) {
		event.currentTarget.hidden = true;
	}
</script>

<section class="stat-strip leader-strip" aria-label="Leaderboard leaders">
	{#each cards as card, index (card.title)}
		<article
			class="stat-tile leader-card"
			class:leader-card--lead={index === 0}
			style:--team-color={teamColor(card.player?.team_name) ?? 'var(--accent)'}
			data-shiny-surface="summary"
		>
			<div class="stat-tile-body leader-body">
				<p class="stat-tile-label leader-label">{card.title}</p>
				<strong class="stat-tile-value leader-value">{card.displayValue}</strong>
				{#if card.player}
					<a class="leader-player" href={href(card.player)}>
						{#if logo(card.player)}
							<img src={logo(card.player)} alt="" loading="lazy" onerror={hideBrokenImage} />
						{/if}
						<span>
							{card.player.player_name}
							<small>{teamAbbr(card.player.team_name)}</small>
						</span>
					</a>
					{#if card.margin}<small class="leader-margin">{card.margin}</small>{/if}
				{:else}
					<span class="leader-player leader-player--empty">No player</span>
				{/if}
			</div>
			{#if card.player && photo(card.player)}
				<img class="stat-tile-photo leader-photo" src={photo(card.player)} alt="" loading="lazy" onerror={hideBrokenImage} />
			{/if}
		</article>
	{/each}
</section>

<style>
	/* The lead card takes a wider column; below 1100px the strip scrolls sideways, snap by snap. */
	.leader-strip {
		grid-auto-columns: minmax(250px, 1fr);
		gap: 14px;
	}

	@media (min-width: 1100px) {
		.leader-strip {
			grid-template-columns: minmax(300px, 1.45fr) repeat(4, minmax(0, 1fr));
		}
	}

	/* The shared tile is a row; here the headshot sits in the lower right corner instead, so the
	   title and the number run the card's full width. */
	.leader-card {
		display: block;
		isolation: isolate;
		min-height: 150px;
		padding: 16px 18px;
		/* A rule in the team's colour along the top. */
		box-shadow: inset 0 3px 0 var(--team-color);
	}

	/* The team's colour, glowing up behind the headshot from the card's lower right. */
	.leader-card::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: radial-gradient(
			circle at 88% 115%,
			color-mix(in srgb, var(--team-color) 34%, transparent),
			transparent 62%
		);
		pointer-events: none;
	}

	.leader-body {
		position: relative;
		z-index: 1;
		gap: 4px;
	}

	.leader-label {
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.leader-value {
		font-size: 34px;
		font-weight: 800;
		font-stretch: 112%;
		letter-spacing: -0.02em;
		line-height: 1;
	}

	.leader-player {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: 6px;
		min-width: 0;
		color: var(--text);
		font-size: 14px;
		font-weight: 800;
	}

	.leader-player:hover {
		color: var(--accent);
	}

	.leader-player img {
		flex: none;
		width: 22px;
		height: 22px;
		object-fit: contain;
	}

	.leader-player span {
		display: grid;
		min-width: 0;
	}

	.leader-player small {
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 650;
	}

	.leader-player--empty {
		color: var(--text-muted);
	}

	.leader-margin {
		color: var(--text-secondary);
		font-size: 12px;
		line-height: 1.35;
	}

	/* The name and the margin wrap short of the headshot beside them. */
	.leader-player,
	.leader-margin {
		max-width: calc(100% - 92px);
	}

	/* Every card keeps its headshot in its corner (the shared tiles drop theirs under 230px); only
	   a card too narrow for it and the text loses the picture. */
	.leader-photo {
		position: absolute;
		right: 0;
		bottom: 0;
		height: 88px;
		margin: 0;
	}

	/* The lead card grows only where it has the wider column; in the sideways strip it matches. */
	@media (min-width: 1100px) {
		.leader-card--lead .leader-value {
			font-size: 44px;
		}

		.leader-card--lead .leader-player,
		.leader-card--lead .leader-margin {
			max-width: calc(100% - 150px);
		}

		.leader-card--lead .leader-photo {
			height: 128px;
		}
	}

	@container (max-width: 230px) {
		.leader-photo {
			display: block;
		}
	}

	@container (max-width: 175px) {
		.leader-photo {
			display: none;
		}
	}

	/* The Shiny view's archived boxes: no colour, no margin line. */
	:global(:root[data-view='shiny']) .leader-card {
		box-shadow: none;
	}

	:global(:root[data-view='shiny']) .leader-card::before,
	:global(:root[data-view='shiny']) .leader-margin {
		display: none;
	}

	:global(:root[data-view='shiny']) .leader-strip {
		grid-template-columns: none;
		grid-auto-columns: minmax(180px, 1fr);
	}

	:global(:root[data-view='shiny']) .leader-label {
		letter-spacing: 0;
		text-transform: none;
	}

	:global(:root[data-view='shiny']) .leader-value,
	:global(:root[data-view='shiny']) .leader-card--lead .leader-value {
		font-size: 20px;
		letter-spacing: 0;
		line-height: 1.2;
	}
</style>
