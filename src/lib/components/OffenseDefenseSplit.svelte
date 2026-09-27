<script>
	import OffenseDefenseGlyph from '$lib/components/OffenseDefenseGlyph.svelte';
	import { formatSigned } from '$lib/utils/seismograph.js';

	let { offense = null, defense = null, digits = 1, labels = false } = $props();
</script>

<span class="od-split">
	<span class="od-item">
		<OffenseDefenseGlyph side="offense" />
		<span class={labels ? 'od-label' : 'sr-only'}>Offense</span>
		<span class="od-value">{formatSigned(offense, digits)}</span>
	</span>
	<span class="od-item">
		<OffenseDefenseGlyph side="defense" />
		<span class={labels ? 'od-label' : 'sr-only'}>Defense</span>
		<span class="od-value">{formatSigned(defense, digits)}</span>
	</span>
</span>

<style>
	.od-split {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 14px;
	}

	.od-item {
		display: inline-flex;
		align-items: baseline;
		gap: 5px;
		white-space: nowrap;
	}

	.od-label {
		color: var(--text-secondary);
	}

	.od-value {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		color: var(--text);
	}
</style>
