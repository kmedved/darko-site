import { writable } from 'svelte/store';

/**
 * The players a reader follows in The Daily, kept in this browser (localStorage) and shared
 * with every star on the page and in other tabs.
 */
const KEY = 'darko-watchlist';

export const watchlist = writable([]);
let started = false;

function read() {
    try {
        const ids = JSON.parse(localStorage.getItem(KEY) ?? '[]');
        return Array.isArray(ids) ? ids.map(Number).filter((id) => Number.isInteger(id) && id > 0) : [];
    } catch {
        return [];
    }
}

/** Load the saved list once in the browser, and follow changes made in other tabs. */
export function startWatchlist() {
    if (started || typeof window === 'undefined') return;
    started = true;
    watchlist.set(read());
    window.addEventListener('storage', (event) => {
        if (event.key === KEY) watchlist.set(read());
    });
}

export function toggleWatch(id) {
    watchlist.update((ids) => {
        const next = ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id];
        try {
            localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
            // Storage can be unavailable; the list still works until the page closes.
        }
        return next;
    });
}
