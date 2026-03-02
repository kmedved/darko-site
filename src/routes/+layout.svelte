<script>
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	const THEME_KEY = 'darko-theme';
	const THEMES = ['black', 'dark', 'light', 'white'];
	const THEME_ICONS = ['⚫', '🌙', '☀️', '⚪'];
	let { children } = $props();

	let theme = $state('white');

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
	const FONTS = ['dm', 'inter', 'roboto', 'lato', 'opensans', 'sourcesans', 'nunito', 'worksans', 'raleway', 'outfit', 'jakarta', 'spacegrotesk', 'system'];
	const FONT_LABELS = ['DM Sans', 'Inter', 'Roboto', 'Lato', 'Open Sans', 'Source Sans', 'Nunito Sans', 'Work Sans', 'Raleway', 'Outfit', 'Jakarta Sans', 'Space Grotesk', 'System'];

	let font = $state('dm');

	function isFontValue(value) {
		return FONTS.includes(value);
	}

	function resolveInitialFont() {
		if (!browser) return 'dm';

		const htmlFont = document.documentElement.dataset.font;
		if (isFontValue(htmlFont)) return htmlFont;

		try {
			const saved = localStorage.getItem(FONT_KEY);
			if (isFontValue(saved)) return saved;
		} catch {}
		return 'dm';
	}

	function setFont(nextFont) {
		if (!isFontValue(nextFont)) return;
		font = nextFont;
		if (!browser) return;

		document.documentElement.dataset.font = nextFont;
		try {
			localStorage.setItem(FONT_KEY, nextFont);
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
			{#each FONTS as f, i}
				<option value={f}>{FONT_LABELS[i]}</option>
			{/each}
		</select>
		<div class="links">
            <a href="/about" class:active={$page.url.pathname === '/about'}>About</a>
        </div>
        <a href="/" class="logo" aria-label="DARKO DPM">
            <span class="sr-only">DARKO DPM</span>
            <img src="/logo-light.png" alt="" class="logo-mark logo-mark--light" aria-hidden="true" />
            <img src="/logo-dark.png" alt="" class="logo-mark logo-mark--dark" aria-hidden="true" />
        </a>
        <div class="links">
            <a href="/" class:active={$page.url.pathname === '/'}>Active Leaderboard</a>
            <a href="/standings" class:active={$page.url.pathname.startsWith('/standings')}>Standings</a>
            <a href="/trajectories" class:active={$page.url.pathname === '/trajectories'}>Player career trajectories</a>
            <a href="/longevity" class:active={$page.url.pathname.startsWith('/longevity')}>Longevity</a>
            <a href="/lineups" class:active={$page.url.pathname === '/lineups'}>Lineups</a>
            <a href="/projections" class:active={$page.url.pathname === '/projections'}>Daily Projections</a>
            <a href="/rate" class:active={$page.url.pathname === '/rate'}>Rate</a>
        </div>
    </div>
</nav>

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
		background: var(--text);
		border: 2px solid var(--bg);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		cursor: pointer;
		transition: transform 0.15s;
	}

	.theme-slider__input::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}

	.theme-slider__input::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--text);
		border: 2px solid var(--bg);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
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

	@media (max-width: 768px) {
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
