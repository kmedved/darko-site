export function withResizeObserver({ element, onResize, observe = true }) {
    if (!observe || !element) {
        return () => {};
    }

    if (typeof ResizeObserver === 'undefined') {
        return () => {};
    }

    let rafId = 0;

    const scheduleRender = () => {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            onResize();
        });
    };

    const ro = new ResizeObserver(() => {
        scheduleRender();
    });

    ro.observe(element);

    return () => {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }

        if (ro) {
            ro.disconnect();
        }
    };
}
