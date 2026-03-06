export const CHART_QUICK_EXPORT_FORMAT = 'png';
export const CHART_QUICK_EXPORT_LONG_PRESS_MS = 550;
export const CHART_QUICK_EXPORT_MOVE_TOLERANCE_PX = 10;
const TOUCH_CONTEXT_MENU_SUPPRESS_MS = 800;

function isEventTarget(value) {
    return !!value && typeof value.addEventListener === 'function' && typeof value.removeEventListener === 'function';
}

function getPointerType(event) {
    return typeof event?.pointerType === 'string' ? event.pointerType : '';
}

function getClientCoordinate(event, axis) {
    const value = axis === 'x' ? event?.clientX : event?.clientY;
    return Number.isFinite(value) ? value : 0;
}

export function setupQuickChartExport({
    targetEl = null,
    canExport = () => true,
    onQuickExport = () => {},
    longPressMs = CHART_QUICK_EXPORT_LONG_PRESS_MS,
    moveTolerancePx = CHART_QUICK_EXPORT_MOVE_TOLERANCE_PX,
    setTimeoutFn = globalThis.setTimeout?.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout?.bind(globalThis)
} = {}) {
    if (!isEventTarget(targetEl) || typeof onQuickExport !== 'function') {
        return () => {};
    }

    let touchPress = null;
    let suppressTouchContextMenu = false;
    let suppressTouchContextMenuTimer = null;

    function clearTimer(timerId) {
        if (timerId === null || typeof clearTimeoutFn !== 'function') return;
        clearTimeoutFn(timerId);
    }

    function resetTouchPress() {
        if (!touchPress) return;
        clearTimer(touchPress.timerId);
        touchPress = null;
    }

    function beginSuppressingTouchContextMenu() {
        suppressTouchContextMenu = true;
        clearTimer(suppressTouchContextMenuTimer);

        if (typeof setTimeoutFn !== 'function') {
            return;
        }

        suppressTouchContextMenuTimer = setTimeoutFn(() => {
            suppressTouchContextMenu = false;
            suppressTouchContextMenuTimer = null;
        }, TOUCH_CONTEXT_MENU_SUPPRESS_MS);
    }

    function matchesActiveTouch(event) {
        return !!touchPress && event?.pointerId === touchPress.pointerId;
    }

    function handleContextMenu(event) {
        if (!canExport()) return;

        const pointerType = getPointerType(event);
        const touchContextMenuActive = pointerType === 'touch' || touchPress !== null;
        const suppressedFollowupContextMenu =
            suppressTouchContextMenu && pointerType !== 'mouse' && pointerType !== 'pen';
        const treatAsTouchContextMenu = touchContextMenuActive || suppressedFollowupContextMenu;

        if (treatAsTouchContextMenu) {
            event.preventDefault();
            return;
        }

        event.preventDefault();
        void onQuickExport(CHART_QUICK_EXPORT_FORMAT, event);
    }

    function handlePointerDown(event) {
        if (getPointerType(event) !== 'touch' || !canExport()) return;

        resetTouchPress();

        const timerId = typeof setTimeoutFn === 'function'
            ? setTimeoutFn(() => {
                if (touchPress && touchPress.pointerId === event.pointerId) {
                    touchPress.armed = true;
                }
            }, longPressMs)
            : null;

        touchPress = {
            pointerId: event.pointerId,
            startX: getClientCoordinate(event, 'x'),
            startY: getClientCoordinate(event, 'y'),
            armed: false,
            timerId
        };
    }

    function handlePointerMove(event) {
        if (!matchesActiveTouch(event)) return;

        const deltaX = getClientCoordinate(event, 'x') - touchPress.startX;
        const deltaY = getClientCoordinate(event, 'y') - touchPress.startY;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance > moveTolerancePx) {
            resetTouchPress();
        }
    }

    function handlePointerEnd(event) {
        if (!matchesActiveTouch(event)) return;

        const armed = touchPress.armed;
        resetTouchPress();

        if (!armed || !canExport()) return;

        beginSuppressingTouchContextMenu();
        void onQuickExport(CHART_QUICK_EXPORT_FORMAT, event);
    }

    function handlePointerCancel(event) {
        if (!matchesActiveTouch(event)) return;
        resetTouchPress();
    }

    targetEl.addEventListener('contextmenu', handleContextMenu);
    targetEl.addEventListener('pointerdown', handlePointerDown);
    targetEl.addEventListener('pointermove', handlePointerMove);
    targetEl.addEventListener('pointerup', handlePointerEnd);
    targetEl.addEventListener('pointercancel', handlePointerCancel);
    targetEl.addEventListener('pointerleave', handlePointerCancel);

    return () => {
        targetEl.removeEventListener('contextmenu', handleContextMenu);
        targetEl.removeEventListener('pointerdown', handlePointerDown);
        targetEl.removeEventListener('pointermove', handlePointerMove);
        targetEl.removeEventListener('pointerup', handlePointerEnd);
        targetEl.removeEventListener('pointercancel', handlePointerCancel);
        targetEl.removeEventListener('pointerleave', handlePointerCancel);
        resetTouchPress();
        clearTimer(suppressTouchContextMenuTimer);
        suppressTouchContextMenu = false;
        suppressTouchContextMenuTimer = null;
    };
}
