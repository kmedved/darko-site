<script>
	import '../app.css';
	import '../shiny-view.css';
	import { browser } from '$app/environment';
	import { beforeNavigate, goto, preloadData } from '$app/navigation';
	import { navigating, page } from '$app/stores';
	import { onMount, setContext } from 'svelte';
	import TimeMachine from '$lib/components/TimeMachine.svelte';
	import AskDarko from '$lib/components/AskDarko.svelte';
	import { newFeatureCount } from '$lib/utils/whatsNew.js';
	import { loadOptionalFont } from '$lib/fonts.js';
	import { setTimeMachineCollapsed, syncTimeMachineFold, timeMachine } from '$lib/timeMachineState.svelte.js';
	import {
		AS_OF_PARAM,
		formatAsOfDate,
		isDateAwarePath,
		parseAsOfDate,
		relativeHref,
		withAsOf
	} from '$lib/utils/timeMachine.js';
	import {
		DISPLAY_VIEW_CONTEXT,
		DISPLAY_VIEW_QUERY_KEY,
		DISPLAY_VIEW_STORAGE_KEY,
		LEGACY_DISPLAY_VIEW_QUERY_KEY,
		getDisplayViewPreview,
		isDisplayView,
		normalizeDisplayView
	} from '$lib/displayMode.js';

	const THEME_KEY = 'darko-theme';
	const THEMES = ['black', 'dark', 'light', 'white'];
	const THEME_ICONS = ['⚫', '🌙', '☀️', '⚪'];
	// Players, teams and the stats pages, then the two labs; the specialist views sit under More.
	const PRIMARY_NAV_ITEMS = [
		{ href: '/daily', label: 'The Daily', match: (path) => path === '/daily' },
		{ href: '/', label: 'Active Leaderboard', match: (path) => path === '/' },
		{ href: '/teams', label: 'Teams', match: (path) => path === '/teams' || path.startsWith('/team/') },
		{ href: '/standings', label: 'Standings', match: (path) => path.startsWith('/standings') },
		{ href: '/wowy', label: 'WOWY RAPM', match: (path) => path.startsWith('/wowy') },
		{ href: '/lineups', label: 'Lineups', match: (path) => path === '/lineups' },
		{ href: '/lab', label: 'Roster Lab', match: (path) => path === '/lab' },
		{ href: '/projections', label: 'Fantasy Lab', match: (path) => path === '/projections' }
	];
	const MORE_NAV_ITEMS = [
		{ href: '/rewind', label: 'Rewind', match: (path) => path === '/rewind' },
		{ href: '/trajectories', label: 'Trajectories', match: (path) => path === '/trajectories' },
		{ href: '/longevity', label: 'Longevity', match: (path) => path.startsWith('/longevity') },
		{ href: '/scatterplot', label: 'Scatterplot', match: (path) => path === '/scatterplot' },
		{ href: '/compare', label: 'Compare', match: (path) => path === '/compare' },
		{ href: '/rate', label: 'Rate a Player', match: (path) => path === '/rate' },
		{ href: '/about', label: 'About', match: (path) => path.startsWith('/about') }
	];
	const ALL_NAV_ITEMS = [...PRIMARY_NAV_ITEMS, ...MORE_NAV_ITEMS];
	const DETAIL_PAGE_LABELS = [
		{ label: "What's new", match: (path) => path === '/new' },
		{ label: 'Player Profile', match: (path) => path.startsWith('/player/') },
		{ label: 'Team Profile', match: (path) => path.startsWith('/team/') }
	];
	let { children } = $props();
	const displayMode = $state({ view: 'modern' });
	setContext(DISPLAY_VIEW_CONTEXT, displayMode);

	let theme = $state('white');
	let mobileMenuOpen = $state(false);
	let askOpen = $state(false);
	// The shortcut hint appears once the platform is known, so server and browser agree.
	let askShortcut = $state('');
	$effect(() => {
		if (!browser) return;
		const platform = navigator.userAgentData?.platform ?? navigator.platform ?? '';
		askShortcut = /mac|iphone|ipad/i.test(platform) ? '⌘K' : 'Ctrl K';
	});
	const isShinyView = $derived(displayMode.view === 'shiny');

	function readSavedDisplayView() {
		try {
			const savedView = localStorage.getItem(DISPLAY_VIEW_STORAGE_KEY);
			return isDisplayView(savedView) ? savedView : null;
		} catch {
			return null;
		}
	}

	function resolveDisplayView(url) {
		return getDisplayViewPreview(url.searchParams) ?? readSavedDisplayView() ?? 'modern';
	}

	function setDisplayView(nextView) {
		const normalizedView = normalizeDisplayView(nextView);
		displayMode.view = normalizedView;
		if (!browser) return;

		document.documentElement.dataset.view = normalizedView;
		try {
			localStorage.setItem(DISPLAY_VIEW_STORAGE_KEY, normalizedView);
		} catch {
			// localStorage can be unavailable in some privacy modes
		}

		const url = new URL(window.location.href);
		let removedPreview = false;
		if (isDisplayView(url.searchParams.get(DISPLAY_VIEW_QUERY_KEY))) {
			url.searchParams.delete(DISPLAY_VIEW_QUERY_KEY);
			removedPreview = true;
		}
		if (isDisplayView(url.searchParams.get(LEGACY_DISPLAY_VIEW_QUERY_KEY))) {
			url.searchParams.delete(LEGACY_DISPLAY_VIEW_QUERY_KEY);
			removedPreview = true;
		}
		if (removedPreview) {
			void goto(`${url.pathname}${url.search}${url.hash}`, {
				replaceState: true,
				keepFocus: true,
				noScroll: true
			});
		}
	}

	$effect(() => {
		if (!browser) return;
		const resolvedView = resolveDisplayView($page.url);
		displayMode.view = resolvedView;
		document.documentElement.dataset.view = resolvedView;
	});

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	// The Time Machine date comes from ?asof= and sticks to every in-app navigation until the
	// reader returns to today (which clears timeMachine.date before navigating).
	const urlAsOf = $derived(parseAsOfDate($page.url.searchParams.get(AS_OF_PARAM)));
	$effect(() => {
		timeMachine.date = urlAsOf;
	});

	// Without a saved choice the strip opens while a date is set or on Rewind, and folds otherwise.
	$effect(() => {
		if (!browser) return;
		syncTimeMachineFold({ rewound: Boolean(timeMachine.date), pathname: $page.url.pathname });
	});

	// While rewound, links carry the date, and hovering any in-app link preloads its dated page
	// (SvelteKit's own hover preload would fetch today's version).
	function navHref(href) {
		return timeMachine.date ? `${href}?${AS_OF_PARAM}=${timeMachine.date}` : href;
	}

	let lastPreloaded = '';
	function preloadDated(event) {
		const date = timeMachine.date;
		const anchor = date && event.target instanceof Element ? event.target.closest('a[href]') : null;
		if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
		const url = new URL(anchor.href, window.location.href);
		if (url.origin !== window.location.origin || url.pathname.startsWith('/api/')) return;
		if (url.searchParams.has(AS_OF_PARAM)) return;
		const href = relativeHref(withAsOf(url, date));
		if (href === lastPreloaded) return;
		lastPreloaded = href;
		preloadData(href).catch(() => {});
	}

	$effect(() => {
		if (!browser) return;
		document.addEventListener('pointerover', preloadDated, { passive: true });
		document.addEventListener('focusin', preloadDated);
		return () => {
			document.removeEventListener('pointerover', preloadDated);
			document.removeEventListener('focusin', preloadDated);
		};
	});

	// A thin bar under the header while a navigation waits on data (after a beat, so
	// instant navigations never flash it).
	let showProgress = $state(false);
	$effect(() => {
		if (!$navigating) {
			showProgress = false;
			return;
		}
		const timer = setTimeout(() => (showProgress = true), 120);
		return () => clearTimeout(timer);
	});

	beforeNavigate((navigation) => {
		const date = timeMachine.date;
		const target = navigation.to?.url;
		if (!date || !target || navigation.type === 'popstate' || navigation.willUnload) return;
		if (!navigation.to?.route?.id || target.origin !== $page.url.origin) return;
		if (target.searchParams.has(AS_OF_PARAM)) return;
		navigation.cancel();
		void goto(relativeHref(withAsOf(target, date)));
	});

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
		loadOptionalFont(normalizedFont);
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

	// The folded Time Machine's nav button: a clock, or the rewound date in the time colour.
	const foldedDateLabel = $derived(timeMachine.date ? formatAsOfDate(timeMachine.date, { short: true }) : null);
	const foldedTitle = $derived(
		foldedDateLabel
			? `Time Machine: ${foldedDateLabel}${isDateAwarePath($page.url.pathname) ? '' : ". This page shows today's data"}`
			: 'Show the Time Machine'
	);

	function showTimeMachine() {
		setTimeMachineCollapsed(false);
		requestAnimationFrame(() => document.querySelector('#time-machine .tm-collapse')?.focus());
	}
	// What's new shows in the menus only while a feature launched in the last 30 days. Pages can
	// come from the edge cache, so the browser's clock recounts once the page is up.
	let whatsNewCount = $state(newFeatureCount());
	onMount(() => {
		whatsNewCount = newFeatureCount();
	});
	const moreMenuActive = $derived(
		MORE_NAV_ITEMS.some((item) => isNavItemActive(item, $page.url.pathname)) || $page.url.pathname === '/new'
	);
</script>

<nav class="site-nav">
    <div class="container">
		<button class="mobile-menu-btn" onclick={toggleMobileMenu} aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>
			<span class="hamburger-line" class:open={mobileMenuOpen}></span>
			<span class="hamburger-line" class:open={mobileMenuOpen}></span>
			<span class="hamburger-line" class:open={mobileMenuOpen}></span>
		</button>
		<a href={navHref('/')} class="logo" aria-label="DARKO DPM">
            <span class="sr-only">DARKO DPM</span>
            <span class="logo-mark" aria-hidden="true"></span>
            <span class="legacy-logo-lockup" aria-hidden="true">
                <img
                    src="/darko-about-logo.png"
                    alt=""
                    width="504"
                    height="399"
                    class="legacy-logo-mark"
                />
            </span>
        </a>
		<span class="mobile-current-page">{currentPageLabel}</span>
        <div class="links desktop-links">
			{#each PRIMARY_NAV_ITEMS as item (item.href)}
				<a href={navHref(item.href)} class:active={isNavItemActive(item, $page.url.pathname)}>{item.label}</a>
			{/each}
			<details class="nav-more" class:active={moreMenuActive}>
				<summary>More</summary>
				<div class="nav-more-menu">
					{#if whatsNewCount > 0}
						<a href="/new" class="nav-new" class:active={$page.url.pathname === '/new'}>
							What's new <span class="nav-new-count">{whatsNewCount}</span>
						</a>
					{/if}
					{#each MORE_NAV_ITEMS as item (item.href)}
						<a href={navHref(item.href)} class:active={isNavItemActive(item, $page.url.pathname)}>{item.label}</a>
					{/each}
				</div>
			</details>
        </div>
		<div class="desktop-controls">
			<details class="display-menu">
				<summary>Display</summary>
				<div class="display-menu-panel">
					<div class="display-control">
						<span>View</span>
						<div class="view-mode-toggle" role="group" aria-label="View">
							<button
								type="button"
								class:active={!isShinyView}
								aria-pressed={!isShinyView}
								onclick={() => setDisplayView('modern')}
							>
								Modern
							</button>
							<button
								type="button"
								class:active={isShinyView}
								aria-pressed={isShinyView}
								onclick={() => setDisplayView('shiny')}
							>
								Shiny
							</button>
						</div>
					</div>
					<label class="display-control" class:disabled={isShinyView}>
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
								disabled={isShinyView}
							/>
							<span class="theme-slider__icon" aria-hidden="true">{THEME_ICONS[3]}</span>
						</div>
					</label>
					<label class="display-control" class:disabled={isShinyView}>
						<span>Font</span>
						<select class="font-select" value={font} onchange={handleFontChange} aria-label="Font" disabled={isShinyView}>
							{#each FONTS as f, i (f)}
								<option value={f}>{FONT_LABELS[i]}</option>
							{/each}
						</select>
					</label>
					{#if isShinyView}
						<p class="display-mode-note">Shiny View uses its original light palette and Helvetica typography.</p>
					{/if}
				</div>
			</details>
		</div>
		<button
			type="button"
			class="ask-nav-toggle"
			aria-haspopup="dialog"
			aria-keyshortcuts="Meta+K Control+K /"
			onclick={() => (askOpen = true)}
		>
			<svg viewBox="0 0 20 20" aria-hidden="true">
				<circle cx="8.5" cy="8.5" r="5.5" />
				<path d="M12.6 12.6 17 17" />
			</svg>
			<span class="ask-nav-label">Ask DARKO</span>
			{#if askShortcut}<kbd class="ask-nav-kbd" aria-hidden="true">{askShortcut}</kbd>{/if}
		</button>
		<button
			type="button"
			id="tm-nav-toggle"
			class="tm-nav-toggle"
			class:rewound={foldedDateLabel}
			aria-controls="time-machine"
			aria-expanded="false"
			aria-label={foldedTitle}
			title={foldedTitle}
			onclick={showTimeMachine}
		>
			<svg viewBox="0 0 20 20" aria-hidden="true">
				<path d="M4.2 7.2A6.5 6.5 0 1 1 3.5 12" />
				<path d="M3.2 3.6v3.9h3.9" />
				<path d="M10 6.2V10l2.6 1.7" />
			</svg>
			<span class="tm-nav-label">{foldedDateLabel ?? 'Time Machine'}</span>
		</button>
    </div>
	<TimeMachine />
	<AskDarko bind:open={askOpen} />
	{#if showProgress}
		<div class="nav-progress" class:rewound={timeMachine.date} aria-hidden="true"></div>
	{/if}
</nav>

{#if mobileMenuOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="mobile-overlay" onclick={closeMobileMenu} onkeydown={() => {}}></div>
{/if}

<div
	class="mobile-drawer"
	class:open={mobileMenuOpen}
	aria-hidden={!mobileMenuOpen}
	inert={!mobileMenuOpen}
>
	<div class="mobile-drawer-links">
		{#if whatsNewCount > 0}
			<a href="/new" class="nav-new" class:active={$page.url.pathname === '/new'} onclick={closeMobileMenu}>
				What's new <span class="nav-new-count">{whatsNewCount}</span>
			</a>
		{/if}
		{#each ALL_NAV_ITEMS as item (item.href)}
			<a href={navHref(item.href)} class:active={isNavItemActive(item, $page.url.pathname)} onclick={closeMobileMenu}>{item.label}</a>
		{/each}
	</div>
	<div class="mobile-drawer-controls">
		<div class="view-mode-toggle" role="group" aria-label="View">
			<button
				type="button"
				class:active={!isShinyView}
				aria-pressed={!isShinyView}
				onclick={() => setDisplayView('modern')}
			>
				Modern
			</button>
			<button
				type="button"
				class:active={isShinyView}
				aria-pressed={isShinyView}
				onclick={() => setDisplayView('shiny')}
			>
				Shiny
			</button>
		</div>
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
				disabled={isShinyView}
			/>
			<span class="theme-slider__icon" aria-hidden="true">{THEME_ICONS[3]}</span>
		</div>
		<select class="font-select" value={font} onchange={handleFontChange} aria-label="Font" disabled={isShinyView}>
			{#each FONTS as f, i (f)}
				<option value={f}>{FONT_LABELS[i]}</option>
			{/each}
		</select>
		{#if isShinyView}
			<p class="display-mode-note">Theme and font are fixed while Shiny View is active.</p>
		{/if}
	</div>
</div>

<main>
    {@render children()}
</main>

<!-- Product decision: the former global credits footer is intentionally absent in both display modes. -->

<style>
	/* Shown only while the Time Machine strip is folded (see TimeMachine.svelte). */
	.tm-nav-toggle {
		display: none;
		flex: none;
		align-items: center;
		gap: 6px;
		height: 30px;
		padding: 0 11px 0 9px;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		white-space: nowrap;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 999px;
		cursor: pointer;
	}

	:global(:root[data-time-machine='collapsed']) .tm-nav-toggle {
		display: inline-flex;
	}

	.tm-nav-toggle:hover {
		color: var(--text);
		border-color: var(--text-muted);
	}

	.ask-nav-toggle {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: 6px;
		height: 30px;
		margin-left: 10px;
		padding: 0 7px 0 9px;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		white-space: nowrap;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 999px;
		cursor: pointer;
	}

	.ask-nav-toggle:hover {
		color: var(--text);
		border-color: var(--text-muted);
	}

	.ask-nav-toggle:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.ask-nav-toggle svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
	}

	.ask-nav-kbd {
		padding: 1px 5px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--text-muted);
		border: 1px solid var(--border);
		border-radius: 999px;
	}

	:global(:root[data-view='shiny']) .ask-nav-toggle {
		border-radius: 4px;
		background: #ffffff;
		border-color: #cccccc;
		color: #333333;
		font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
	}

	@media (max-width: 720px) {
		.ask-nav-toggle {
			margin-left: auto;
			padding: 0 7px;
		}

		.ask-nav-label,
		.ask-nav-kbd {
			display: none;
		}
	}

	.tm-nav-toggle:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.tm-nav-toggle.rewound {
		color: var(--time-text);
		background: color-mix(in srgb, var(--time) 8%, transparent);
		border-color: color-mix(in srgb, var(--time) 45%, transparent);
	}

	.tm-nav-toggle.rewound .tm-nav-label {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}

	.tm-nav-toggle svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	@media (max-width: 720px) {
		.tm-nav-toggle:not(.rewound) {
			padding: 0 7px;
		}

		.tm-nav-toggle:not(.rewound) .tm-nav-label {
			display: none;
		}
	}

	:global(:root[data-view='shiny']) .tm-nav-toggle {
		border-radius: 4px;
		background: #ffffff;
		border-color: #cccccc;
		color: #333333;
		font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
	}

	.nav-progress {
		position: absolute;
		left: 0;
		right: 0;
		bottom: -2px;
		height: 2px;
		overflow: hidden;
		pointer-events: none;
	}

	.nav-progress::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		width: 38%;
		background: var(--accent);
		animation: nav-progress 1.1s ease-in-out infinite;
	}

	.nav-progress.rewound::before {
		background: var(--time);
	}

	@keyframes nav-progress {
		from {
			left: -38%;
		}
		to {
			left: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nav-progress::before {
			left: 0;
			width: 100%;
			animation: none;
			opacity: 0.6;
		}
	}

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
		border-bottom: 2px solid transparent;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		list-style: none;
		padding: 8px 10px 9px;
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

	.nav-new-count {
		display: inline-block;
		min-width: 18px;
		margin-left: 6px;
		padding: 1px 6px;
		border-radius: 999px;
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 700;
		line-height: 16px;
		text-align: center;
		color: var(--bg);
		background: var(--accent);
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

	.display-control.disabled {
		opacity: 0.48;
	}

	.view-mode-toggle {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-elevated);
		overflow: hidden;
	}

	.view-mode-toggle button {
		appearance: none;
		min-height: 32px;
		border: 0;
		border-right: 1px solid var(--border);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 700;
		transition: background-color 0.15s, color 0.15s;
	}

	.view-mode-toggle button:last-child {
		border-right: 0;
	}

	.view-mode-toggle button:hover,
	.view-mode-toggle button:focus-visible {
		color: var(--text);
	}

	.view-mode-toggle button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}

	.view-mode-toggle button.active {
		background: var(--accent);
		color: #fff;
	}

	.display-mode-note {
		margin: 0;
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 500;
		line-height: 1.35;
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

	.mobile-drawer-controls .display-mode-note {
		font-size: 11px;
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
			--nav-bar-height: 56px;
		}

			:global(.site-nav > .container) {
			gap: 10px;
			height: 56px;
			padding: 0 16px;
		}

		:global(.logo-mark) {
			height: 48px;
			width: 48px;
		}

			:global(.site-nav .logo) {
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
</style>
