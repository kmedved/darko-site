/**
 * Column-by-column transport for long row lists. A career history repeats ~26 field names on
 * every one of ~1,500 rows; sending each field once cuts the payload by more than half, and the
 * page rebuilds identical row objects.
 */

export function packRows(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const keys = [];
    const seen = new Set();
    for (const row of list) {
        for (const key of Object.keys(row ?? {})) {
            if (!seen.has(key)) {
                seen.add(key);
                keys.push(key);
            }
        }
    }
    return { keys, values: keys.map((key) => list.map((row) => row?.[key] ?? null)) };
}

export function unpackRows(packed) {
    const keys = packed?.keys ?? [];
    const values = packed?.values ?? [];
    const length = values[0]?.length ?? 0;
    const rows = new Array(length);
    for (let index = 0; index < length; index += 1) {
        const row = {};
        for (let column = 0; column < keys.length; column += 1) row[keys[column]] = values[column][index];
        rows[index] = row;
    }
    return rows;
}
