<script>
    import { copyChartImageToClipboard, exportChartImage } from '$lib/utils/chartImageExport.js';
    import { setupQuickChartExport } from '$lib/utils/chartQuickExport.js';

    const CONTEXT_MENU_VIEWPORT_PADDING = 8;
    const CONTEXT_MENU_ESTIMATED_WIDTH = 176;
    const CONTEXT_MENU_ESTIMATED_HEIGHT = 148;

    let {
        svgEl = null,
        captureRootEl = null,
        filenameBase = 'chart',
        disabled = false,
        buttonLabel = 'Download',
        buttonAriaLabel = buttonLabel
    } = $props();

    let menuRootEl = $state(null);
    let menuOpen = $state(false);
    let menuPlacement = $state('button');
    let contextMenuPosition = $state({ x: 0, y: 0 });
    let exportBusy = $state(false);
    let copyBusy = $state(false);
    let actionError = $state(null);

    const actionBusy = $derived(exportBusy || copyBusy);
    const canExport = $derived(!disabled && !!svgEl && !actionBusy);
    const interactionTargetEl = $derived(svgEl?.parentElement ?? null);
    const triggerLabel = $derived(copyBusy ? 'Copying...' : exportBusy ? 'Exporting...' : buttonLabel);
    const popoverStyle = $derived(
        menuPlacement === 'context'
            ? `left: ${contextMenuPosition.x}px; top: ${contextMenuPosition.y}px;`
            : null
    );

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

    $effect(() => {
        if (!interactionTargetEl) return;

        return setupQuickChartExport({
            targetEl: interactionTargetEl,
            canExport: () => canExport,
            onQuickExport: (_format, event) => openContextMenu(event)
        });
    });

    function closeMenu() {
        menuOpen = false;
        actionError = null;
    }

    function getContextMenuPosition(event) {
        const fallbackRect = interactionTargetEl?.getBoundingClientRect?.();
        const fallbackX = fallbackRect ? fallbackRect.left + 16 : CONTEXT_MENU_VIEWPORT_PADDING;
        const fallbackY = fallbackRect ? fallbackRect.top + 16 : CONTEXT_MENU_VIEWPORT_PADDING;
        const rawX = Number.isFinite(event?.clientX) && event.clientX > 0 ? event.clientX : fallbackX;
        const rawY = Number.isFinite(event?.clientY) && event.clientY > 0 ? event.clientY : fallbackY;
        const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
        const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
        const maxX = Math.max(
            CONTEXT_MENU_VIEWPORT_PADDING,
            viewportWidth - CONTEXT_MENU_ESTIMATED_WIDTH - CONTEXT_MENU_VIEWPORT_PADDING
        );
        const maxY = Math.max(
            CONTEXT_MENU_VIEWPORT_PADDING,
            viewportHeight - CONTEXT_MENU_ESTIMATED_HEIGHT - CONTEXT_MENU_VIEWPORT_PADDING
        );

        return {
            x: Math.min(Math.max(CONTEXT_MENU_VIEWPORT_PADDING, rawX), maxX),
            y: Math.min(Math.max(CONTEXT_MENU_VIEWPORT_PADDING, rawY), maxY)
        };
    }

    function openContextMenu(event) {
        if (!canExport) return;

        actionError = null;
        menuPlacement = 'context';
        contextMenuPosition = getContextMenuPosition(event);
        menuOpen = true;
    }

    function toggleMenu() {
        if (!canExport) return;

        actionError = null;
        menuPlacement = 'button';
        menuOpen = !menuOpen;
    }

    async function downloadChart(format) {
        if (!canExport) return;

        menuOpen = false;
        exportBusy = true;
        actionError = null;

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
            actionError = error?.message || 'Chart download failed.';
            menuOpen = true;
        } finally {
            exportBusy = false;
        }
    }

    async function copyChart() {
        if (!canExport) return;

        copyBusy = true;
        actionError = null;

        try {
            await copyChartImageToClipboard({
                svgEl,
                captureRootEl,
                scale: 2
            });
            closeMenu();
        } catch (error) {
            console.error(error);
            actionError = error?.message || 'Chart copy failed.';
        } finally {
            copyBusy = false;
        }
    }
</script>

<div class="chart-download-menu" bind:this={menuRootEl}>
    <button
        type="button"
        class="page-action-btn chart-download-trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen ? 'true' : 'false'}
        aria-label={buttonAriaLabel}
        onclick={toggleMenu}
        disabled={!canExport}
    >
        {triggerLabel}
    </button>

    {#if menuOpen}
        <div
            class="chart-download-popover"
            class:chart-download-popover--context={menuPlacement === 'context'}
            style={popoverStyle}
            role="menu"
            aria-label="Chart actions"
        >
            <button
                type="button"
                class="chart-download-option"
                role="menuitem"
                onclick={() => downloadChart('png')}
                disabled={actionBusy}
            >
                Download PNG
            </button>
            <button
                type="button"
                class="chart-download-option"
                role="menuitem"
                onclick={() => downloadChart('jpeg')}
                disabled={actionBusy}
            >
                Download JPEG
            </button>
            <button
                type="button"
                class="chart-download-option"
                role="menuitem"
                onclick={copyChart}
                disabled={actionBusy}
            >
                Copy PNG
            </button>
            {#if actionError}
                <p class="chart-download-error" role="alert">{actionError}</p>
            {/if}
        </div>
    {/if}
</div>
