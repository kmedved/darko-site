<script>
	/**
	 * The page heading every route shares: an optional eyebrow, the title, an optional lede, then
	 * anything the page adds (a note, a date line), with optional actions on the right. `logo`
	 * puts a decorative team logo beside the title; `aside` is a headline figure on the right (a
	 * team's rating). Styles live in app.css (.page-header); the Shiny view restyles it through
	 * its data-shiny hooks.
	 */
	let {
		eyebrow = '',
		title,
		id = undefined,
		lede = '',
		logo = '',
		actions,
		aside,
		children,
		class: className = ''
	} = $props();

	let logoFailed = $state(false);

	$effect(() => {
		logo;
		logoFailed = false;
	});
</script>

<header class="page-header {className}" data-shiny-surface="hero">
	{#if logo && !logoFailed}
		<img class="page-header-logo" src={logo} alt="" onerror={() => (logoFailed = true)} />
	{/if}
	<div class="page-header-main">
		{#if eyebrow}<p class="page-eyebrow" data-shiny-role="editorial-kicker">{eyebrow}</p>{/if}
		<h1 {id}>{title}</h1>
		{#if lede}<p class="page-lede">{lede}</p>{/if}
		{@render children?.()}
	</div>
	{#if actions}
		<div class="page-header-actions">{@render actions()}</div>
	{/if}
	{#if aside}
		<div class="page-header-aside">{@render aside()}</div>
	{/if}
</header>
