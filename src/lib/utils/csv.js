const DEFAULT_FILENAME = 'export.csv';

export function escapeCsv(value) {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function normalizeFilename(filename) {
    if (!filename) return DEFAULT_FILENAME;
    return filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
}

/**
 * The CSV text for `rows`. Each column's `format` gets the value alone: the formatters take
 * options as their second argument (formatSignedMetric's decimals, formatNullable's fallback),
 * and passing the row there rounded every signed metric to a whole number.
 */
export function csvText({ rows = [], columns = [] }) {
    const header = columns.map((col) => escapeCsv(col.header || '')).join(',');
    const body = rows.map((row) => {
        return columns.map((col) => {
            const raw = typeof col.accessor === 'function'
                ? col.accessor(row)
                : row[col.accessor];
            const value = col.format ? col.format(raw) : raw;
            return escapeCsv(value);
        }).join(',');
    }).join('\r\n');
    return `\uFEFF${header}\r\n${body}`;
}

export function downloadCsv({ rows = [], columns = [], filename = DEFAULT_FILENAME }) {
    if (!rows.length || !columns.length) return;

    const csv = csvText({ rows, columns });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = normalizeFilename(filename);
    anchor.click();
    URL.revokeObjectURL(url);
}
