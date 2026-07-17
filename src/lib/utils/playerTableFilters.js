function parseFilterNumber(value) {
	const normalized = String(value)
		.trim()
		.replace(/[$,%]/g, '')
		.replace(/m$/i, '')
		.replace(/,/g, '');
	return Number.parseFloat(normalized);
}

/** Filter players by column filters. Supports text substring, >N, <N, and exact match for numbers. */
export function filterPlayers(players, columns, columnFilters) {
	return players.filter((p) => {
		for (const col of columns) {
			const filter = (columnFilters[col.key] || '').trim();
			if (!filter) continue;

			const val = p[col.key];

			if (col.type === 'text') {
				if (!String(val || '').toLowerCase().includes(filter.toLowerCase())) return false;
			} else {
				const rawNumber = Number.parseFloat(val);
				const filterScale = Number.isFinite(col.filterScale) ? col.filterScale : 1;
				const num = rawNumber * filterScale;
				if (filter.startsWith('>')) {
					const threshold = parseFilterNumber(filter.slice(1));
					if (!Number.isFinite(threshold) || !Number.isFinite(num) || num <= threshold)
						return false;
				} else if (filter.startsWith('<')) {
					const threshold = parseFilterNumber(filter.slice(1));
					if (!Number.isFinite(threshold) || !Number.isFinite(num) || num >= threshold)
						return false;
				} else {
					const threshold = parseFilterNumber(filter);
					if (Number.isFinite(threshold)) {
						if (!Number.isFinite(num) || Math.abs(num - threshold) > 0.05) return false;
					}
				}
			}
		}
		return true;
	});
}
