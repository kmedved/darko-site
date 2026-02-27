<script>
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	const THEME_KEY = 'darko-theme';
	let { children } = $props();

	let theme = $state('light');

	function isThemeValue(value) {
		return value === 'light' || value === 'dark';
	}

	function readThemeFromStorage() {
		try {
			const saved = localStorage.getItem(THEME_KEY);
			if (isThemeValue(saved)) {
				return saved;
			}
		} catch (error) {
			// localStorage can be unavailable in some privacy modes; fall back to system preference.
		}

		return null;
	}

	function resolveInitialTheme() {
		if (!browser) {
			return 'light';
		}

		const htmlTheme = document.documentElement.dataset.theme;
		if (isThemeValue(htmlTheme)) {
			return htmlTheme;
		}

		const savedTheme = readThemeFromStorage();
		if (isThemeValue(savedTheme)) {
			return savedTheme;
		}

		const prefersDark =
			window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

		return prefersDark ? 'dark' : 'light';
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

	function toggleTheme() {
		setTheme(theme === 'light' ? 'dark' : 'light');
	}
</script>

<nav>
    <div class="container">
        <a href="/" class="logo" aria-label="DARKO DPM">
            <span class="sr-only">DARKO DPM</span>
            <img src="/logo-light.png" alt="" class="logo-mark logo-mark--light" aria-hidden="true" />
            <img src="/logo-dark.png" alt="" class="logo-mark logo-mark--dark" aria-hidden="true" />
        </a>
        <div class="links">
            <a href="/about" class:active={$page.url.pathname === '/about'}>About</a>
            <a href="/standings" class:active={$page.url.pathname.startsWith('/standings')}>Standings</a>
            <a href="/compare" class:active={$page.url.pathname === '/compare'}>Compare</a>
            <a href="/trajectories" class:active={$page.url.pathname === '/trajectories'}>Trajectories</a>
            <a href="/longevity" class:active={$page.url.pathname.startsWith('/longevity')}>Longevity</a>
            <a href="/lineups" class:active={$page.url.pathname === '/lineups'}>Lineups</a>
            <button
                type="button"
                class="theme-toggle"
                aria-label="Toggle light/dark theme"
                aria-pressed={theme === 'dark'}
                onclick={toggleTheme}
            >
                {theme === 'light' ? 'Dark' : 'Light'}
            </button>
        </div>
    </div>
</nav>

<main>
    {@render children()}
</main>
