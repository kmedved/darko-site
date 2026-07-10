<script>
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	const THEME_KEY = 'darko-theme';
	const THEMES = ['black', 'dark', 'light', 'white'];
	const THEME_ICONS = ['⚫', '🌙', '☀️', '⚪'];
	const PRIMARY_NAV_ITEMS = [
		{ href: '/', label: 'Active Leaderboard', match: (path) => path === '/' },
		{ href: '/wowy', label: 'WOWY RAPM', match: (path) => path === '/wowy' },
		{ href: '/standings', label: 'Standings', match: (path) => path.startsWith('/standings') },
		{ href: '/trajectories', label: 'Trajectories', match: (path) => path === '/trajectories' },
		{ href: '/longevity', label: 'Longevity', match: (path) => path.startsWith('/longevity') },
		{ href: '/lineups', label: 'Lineups', match: (path) => path === '/lineups' },
		{ href: '/scatterplot', label: 'Scatterplot', match: (path) => path === '/scatterplot' }
	];
	const MORE_NAV_ITEMS = [
		{ href: '/compare', label: 'Compare', match: (path) => path === '/compare' },
		{ href: '/projections', label: 'Projections', match: (path) => path === '/projections' },
		{ href: '/rate', label: 'Rate a Player', match: (path) => path === '/rate' },
		{ href: '/about', label: 'About', match: (path) => path === '/about' }
	];
	const ALL_NAV_ITEMS = [...PRIMARY_NAV_ITEMS, ...MORE_NAV_ITEMS];
	const DETAIL_PAGE_LABELS = [
		{ label: 'Player Profile', match: (path) => path.startsWith('/player/') },
		{ label: 'Team Profile', match: (path) => path.startsWith('/team/') }
	];
	let { children } = $props();

	let theme = $state('white');
	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	// Close mobile menu on navigation
	$effect(() => {
		$page.url.pathname;
		mobileMenuOpen = false;
	});

	function isThemeValue(value) {
		return THEMES.includes(value);
	}

	function readThemeFromStorage() {
		try {
			const saved = localStorage.getItem(THEME_KEY);
			if (isThemeValue(saved)) {
				return saved;
			}
		} catch (error) {
			// localStorage can be unavailable in some privacy modes
		}
		return null;
	}

	function resolveInitialTheme() {
		if (!browser) {
			return 'white';
		}

		const htmlTheme = document.documentElement.dataset.theme;
		if (isThemeValue(htmlTheme)) {
			return htmlTheme;
		}

		const savedTheme = readThemeFromStorage();
		if (isThemeValue(savedTheme)) {
			return savedTheme;
		}
		// Auto-detect OS dark mode preference
		if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
			return 'dark';
		}
		return 'white';
	}

	function setTheme(nextTheme) {
		if (!isThemeValue(nextTheme)) {
			return;
		}

		theme = nextTheme;
		if (!browser) return;

		document.documentElement.dataset.theme = nextTheme;
		try {
			localStorage.setItem(THEME_KEY, nextTheme);
		} catch (error) {
			// ignore storage failures
		}
	}

	$effect(() => {
		if (!browser) return;
		const initialTheme = resolveInitialTheme();
		setTheme(initialTheme);
	});

	const themeIndex = $derived(THEMES.indexOf(theme));

	function handleSlider(e) {
		const idx = Number(e.target.value);
		setTheme(THEMES[idx]);
	}

	// ── Font toggle ──────────────────────────────────────
	const FONT_KEY = 'darko-font';
	const FONTS = ['inter', 'roboto', 'lato', 'opensans', 'sourcesans', 'nunito', 'worksans', 'raleway', 'outfit', 'jakarta', 'spacegrotesk', 'system'];
	const FONT_LABELS = ['Inter', 'Roboto', 'Lato', 'Open Sans', 'Source Sans', 'Nunito Sans', 'Work Sans', 'Raleway', 'Outfit', 'Jakarta Sans', 'Space Grotesk', 'System'];

	let font = $state('system');

	function normalizeFontValue(value) {
		return value === 'dm' ? 'system' : value;
	}

	function isFontValue(value) {
		return FONTS.includes(normalizeFontValue(value));
	}

	function resolveInitialFont() {
		if (!browser) return 'system';

		const htmlFont = normalizeFontValue(document.documentElement.dataset.font);
		if (isFontValue(htmlFont)) return htmlFont;

		try {
			const saved = normalizeFontValue(localStorage.getItem(FONT_KEY));
			if (isFontValue(saved)) return saved;
		} catch {}
		return 'system';
	}

	function setFont(nextFont) {
		const normalizedFont = normalizeFontValue(nextFont);
		if (!isFontValue(normalizedFont)) return;
		font = normalizedFont;
		if (!browser) return;

		document.documentElement.dataset.font = normalizedFont;
		try {
			localStorage.setItem(FONT_KEY, normalizedFont);
		} catch {}
	}

	$effect(() => {
		if (!browser) return;
		setFont(resolveInitialFont());
	});

	function handleFontChange(e) {
		setFont(e.target.value);
	}

	function isNavItemActive(item, pathname) {
		return item.match?.(pathname) ?? pathname === item.href;
	}

	function getCurrentPageLabel(pathname) {
		return ALL_NAV_ITEMS.find((item) => isNavItemActive(item, pathname))?.label
			?? DETAIL_PAGE_LABELS.find((item) => item.match(pathname))?.label
			?? 'DARKO DPM';
	}

	const currentPageLabel = $derived(getCurrentPageLabel($page.url.pathname));
	const moreMenuActive = $derived(MORE_NAV_ITEMS.some((item) => isNavItemActive(item, $page.url.pathname)));
</script>

<nav>
    <div class="container">
		<button class="mobile-menu-btn" onclick={toggleMobileMenu} aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>
			<span class="hamburger-line" class:open={mobileMenuOpen}></span>
			<span class="hamburger-line" class:open={mobileMenuOpen}></span>
			<span class="hamburger-line" class:open={mobileMenuOpen}></span>
		</button>
		<a href="/" class="logo" aria-label="DARKO DPM">
            <span class="sr-only">DARKO DPM</span>
            <span class="logo-mark" aria-hidden="true"></span>
        </a>
		<span class="mobile-current-page">{currentPageLabel}</span>
        <div class="links desktop-links">
			{#each PRIMARY_NAV_ITEMS as item (item.href)}
				<a href={item.href} class:active={isNavItemActive(item, $page.url.pathname)}>{item.label}</a>
			{/each}
			<details class="nav-more" class:active={moreMenuActive}>
				<summary>More</summary>
				<div class="nav-more-menu">
					{#each MORE_NAV_ITEMS as item (item.href)}
						<a href={item.href} class:active={isNavItemActive(item, $page.url.pathname)}>{item.label}</a>
					{/each}
				</div>
			</details>
        </div>
		<div class="desktop-controls">
			<details class="display-menu">
				<summary>Display</summary>
				<div class="display-menu-panel">
					<label class="display-control">
						<span>Theme</span>
						<div class="theme-slider" role="group" aria-label="Theme selector">
							<span class="theme-slider__icon" aria-hidden="true">{THEME_ICONS[0]}</span>
							<input
								type="range"
								min="0"
								max="3"
								step="1"
								value={themeIndex}
								oninput={handleSlider}
								class="theme-slider__input"
								aria-label="Theme"
								aria-valuetext={theme}
							/>
							<span class="theme-slider__icon" aria-hidden="true">{THEME_ICONS[3]}</span>
						</div>
					</label>
					<label class="display-control">
						<span>Font</span>
						<select class="font-select" value={font} onchange={handleFontChange} aria-label="Font">
							{#each FONTS as f, i (f)}
								<option value={f}>{FONT_LABELS[i]}</option>
							{/each}
						</select>
					</label>
				</div>
			</details>
		</div>
    </div>
</nav>

{#if mobileMenuOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="mobile-overlay" onclick={closeMobileMenu} onkeydown={() => {}}></div>
{/if}

<div class="mobile-drawer" class:open={mobileMenuOpen}>
	<div class="mobile-drawer-links">
		{#each ALL_NAV_ITEMS as item (item.href)}
			<a href={item.href} class:active={isNavItemActive(item, $page.url.pathname)} onclick={closeMobileMenu}>{item.label}</a>
		{/each}
	</div>
	<div class="mobile-drawer-controls">
		<div class="theme-slider" role="group" aria-label="Theme selector">
			<span class="theme-slider__icon" aria-hidden="true">{THEME_ICONS[0]}</span>
			<input
				type="range"
				min="0"
				max="3"
				step="1"
				value={themeIndex}
				oninput={handleSlider}
				class="theme-slider__input"
				aria-label="Theme"
				aria-valuetext={theme}
			/>
			<span class="theme-slider__icon" aria-hidden="true">{THEME_ICONS[3]}</span>
		</div>
		<select class="font-select" value={font} onchange={handleFontChange} aria-label="Font">
			{#each FONTS as f, i (f)}
				<option value={f}>{FONT_LABELS[i]}</option>
			{/each}
		</select>
	</div>
</div>

<main>
    {@render children()}
</main>

<footer class="site-footer">
    <div class="container footer-inner">
        <span>DARKO DPM by <a href="https://x.com/kmedved" target="_blank" rel="noopener">@kmedved</a> & <a href="https://x.com/anpatt7" target="_blank" rel="noopener">@anpatt7</a></span>
        <a href="/about">About</a>
    </div>
</footer>

<style>
	.theme-slider {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 42px;
		margin-right: 0;
	}

	.theme-slider__icon {
		font-size: 12px;
		line-height: 1;
		user-select: none;
	}

	.theme-slider__input {
		-webkit-appearance: none;
		appearance: none;
		width: 72px;
		height: 6px;
		border-radius: 3px;
		background: linear-gradient(to right, #000, #0c1622, #faf0e0, #fff);
		outline: none;
		cursor: pointer;
	}

	.theme-slider__input::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #ffffff;
		border: 1px solid rgba(0,0,0,0.05);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		transition: transform 0.15s, box-shadow 0.15s;
	}

	.theme-slider__input::-webkit-slider-thumb:hover {
		transform: scale(1.1);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
	}

	.theme-slider__input::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #ffffff;
		border: 1px solid rgba(0,0,0,0.05);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1);
		cursor: pointer;
	}

	.theme-slider__input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 4px;
	}

	.font-select {
		-webkit-appearance: none;
		appearance: none;
		background: var(--bg-elevated, var(--bg));
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 4px 8px;
		font-size: 11px;
		font-family: var(--font-sans);
		cursor: pointer;
		outline: none;
		margin-right: 0;
		width: 96px;
	}

	.font-select:focus-visible {
		border-color: var(--accent);
	}

	.mobile-current-page {
		display: none;
		min-width: 0;
		color: var(--text);
		font-size: 13px;
		font-weight: 750;
		line-height: 1.1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.nav-more,
	.display-menu {
		position: relative;
		display: flex;
		align-items: center;
		height: 100%;
	}

	.nav-more summary,
	.display-menu summary {
		display: flex;
		align-items: center;
		height: 100%;
		border-bottom: 2px solid transparent;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		list-style: none;
		padding: 0 10px;
		transition: color 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.nav-more summary::-webkit-details-marker,
	.display-menu summary::-webkit-details-marker {
		display: none;
	}

	.nav-more summary::after,
	.display-menu summary::after {
		content: '';
		width: 0.45em;
		height: 0.45em;
		margin-left: 7px;
		border-right: 1px solid currentColor;
		border-bottom: 1px solid currentColor;
		transform: translateY(-2px) rotate(45deg);
	}

	.nav-more summary:hover,
	.display-menu summary:hover {
		color: var(--text-secondary);
	}

	.nav-more.active summary,
	.nav-more[open] summary,
	.display-menu[open] summary {
		color: var(--text);
		border-bottom-color: var(--accent);
	}

	.nav-more-menu,
	.display-menu-panel {
		position: absolute;
		top: calc(100% - 1px);
		right: 0;
		z-index: 220;
		min-width: 178px;
		padding: 8px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
		box-shadow: 0 18px 44px color-mix(in srgb, var(--text) 12%, transparent);
	}

	.nav-more-menu {
		display: grid;
		gap: 2px;
	}

	.nav-more-menu a {
		display: block;
		height: auto;
		border: 0;
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-size: 13px;
		padding: 9px 10px;
	}

	.nav-more-menu a:hover,
	.nav-more-menu a.active {
		background: var(--bg-elevated);
		color: var(--text);
	}

	.display-menu-panel {
		display: grid;
		gap: 12px;
		min-width: 220px;
	}

	.display-control {
		display: grid;
		gap: 6px;
		color: var(--text-secondary);
		font-size: 11px;
		font-weight: 700;
	}

	.display-control .theme-slider {
		height: auto;
	}

	.display-control .font-select {
		width: 100%;
	}

	/* ── Hamburger menu button (mobile only) ── */
	.mobile-menu-btn {
		display: none;
		flex-direction: column;
		justify-content: center;
		gap: 5px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 6px;
		z-index: 200;
	}

	.hamburger-line {
		display: block;
		width: 22px;
		height: 2px;
		background: var(--text);
		border-radius: 1px;
		transition: transform 0.2s, opacity 0.2s;
	}

	.hamburger-line.open:nth-child(1) {
		transform: translateY(7px) rotate(45deg);
	}
	.hamburger-line.open:nth-child(2) {
		opacity: 0;
	}
	.hamburger-line.open:nth-child(3) {
		transform: translateY(-7px) rotate(-45deg);
	}

	/* ── Mobile overlay ── */
	.mobile-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 140;
	}

	/* ── Mobile drawer ── */
	.mobile-drawer {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		width: min(320px, calc(100vw - 40px));
		height: 100dvh;
		background: var(--bg-surface);
		border-right: 1px solid var(--border);
		z-index: 150;
		transform: translateX(-100%);
		transition: transform 0.25s ease;
		flex-direction: column;
		padding: 60px 0 24px;
		overflow-y: auto;
	}

	.mobile-drawer.open {
		transform: translateX(0);
	}

	.mobile-drawer-links {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.mobile-drawer-links a {
		padding: 12px 24px;
		color: var(--text-secondary);
		font-size: 14px;
		font-weight: 500;
		text-decoration: none;
		border-bottom: 1px solid var(--border-subtle);
		transition: background 0.1s, color 0.1s;
	}

	.mobile-drawer-links a:hover {
		background: var(--bg-hover);
		color: var(--text);
	}

	.mobile-drawer-links a.active {
		color: var(--accent);
		background: var(--bg-elevated);
	}

	.mobile-drawer-controls {
		padding: 16px 24px;
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.mobile-drawer-controls .theme-slider {
		margin-right: 0;
	}

	.mobile-drawer-controls .font-select {
		margin-right: 0;
		width: 100%;
	}

	/* ── Desktop controls wrapper ── */
	.desktop-controls {
		display: flex;
		align-items: center;
		flex: 0 0 auto;
		gap: 10px;
		margin-left: auto;
	}

	@media (max-width: 1320px) {
		.desktop-controls {
			gap: 8px;
		}

		.theme-slider__input {
			width: 58px;
		}

		.font-select {
			width: 88px;
		}
	}

	@media (max-width: 1180px) {
		.mobile-menu-btn {
			display: flex;
		}

		.mobile-drawer {
			display: flex;
		}

		.desktop-links {
			display: none !important;
		}

		.desktop-controls {
			display: none;
		}

		:global(:root) {
			--nav-sticky-offset: 56px;
		}

		:global(nav .container) {
			gap: 10px;
			height: 56px;
			padding: 0 16px;
		}

		:global(.logo-mark) {
			height: 48px;
			width: 48px;
		}

		:global(nav .logo) {
			margin-right: 0;
		}

		.mobile-current-page {
			display: block;
			flex: 1 1 auto;
		}

		.theme-slider {
			margin-right: 10px;
		}

		.theme-slider__input {
			width: 56px;
		}

		.font-select {
			margin-right: 6px;
		}

		.mobile-drawer-controls .theme-slider {
			margin-right: 0;
		}

		.mobile-drawer-controls .font-select {
			margin-right: 0;
			width: 100%;
		}
	}
	/* ── Footer ── */
	.site-footer {
		margin-top: 48px;
		padding: 20px 0;
		border-top: 1px solid var(--border-subtle);
	}

	.footer-inner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 12px;
		color: var(--text-muted);
	}

	.footer-inner a {
		color: var(--text-muted);
	}

	.footer-inner a:hover {
		color: var(--accent);
	}

	@media (max-width: 768px) {
		.footer-inner {
			flex-direction: column;
			gap: 8px;
			text-align: center;
		}
	}

</style>
