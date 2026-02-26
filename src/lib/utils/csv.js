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

export function downloadCsv({ rows = [], columns = [], filename = DEFAULT_FILENAME }) {
    if (!rows.length || !columns.length) return;

    const header = columns.map((col) => escapeCsv(col.header || '')).join(',');
    const body = rows.map((row) => {
        return columns.map((col) => {
            const raw = typeof col.accessor === 'function'
                ? col.accessor(row)
                : row[col.accessor];
            const value = col.format ? col.format(raw, row) : raw;
            return escapeCsv(value);
        }).join(',');
    }).join('\r\n');

    const csv = `\uFEFF${header}\r\n${body}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = normalizeFilename(filename);
    anchor.click();
    URL.revokeObjectURL(url);
}
