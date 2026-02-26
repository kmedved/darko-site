<script>
    import '../app.css';
    import { page } from '$app/stores';
    let { children } = $props();
</script>

<nav>
    <div class="container">
        <a href="/" class="logo">DARKO <span class="accent">DPM</span></a>
        <div class="links">
            <a href="/standings" class:active={$page.url.pathname.startsWith('/standings')}>Standings</a>
            <a href="/compare" class:active={$page.url.pathname === '/compare'}>Compare</a>
        </div>
    </div>
</nav>

<main>
    {@render children()}
</main>
