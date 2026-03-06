import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CHART_QUICK_EXPORT_FORMAT,
    CHART_QUICK_EXPORT_LONG_PRESS_MS,
    CHART_QUICK_EXPORT_MOVE_TOLERANCE_PX,
    setupQuickChartExport
} from '../src/lib/utils/chartQuickExport.js';

class FakeEventTarget {
    constructor() {
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        const bucket = this.listeners.get(type) ?? new Set();
        bucket.add(listener);
        this.listeners.set(type, bucket);
    }

    removeEventListener(type, listener) {
        const bucket = this.listeners.get(type);
        if (!bucket) return;
        bucket.delete(listener);
        if (bucket.size === 0) {
            this.listeners.delete(type);
        }
    }

    dispatch(type, eventInit = {}) {
        const event = {
            type,
            defaultPrevented: false,
            preventDefault() {
                this.defaultPrevented = true;
            },
            ...eventInit
        };

        for (const listener of [...(this.listeners.get(type) ?? [])]) {
            listener(event);
        }

        return event;
    }
}

function createFakeTimers() {
    let now = 0;
    let nextId = 1;
    const timers = new Map();

    function setTimeoutFn(callback, delay = 0) {
        const id = nextId++;
        timers.set(id, {
            callback,
            runAt: now + Math.max(0, delay)
        });
        return id;
    }

    function clearTimeoutFn(id) {
        timers.delete(id);
    }

    function advance(ms) {
        now += ms;

        while (true) {
            const due = [...timers.entries()]
                .filter(([, timer]) => timer.runAt <= now)
                .sort((a, b) => a[1].runAt - b[1].runAt || a[0] - b[0])[0];

            if (!due) break;

            const [id, timer] = due;
            timers.delete(id);
            timer.callback();
        }
    }

    return {
        setTimeoutFn,
        clearTimeoutFn,
        advance
    };
}

test('desktop contextmenu triggers one PNG quick export', () => {
    const targetEl = new FakeEventTarget();
    const timers = createFakeTimers();
    const exports = [];

    const cleanup = setupQuickChartExport({
        targetEl,
        onQuickExport: (format) => exports.push(format),
        setTimeoutFn: timers.setTimeoutFn,
        clearTimeoutFn: timers.clearTimeoutFn
    });

    const event = targetEl.dispatch('contextmenu', { pointerType: 'mouse' });

    assert.equal(event.defaultPrevented, true);
    assert.deepEqual(exports, [CHART_QUICK_EXPORT_FORMAT]);

    cleanup();
});

test('short touch tap does not export', () => {
    const targetEl = new FakeEventTarget();
    const timers = createFakeTimers();
    const exports = [];

    const cleanup = setupQuickChartExport({
        targetEl,
        onQuickExport: (format) => exports.push(format),
        setTimeoutFn: timers.setTimeoutFn,
        clearTimeoutFn: timers.clearTimeoutFn
    });

    targetEl.dispatch('pointerdown', {
        pointerType: 'touch',
        pointerId: 7,
        clientX: 32,
        clientY: 24
    });
    timers.advance(CHART_QUICK_EXPORT_LONG_PRESS_MS - 1);
    targetEl.dispatch('pointerup', {
        pointerType: 'touch',
        pointerId: 7,
        clientX: 32,
        clientY: 24
    });

    assert.deepEqual(exports, []);

    cleanup();
});

test('touch long press exports on release after the threshold', () => {
    const targetEl = new FakeEventTarget();
    const timers = createFakeTimers();
    const exports = [];

    const cleanup = setupQuickChartExport({
        targetEl,
        onQuickExport: (format) => exports.push(format),
        setTimeoutFn: timers.setTimeoutFn,
        clearTimeoutFn: timers.clearTimeoutFn
    });

    targetEl.dispatch('pointerdown', {
        pointerType: 'touch',
        pointerId: 9,
        clientX: 18,
        clientY: 12
    });
    timers.advance(CHART_QUICK_EXPORT_LONG_PRESS_MS);

    assert.deepEqual(exports, [], 'long press should arm but not export before release');

    targetEl.dispatch('pointerup', {
        pointerType: 'touch',
        pointerId: 9,
        clientX: 18,
        clientY: 12
    });

    assert.deepEqual(exports, [CHART_QUICK_EXPORT_FORMAT]);

    cleanup();
});

test('moving beyond the tolerance cancels a pending long press', () => {
    const targetEl = new FakeEventTarget();
    const timers = createFakeTimers();
    const exports = [];

    const cleanup = setupQuickChartExport({
        targetEl,
        onQuickExport: (format) => exports.push(format),
        setTimeoutFn: timers.setTimeoutFn,
        clearTimeoutFn: timers.clearTimeoutFn
    });

    targetEl.dispatch('pointerdown', {
        pointerType: 'touch',
        pointerId: 11,
        clientX: 40,
        clientY: 40
    });
    targetEl.dispatch('pointermove', {
        pointerType: 'touch',
        pointerId: 11,
        clientX: 40 + CHART_QUICK_EXPORT_MOVE_TOLERANCE_PX + 1,
        clientY: 40
    });
    timers.advance(CHART_QUICK_EXPORT_LONG_PRESS_MS);
    targetEl.dispatch('pointerup', {
        pointerType: 'touch',
        pointerId: 11,
        clientX: 40 + CHART_QUICK_EXPORT_MOVE_TOLERANCE_PX + 1,
        clientY: 40
    });

    assert.deepEqual(exports, []);

    cleanup();
});

test('touch contextmenu after a completed long press does not double export', () => {
    const targetEl = new FakeEventTarget();
    const timers = createFakeTimers();
    const exports = [];

    const cleanup = setupQuickChartExport({
        targetEl,
        onQuickExport: (format) => exports.push(format),
        setTimeoutFn: timers.setTimeoutFn,
        clearTimeoutFn: timers.clearTimeoutFn
    });

    targetEl.dispatch('pointerdown', {
        pointerType: 'touch',
        pointerId: 13,
        clientX: 48,
        clientY: 52
    });
    timers.advance(CHART_QUICK_EXPORT_LONG_PRESS_MS);
    targetEl.dispatch('pointerup', {
        pointerType: 'touch',
        pointerId: 13,
        clientX: 48,
        clientY: 52
    });

    const touchContextMenu = targetEl.dispatch('contextmenu', { pointerType: 'touch' });

    assert.equal(touchContextMenu.defaultPrevented, true);
    assert.deepEqual(exports, [CHART_QUICK_EXPORT_FORMAT]);

    cleanup();
});

test('mouse contextmenu still exports during the touch suppression window', () => {
    const targetEl = new FakeEventTarget();
    const timers = createFakeTimers();
    const exports = [];

    const cleanup = setupQuickChartExport({
        targetEl,
        onQuickExport: (format) => exports.push(format),
        setTimeoutFn: timers.setTimeoutFn,
        clearTimeoutFn: timers.clearTimeoutFn
    });

    targetEl.dispatch('pointerdown', {
        pointerType: 'touch',
        pointerId: 17,
        clientX: 64,
        clientY: 64
    });
    timers.advance(CHART_QUICK_EXPORT_LONG_PRESS_MS);
    targetEl.dispatch('pointerup', {
        pointerType: 'touch',
        pointerId: 17,
        clientX: 64,
        clientY: 64
    });

    const mouseContextMenu = targetEl.dispatch('contextmenu', { pointerType: 'mouse' });

    assert.equal(mouseContextMenu.defaultPrevented, true);
    assert.deepEqual(exports, [CHART_QUICK_EXPORT_FORMAT, CHART_QUICK_EXPORT_FORMAT]);

    cleanup();
});
