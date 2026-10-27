<script>
	import PageHeader from '$lib/components/PageHeader.svelte';
</script>

<svelte:head>
	<title>About WOWY RAPM — DARKO</title>
	<meta name="description" content="A full explanation of WOWY RAPM is coming soon." />
</svelte:head>

<div class="container wowy-about">
	<PageHeader title="About WOWY RAPM" lede="A full writeup is coming soon." />
	<section class="wowy-about-content">
		<p>In the meantime, the WOWY RAPM ratings are available to explore.</p>
		<p>
			In a comparison of 1999–2026 data, Daily WOWY had an exposure-weighted correlation of
			about <strong>0.86</strong> with play-by-play-based time-decay RAPM. WOWY is calibrated
			against modern RAPM, so the comparison uses overlapping data.
		</p>
		<p><a href="/wowy">Explore WOWY RAPM ratings →</a></p>
	</section>
</div>

<style>
	.wowy-about-content { max-width: 760px; margin: 1.5rem auto; color: var(--text); line-height: 1.7; }
	p { font-size: 16px; }
	a { color: var(--accent); }
</style>
