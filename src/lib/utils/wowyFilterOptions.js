/**
 * Complete team and height choices for the all-time WOWY filters. The all-time table loads 100
 * player-seasons at a time, so options built from loaded rows would miss most teams.
 */

/** Team choices from rows carrying paired `team_codes` and `team_names`, sorted by label. */
export function teamOptionsFromRows(rows) {
    const names = new Map();
    for (const row of rows ?? []) {
        const codes = Array.isArray(row?.team_codes) ? row.team_codes : [];
        const teamNames = Array.isArray(row?.team_names) ? row.team_names : [];
        codes.forEach((code, index) => {
            const value = typeof code === 'string' ? code.trim() : '';
            if (!value) return;
            const name = typeof teamNames[index] === 'string' ? teamNames[index].trim() : '';
            if (!names.has(value)) names.set(value, []);
            if (name && !names.get(value).includes(name)) names.get(value).push(name);
        });
    }
    return [...names]
        .map(([value, teamNames]) => {
            const title = teamNames.join(' / ');
            return { value, label: title && title !== value ? `${value} — ${title}` : value, title: title || undefined };
        })
        .sort((left, right) => left.label.localeCompare(right.label));
}

/** Whole-inch heights in the 60–96 inch range the leaderboard filters accept. */
export function heightOptionsFromRows(rows) {
    const heights = new Set();
    for (const row of rows ?? []) {
        const height = Number(row?.height);
        if (Number.isFinite(height) && height >= 60 && height <= 96) heights.add(Math.round(height));
    }
    return [...heights].sort((left, right) => left - right);
}
