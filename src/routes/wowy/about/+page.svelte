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
			Daily WOWY is trained to match two-way time-decay RAPM: play-by-play RAPM that weights
			a player's games on both sides of each date. In 1999–2025 data, the two have an
			exposure-weighted correlation of about <strong>0.88</strong>. WOWY is calibrated against
			modern RAPM, so that comparison uses overlapping data; with the seasons being scored held
			out of the calibration, the figure is about 0.86.
		</p>
		<p>
			Against the one-directional time-decay RAPM shown elsewhere on this site, which uses only
			games up to each date, the correlation is about 0.84.
		</p>
		<p><a href="/wowy">Explore WOWY RAPM ratings →</a></p>
	</section>
</div>

<style>
	.wowy-about-content { max-width: 760px; margin: 1.5rem auto; color: var(--text); line-height: 1.7; }
	p { font-size: 16px; }
	a { color: var(--accent); }
</style>
