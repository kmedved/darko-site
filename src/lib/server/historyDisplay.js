import { isBurnInRow } from '../utils/historyBurnIn.js';

/**
 * The displayed version of a history payload: 1996–97 DPM rows blend WOWY in (wowy1997.js), everything else is
 * unchanged. Accepts a rows array or a { rows, ... } payload and loads the WOWY extract only when a row needs it.
 */
export async function displayHistory(history) {
    const rows = Array.isArray(history) ? history : history?.rows;
    if (!Array.isArray(rows) || !rows.some(isBurnInRow)) return history;
    const { blendHistoricalRows } = await import('./wowy1997.js');
    const blended = blendHistoricalRows(rows);
    return Array.isArray(history) ? blended : { ...history, rows: blended };
}
