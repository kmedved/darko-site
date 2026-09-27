<script>
	// One summary tile: a label that wraps, a neutral value, an optional detail line and any extra
	// content (a player or team link). `logo` puts a small team logo on the left, `photo` a player
	// headshot on the right; both are decorative because the tile names the team or player in text.
	import MetricTooltip from './MetricTooltip.svelte';

	let { label, value, detail = '', hint = '', logo = '', photo = '', children } = $props();

	function hideBrokenImage(event) {
		event.currentTarget.hidden = true;
	}
</script>

<article class="stat-tile" data-shiny-surface="summary">
	{#if logo}
		<img class="stat-tile-logo" src={logo} alt="" loading="lazy" onerror={hideBrokenImage} />
	{/if}
	<div class="stat-tile-body">
		<p class="stat-tile-label">
			{label}{#if hint}{' '}<MetricTooltip text={hint} label={`About ${label}`}><span class="info-dot" aria-hidden="true">i</span></MetricTooltip>{/if}
		</p>
		<strong class="stat-tile-value">{value}</strong>
		{#if detail}<small class="stat-tile-detail">{detail}</small>{/if}
		{@render children?.()}
	</div>
	{#if photo}
		<img class="stat-tile-photo" src={photo} alt="" loading="lazy" onerror={hideBrokenImage} />
	{/if}
</article>
