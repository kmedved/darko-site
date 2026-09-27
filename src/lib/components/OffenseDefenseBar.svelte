<script>
	// Diverging bar: positive parts grow right of zero, negative parts left, offense nearest
	// zero. Decorative; pair it with OffenseDefenseSplit for the numbers.
	let { offense = null, defense = null, max = 8 } = $props();

	function share(value) {
		const n = Number.parseFloat(value);
		return Number.isFinite(n) ? Math.min(Math.abs(n) / max, 1) * 100 : 0;
	}

	const parts = $derived(
		[
			{ side: 'offense', value: Number.parseFloat(offense) },
			{ side: 'defense', value: Number.parseFloat(defense) }
		].filter((part) => Number.isFinite(part.value) && share(part.value) >= 0.5)
	);
</script>

<div class="od-bar" aria-hidden="true">
	<div class="od-bar-half od-bar-half--negative">
		{#each parts.filter((part) => part.value < 0) as part (part.side)}
			<span class="od-bar-part od-bar-part--{part.side}" style:width="{share(part.value)}%"></span>
		{/each}
	</div>
	<div class="od-bar-zero"></div>
	<div class="od-bar-half">
		{#each parts.filter((part) => part.value >= 0) as part (part.side)}
			<span class="od-bar-part od-bar-part--{part.side}" style:width="{share(part.value)}%"></span>
		{/each}
	</div>
</div>

<style>
	.od-bar {
		display: grid;
		grid-template-columns: 1fr 1px 1fr;
		align-items: center;
		height: 12px;
	}

	.od-bar-half {
		display: flex;
		gap: 2px;
		min-width: 0;
		height: 8px;
		padding: 0 1px;
	}

	.od-bar-half--negative {
		flex-direction: row-reverse;
	}

	.od-bar-zero {
		height: 12px;
		background: var(--text-muted);
	}

	.od-bar-part {
		flex: 0 1 auto;
		min-width: 0;
		height: 100%;
		border-radius: 1.5px;
	}

	.od-bar-part--offense {
		background: var(--offense);
	}

	.od-bar-part--defense {
		background: var(--defense);
	}
</style>
