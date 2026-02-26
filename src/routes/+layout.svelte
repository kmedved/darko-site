<script>
    import { onMount } from 'svelte';
    import '../app.css';
    import { page } from '$app/stores';

    let { children } = $props();
    const THEME_KEY = 'darko-theme';
    let isDark = $state(false);

    function setTheme(theme) {
        if (!['dark', 'light'].includes(theme)) return;
        document.documentElement.dataset.theme = theme;
        isDark = theme === 'dark';
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch (err) {
            // localStorage unavailable in some environments; still keep runtime theme
        }
    }

    function toggleTheme() {
        setTheme(isDark ? 'light' : 'dark');
    }

    onMount(() => {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'dark' || saved === 'light') {
            setTheme(saved);
            return;
        }
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
    });
</script>

<nav>
    <div class="container">
        <a href="/" class="logo">
            <img class="logo-mark logo-mark--light" src="/logo-light.png" alt="DARKO DPM" aria-hidden="true" />
            <img class="logo-mark logo-mark--dark" src="/logo-dark.png" alt="DARKO DPM" aria-hidden="true" />
            <span class="sr-only">DARKO DPM</span>
        </a>
        <div class="links">
            <a href="/compare" class:active={$page.url.pathname === '/compare'}>Compare</a>
            <button
                class="theme-toggle"
                type="button"
                onclick={toggleTheme}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={isDark}
            >
                {isDark ? '☀️' : '🌙'}
            </button>
        </div>
    </div>
</nav>

<main>
    {@render children()}
</main>
