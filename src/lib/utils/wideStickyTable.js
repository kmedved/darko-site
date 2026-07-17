export function setupWideStickyTable({
    root,
    bodyScroller,
    bodyTable,
    sourceHead,
    headerScroller,
    headerTable,
    wheelTarget
}) {
    if (!root || !bodyScroller || !bodyTable || !sourceHead || !headerScroller || !headerTable) {
        return () => {};
    }

    let rafId = 0;

    const scheduleSync = () => {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
            rafId = 0;
            syncLayout();
        });
    };

    const syncLayout = () => {
        if (
            !root.isConnected ||
            !bodyScroller.isConnected ||
            !bodyTable.isConnected ||
            !sourceHead.isConnected ||
            !headerScroller.isConnected ||
            !headerTable.isConnected
        ) {
            return;
        }

        const sizingCells = Array.from(sourceHead.querySelectorAll('.table-sizing-row th'));
        const sourceCells = sizingCells.length > 0
            ? sizingCells
            : Array.from(sourceHead.querySelectorAll('th'));
        const headerCells = Array.from(headerTable.querySelectorAll('th'));

        if (sourceCells.length === 0 || sourceCells.length !== headerCells.length) {
            return;
        }

        headerTable.style.width = `${Math.ceil(bodyTable.getBoundingClientRect().width)}px`;

        for (let index = 0; index < sourceCells.length; index += 1) {
            const width = Math.ceil(sourceCells[index].getBoundingClientRect().width);
            const headerCell = headerCells[index];

            headerCell.style.width = `${width}px`;
            headerCell.style.minWidth = `${width}px`;
            headerCell.style.maxWidth = `${width}px`;
        }

        const sizingRows = Array.from(sourceHead.querySelectorAll('.table-sizing-row'));
        const sourceHeaderHeight = sizingRows.length > 0
            ? sizingRows.reduce((height, row) => height + row.getBoundingClientRect().height, 0)
            : sourceHead.getBoundingClientRect().height;
        root.style.setProperty('--wide-sticky-header-height', `${Math.ceil(sourceHeaderHeight)}px`);

        headerScroller.scrollLeft = bodyScroller.scrollLeft;
    };

    const handleBodyScroll = () => {
        if (headerScroller.scrollLeft !== bodyScroller.scrollLeft) {
            headerScroller.scrollLeft = bodyScroller.scrollLeft;
        }
    };

    const handleHeaderWheel = (event) => {
        const horizontalDelta = event.deltaX || (event.shiftKey ? event.deltaY : 0);

        if (!horizontalDelta) {
            return;
        }

        event.preventDefault();
        bodyScroller.scrollLeft += horizontalDelta;
    };

    const resizeObserver =
        typeof ResizeObserver === 'undefined'
            ? null
            : new ResizeObserver(() => {
                  scheduleSync();
              });

    resizeObserver?.observe(bodyScroller);
    resizeObserver?.observe(bodyTable);
    resizeObserver?.observe(sourceHead);

    bodyScroller.addEventListener('scroll', handleBodyScroll, { passive: true });
    (wheelTarget || headerScroller).addEventListener('wheel', handleHeaderWheel, { passive: false });
    window.addEventListener('resize', scheduleSync);

    scheduleSync();

    return () => {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }

        bodyScroller.removeEventListener('scroll', handleBodyScroll);
        (wheelTarget || headerScroller).removeEventListener('wheel', handleHeaderWheel);
        window.removeEventListener('resize', scheduleSync);
        resizeObserver?.disconnect();
    };
}
