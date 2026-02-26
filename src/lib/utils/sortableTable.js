function isMissingValue(value) {
    return (
        value === null ||
        value === undefined ||
        value === '' ||
        value === '—' ||
        value === '--'
    );
}

function parseNumeric(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (value === null || value === undefined) return null;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const parsed = Number.parseFloat(trimmed.replace(/,/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function normalizeValue(value, type = 'text') {
    if (isMissingValue(value)) return null;

    if (type === 'number') {
        return parseNumeric(value);
    }

    if (type === 'percent') {
        return parseNumeric(String(value).replace(/%/g, '').trim());
    }

    if (type === 'record') {
        if (typeof value === 'string') {
            const recordMatch = value.trim().match(/^(\d+)\s*-\s*\d+/);
            if (recordMatch) return parseNumeric(recordMatch[1]);
        }
        return parseNumeric(value);
    }

    return String(value).toLowerCase().trim();
}

export function getSortedRows(rows, options = {}) {
    const {
        sortColumn = null,
        sortDirection = 'asc',
        sortConfigs = {}
    } = options;

    if (!rows || !rows.length || !sortColumn) {
        return rows ? rows.slice() : [];
    }

    const config = sortConfigs[sortColumn] ?? {};
    const sortType = config.type ?? 'text';
    const valueGetter = typeof config.valueGetter === 'function' ? config.valueGetter : null;
    const direction = sortDirection === 'desc' ? -1 : 1;

    const withIndex = rows.map((row, index) => ({ row, index }));

    withIndex.sort((left, right) => {
        const leftValueRaw = valueGetter ? valueGetter(left.row, left.index) : left.row?.[sortColumn];
        const rightValueRaw = valueGetter ? valueGetter(right.row, right.index) : right.row?.[sortColumn];
        const leftValue = normalizeValue(leftValueRaw, sortType);
        const rightValue = normalizeValue(rightValueRaw, sortType);

        const leftMissing = isMissingValue(leftValueRaw) || leftValue === null;
        const rightMissing = isMissingValue(rightValueRaw) || rightValue === null;

        if (leftMissing && rightMissing) return left.index - right.index;
        if (leftMissing) return 1;
        if (rightMissing) return -1;

        if (sortType === 'text') {
            const textCompare = leftValue.localeCompare(rightValue);
            if (textCompare !== 0) return textCompare * direction;
            return left.index - right.index;
        }

        const numericCompare = leftValue - rightValue;
        if (Number.isNaN(numericCompare) || numericCompare === 0) {
            return left.index - right.index;
        }

        return numericCompare * direction;
    });

    return withIndex.map(item => item.row);
}
