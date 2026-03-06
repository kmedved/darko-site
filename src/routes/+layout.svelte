<script>
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	const THEME_KEY = 'darko-theme';
	const THEMES = ['black', 'dark', 'light', 'white'];
	const THEME_ICONS = ['⚫', '🌙', '☀️', '⚪'];
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
            <img src="/logo-light.png" alt="" class="logo-mark logo-mark--light" aria-hidden="true" />
            <img src="/logo-dark.png" alt="" class="logo-mark logo-mark--dark" aria-hidden="true" />
        </a>
		<div class="desktop-controls">
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
			<div class="links">
				<a href="/about" class:active={$page.url.pathname === '/about'}>About</a>
			</div>
		</div>
        <div class="links desktop-links">
            <a href="/" class:active={$page.url.pathname === '/'}>Active Leaderboard</a>
            <a href="/standings" class:active={$page.url.pathname.startsWith('/standings')}>Standings</a>
            <a href="/trajectories" class:active={$page.url.pathname === '/trajectories'}>Trajectories</a>
            <a href="/longevity" class:active={$page.url.pathname.startsWith('/longevity')}>Longevity</a>
            <a href="/lineups" class:active={$page.url.pathname === '/lineups'}>Lineups</a>
            <a href="/projections" class:active={$page.url.pathname === '/projections'}>Projections</a>
            <a href="/rate" class:active={$page.url.pathname === '/rate'}>Rate a Player</a>
        </div>
    </div>
</nav>

{#if mobileMenuOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="mobile-overlay" onclick={closeMobileMenu} onkeydown={() => {}}></div>
{/if}

<div class="mobile-drawer" class:open={mobileMenuOpen}>
	<div class="mobile-drawer-links">
		<a href="/" class:active={$page.url.pathname === '/'} onclick={closeMobileMenu}>Active Leaderboard</a>
		<a href="/standings" class:active={$page.url.pathname.startsWith('/standings')} onclick={closeMobileMenu}>Standings</a>
		<a href="/trajectories" class:active={$page.url.pathname === '/trajectories'} onclick={closeMobileMenu}>Trajectories</a>
		<a href="/longevity" class:active={$page.url.pathname.startsWith('/longevity')} onclick={closeMobileMenu}>Longevity</a>
		<a href="/lineups" class:active={$page.url.pathname === '/lineups'} onclick={closeMobileMenu}>Lineups</a>
		<a href="/projections" class:active={$page.url.pathname === '/projections'} onclick={closeMobileMenu}>Projections</a>
		<a href="/rate" class:active={$page.url.pathname === '/rate'} onclick={closeMobileMenu}>Rate a Player</a>
		<a href="/about" class:active={$page.url.pathname === '/about'} onclick={closeMobileMenu}>About</a>
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

<style>
	.theme-slider {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 42px;
		margin-right: 20px;
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
		margin-right: 12px;
	}

	.font-select:focus-visible {
		border-color: var(--accent);
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
		width: 280px;
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
	}

	@media (max-width: 768px) {
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

		.theme-slider {
			margin-right: 10px;
		}

		.theme-slider__input {
			width: 56px;
		}

		.font-select {
			margin-right: 6px;
		}
	}
</style>
