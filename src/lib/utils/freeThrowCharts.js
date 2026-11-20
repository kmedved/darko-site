// Helpers shared by the free-throw post's charts.

// Signed number with a real minus sign: +4.2, −2.9.
export const signed = (v, d = 1) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(d)}`;

export const count = (n) => n.toLocaleString('en-US');

// Where to put a tooltip for a pointer or focus event, kept inside the figure so a phone never
// scrolls sideways. Returns { x, y, w } in the figure's coordinates.
export function placeTooltip(figureEl, event, maxWidth = 240) {
	const rect = figureEl.getBoundingClientRect();
	let px;
	let py;
	if (event && 'clientX' in event && event.clientX) {
		px = event.clientX - rect.left;
		py = event.clientY - rect.top;
	} else {
		const box = event.currentTarget.getBoundingClientRect();
		px = box.left + box.width / 2 - rect.left;
		py = box.top + box.height / 2 - rect.top;
	}
	const w = Math.min(maxWidth, rect.width - 16);
	const left = px + 14 + w > rect.width - 8 ? px - 14 - w : px + 14;
	return { x: Math.max(8, Math.min(rect.width - w - 8, left)), y: py + 16, w };
}

// A bar with a rounded data end and a flat base. Vertical: base and end are y values.
export function vBarPath(x0, w, base, end) {
	const r = Math.max(0, Math.min(4, Math.abs(base - end), w / 2));
	return `M${x0},${base} V${end + r} Q${x0},${end} ${x0 + r},${end} H${x0 + w - r} Q${x0 + w},${end} ${x0 + w},${end + r} V${base} Z`;
}

// Horizontal: base and end are x values; the end may be left or right of the base.
export function hBarPath(y0, h, base, end) {
	const r = Math.max(0, Math.min(4, Math.abs(end - base), h / 2));
	const s = end >= base ? 1 : -1;
	return `M${base},${y0} H${end - s * r} Q${end},${y0} ${end},${y0 + r} V${y0 + h - r} Q${end},${y0 + h} ${end - s * r},${y0 + h} H${base} Z`;
}
