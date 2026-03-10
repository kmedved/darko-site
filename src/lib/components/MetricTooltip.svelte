<script>
    let { text = '', children } = $props();

    const viewportPadding = 12;
    const tooltipGap = 10;
    const tooltipUid = $props.id();
    const tooltipId = `${tooltipUid}-bubble`;

    let anchorEl = $state(null);
    let triggerEl = $state(null);
    let bubbleEl = $state(null);
    let isOpen = $state(false);
    let bubbleStyle = $state('');
    let lastPointerType = $state('');

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function updatePosition() {
        if (!anchorEl || !bubbleEl) {
            return;
        }

        const anchorRect = anchorEl.getBoundingClientRect();
        const bubbleRect = bubbleEl.getBoundingClientRect();
        const maxLeft = Math.max(viewportPadding, window.innerWidth - bubbleRect.width - viewportPadding);
        const left = clamp(
            anchorRect.left + (anchorRect.width - bubbleRect.width) / 2,
            viewportPadding,
            maxLeft
        );

        const preferredAbove = anchorRect.top - bubbleRect.height - tooltipGap;
        const fitsAbove = preferredAbove >= viewportPadding;
        const top = fitsAbove
            ? preferredAbove
            : anchorRect.bottom + tooltipGap;

        bubbleStyle = `left: ${left}px; top: ${top}px;`;
    }

    function openTooltip() {
        isOpen = true;
    }

    function closeTooltip() {
        isOpen = false;
    }

    function handleTriggerPointerDown(event) {
        lastPointerType = typeof event.pointerType === 'string' ? event.pointerType : '';
    }

    function handleTriggerClick(event) {
        event.stopPropagation();

        const pointerType = lastPointerType;
        lastPointerType = '';

        if (pointerType === 'touch' || pointerType === 'pen') {
            isOpen = !isOpen;
            return;
        }

        openTooltip();
    }

    function handleFocusOut(event) {
        if (anchorEl?.contains(event.relatedTarget)) {
            return;
        }

        closeTooltip();
    }

    function handleKeydown(event) {
        if (event.key !== 'Escape') {
            return;
        }

        event.stopPropagation();
        closeTooltip();
        triggerEl?.blur();
    }

    $effect(() => {
        if (!isOpen || !anchorEl || !bubbleEl) {
            return;
        }

        updatePosition();

        const handleScrollOrResize = () => {
            updatePosition();
        };

        const handlePointerDown = (event) => {
            if (anchorEl?.contains(event.target)) {
                return;
            }

            closeTooltip();
        };

        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('pointerdown', handlePointerDown, true);

        return () => {
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('pointerdown', handlePointerDown, true);
        };
    });
</script>

<span
    class="metric-tooltip"
    bind:this={anchorEl}
    role="group"
    onmouseenter={openTooltip}
    onmouseleave={closeTooltip}
    onfocusin={openTooltip}
    onfocusout={handleFocusOut}
>
    <button
        type="button"
        class="metric-tooltip-trigger"
        bind:this={triggerEl}
        aria-label="Show metric definition"
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onpointerdown={handleTriggerPointerDown}
        onclick={handleTriggerClick}
        onkeydown={handleKeydown}
    >
        <span class="metric-tooltip-label">
            {@render children?.()}
        </span>
    </button>

    {#if isOpen}
        <span
            id={tooltipId}
            class="metric-tooltip-bubble"
            bind:this={bubbleEl}
            role="tooltip"
            style={bubbleStyle}
        >
            {text}
        </span>
    {/if}
</span>

<style>
    .metric-tooltip {
        display: inline-flex;
        align-items: center;
        position: relative;
    }

    .metric-tooltip-label {
        display: inline-flex;
        align-items: center;
    }

    .metric-tooltip-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        color: inherit;
        line-height: inherit;
        letter-spacing: inherit;
        text-transform: inherit;
        background: none;
        padding: 0;
        font: inherit;
        cursor: help;
    }

    .metric-tooltip-trigger:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
        border-radius: 2px;
    }

    .metric-tooltip-bubble {
        position: fixed;
        width: max-content;
        max-width: min(250px, calc(100vw - 24px));
        padding: 8px 10px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0;
        line-height: 1.35;
        text-transform: none;
        white-space: normal;
        pointer-events: none;
        z-index: 220;
    }
</style>
