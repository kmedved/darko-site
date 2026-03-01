<script>
    import { exportChartImage } from '$lib/utils/chartImageExport.js';

    let {
        svgEl = null,
        captureRootEl = null,
        filenameBase = 'chart',
        disabled = false,
        buttonLabel = 'Download'
    } = $props();

    let menuRootEl = $state(null);
    let menuOpen = $state(false);
    let exportBusy = $state(false);

    const canExport = $derived(!disabled && !!svgEl && !exportBusy);

    $effect(() => {
        if (!menuOpen) return;

        function handleWindowPointerDown(event) {
            if (!menuRootEl) return;
            if (menuRootEl.contains(event.target)) return;
            menuOpen = false;
        }

        function handleWindowKeydown(event) {
            if (event.key !== 'Escape') return;
            menuOpen = false;
        }

        window.addEventListener('pointerdown', handleWindowPointerDown);
        window.addEventListener('keydown', handleWindowKeydown);

        return () => {
            window.removeEventListener('pointerdown', handleWindowPointerDown);
            window.removeEventListener('keydown', handleWindowKeydown);
        };
    });

    function toggleMenu() {
        if (!canExport) return;
        menuOpen = !menuOpen;
    }

    async function downloadChart(format) {
        if (!canExport) return;

        menuOpen = false;
        exportBusy = true;

        try {
            await exportChartImage({
                svgEl,
                captureRootEl,
                format,
                filenameBase,
                scale: 2
            });
        } catch (error) {
            console.error(error);
        } finally {
            exportBusy = false;
        }
    }
</script>

<div class="chart-download-menu" bind:this={menuRootEl}>
    <button
        type="button"
        class="page-action-btn chart-download-trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen ? 'true' : 'false'}
        onclick={toggleMenu}
        disabled={!canExport}
    >
        {exportBusy ? 'Exporting...' : buttonLabel}
    </button>

    {#if menuOpen}
        <div class="chart-download-popover" role="menu" aria-label="Chart download options">
            <button
                type="button"
                class="chart-download-option"
                role="menuitem"
                onclick={() => downloadChart('png')}
                disabled={exportBusy}
            >
                PNG
            </button>
            <button
                type="button"
                class="chart-download-option"
                role="menuitem"
                onclick={() => downloadChart('jpeg')}
                disabled={exportBusy}
            >
                JPEG
            </button>
        </div>
    {/if}
</div>
