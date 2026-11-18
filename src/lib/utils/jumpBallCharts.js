// Charts for the jump-ball research post. Each draw function fills an <svg> at a given width and
// returns the height it used. `ctx` carries the data, two series colours (a, b), a third (c), the
// tooltip hook tip(target, html) and, for the ladder, which set of games to show.
// Text uses theme tokens through the t-* classes styled in JumpBallFigure.svelte.

const NS = 'http://www.w3.org/2000/svg';
const STYLE_KEYS = new Set(['fill', 'stroke', 'fill-opacity', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity']);

function h(tag, attrs, parent, text) {
	const el = document.createElementNS(NS, tag);
	let style = '';
	for (const key in attrs) {
		if (STYLE_KEYS.has(key)) style += `${key}:${attrs[key]};`;
		else el.setAttribute(key, attrs[key]);
	}
	if (style) el.setAttribute('style', style);
	if (text != null) el.textContent = text;
	if (parent) parent.appendChild(el);
	return el;
}

export const f1 = (v, d = 1) => v.toFixed(d);
export const signed = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`;
export const seasonLabel = (s) => `${s - 1}-${String(s).slice(2)}`;
export const feetInches = (inches) => `${Math.floor(inches / 12)}'${inches % 12}"`;
const lin = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

// A bar with a rounded data end and a flat base.
function vbar(svg, x, w, base, y, fill) {
	const r = Math.min(4, Math.abs(base - y));
	const d =
		y < base
			? `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`
			: `M${x},${base} V${y - r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y - r} V${base} Z`;
	return h('path', { d, fill }, svg);
}

const gridLine = (svg, x1, x2, y, strong) =>
	h('line', { x1, x2, y1: y, y2: y, stroke: strong ? 'var(--text-muted)' : 'var(--border-subtle)', 'stroke-width': strong ? 1.2 : 1 }, svg);

export const HEADLINE_RATE = 52.81;

function seasons(svg, W, { data, a, tip }) {
	const narrow = W < 520;
	const H = narrow ? 250 : 300;
	const M = { l: 40, r: narrow ? 40 : 84, t: 12, b: 30 };
	const iw = W - M.l - M.r;
	const ih = H - M.t - M.b;
	const S = data.seasons;
	const p = HEADLINE_RATE;
	const X = lin(1998, 2026, M.l, M.l + iw);
	const Y = lin(60, 46, M.t, M.t + ih);
	[46, 50, 54, 58].forEach((v) => {
		gridLine(svg, M.l, M.l + iw, Y(v), v === 50);
		h('text', { x: M.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 't-axis' }, svg, `${v}%`);
	});
	h('line', { x1: M.l, x2: M.l + iw, y1: Y(p), y2: Y(p), stroke: a, 'stroke-width': 1, 'stroke-dasharray': '4 4' }, svg);
	h('text', { x: M.l + iw + 8, y: Y(50) + 4, class: 't-axis' }, svg, narrow ? '50%' : 'coin flip');
	h('text', { x: M.l + iw + 8, y: Y(p) + 4, class: 't-axis' }, svg, narrow ? '52.8' : 'avg 52.8%');
	h('polyline', { points: S.map((d) => `${X(d.s).toFixed(1)},${Y(d.v).toFixed(1)}`).join(' '), fill: 'none', stroke: a, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
	S.forEach((d) => {
		h('circle', { cx: X(d.s), cy: Y(d.v), r: 4, fill: a, stroke: 'var(--bg-surface)', 'stroke-width': 2 }, svg);
		const hit = h('circle', { cx: X(d.s), cy: Y(d.v), r: 11, class: 'hit' }, svg);
		tip(hit, `<b>${seasonLabel(d.s)}</b><br>tip winners won ${f1(d.v)}%<br>${d.n.toLocaleString('en-US')} games`);
	});
	(narrow ? [1998, 2008, 2018, 2026] : [1998, 2003, 2008, 2013, 2018, 2023, 2026]).forEach((s) => {
		h('text', { x: X(s), y: M.t + ih + 20, 'text-anchor': s === 2026 ? 'end' : s === 1998 ? 'start' : 'middle', class: 't-axis' }, svg, seasonLabel(s));
	});
	return H;
}

function quarters(svg, W, { data, a, b, tip }) {
	const stack = W < 560;
	const gap = 36;
	const ph = 206;
	const pw = stack ? W : (W - gap) / 2;
	const panels = [
		{ title: 'EXTRA POSSESSIONS', values: data.quarterPossessions, unit: 'possessions' },
		{ title: 'SCORING MARGIN, POINTS', values: data.quarterPoints, unit: 'points' }
	];
	const max = 0.86;
	panels.forEach((panel, k) => {
		const x0 = stack ? 0 : k * (pw + gap);
		const y0 = stack ? k * (ph + 10) : 0;
		const pt = y0 + 40;
		const pb = y0 + ph - 28;
		const zero = (pt + pb) / 2;
		const half = (pb - pt) / 2;
		h('text', { x: x0, y: y0 + 16, class: 't-panel' }, svg, panel.title);
		h('line', { x1: x0, x2: x0 + pw, y1: zero, y2: zero, stroke: 'var(--text-muted)', 'stroke-width': 1 }, svg);
		const colW = pw / 4;
		const bw = Math.min(46, colW * 0.52);
		panel.values.forEach((v, i) => {
			const x = x0 + colW * i + (colW - bw) / 2;
			const y = zero - (v / max) * half;
			const bar = vbar(svg, x, bw, zero, y, v > 0 ? a : b);
			h('text', { x: x + bw / 2, y: v > 0 ? y - 7 : y + 17, 'text-anchor': 'middle', class: 't-val' }, svg, signed(v, 2));
			h('text', { x: x + bw / 2, y: y0 + ph - 8, 'text-anchor': 'middle', class: 't-axis' }, svg, `Q${i + 1}`);
			tip(bar, `<b>Quarter ${i + 1}</b><br>tip winner ${signed(v, 2)} ${panel.unit} vs the loser`);
		});
	});
	return stack ? ph * 2 + 10 : ph;
}

export const HEIGHT_LABELS = ['−4″ or more', '−3″', '−2″', '−1″', 'even', '+1″', '+2″', '+3″', '+4″ or more'];

function height(svg, W, { data, a, b, tip }) {
	const narrow = W < 520;
	const labels = narrow ? ['≤−4″', '−3″', '−2″', '−1″', '0', '+1″', '+2″', '+3″', '≥+4″'] : HEIGHT_LABELS.map((l) => l.replace(' or more', '+'));
	const M = 6;
	const rates = data.heightRates;
	const top = 34;
	const bot = 206;
	const zero = (top + bot) / 2;
	const half = (bot - top) / 2;
	const maxV = 14.5;
	h('line', { x1: M, x2: W - M, y1: zero, y2: zero, stroke: 'var(--text-muted)', 'stroke-width': 1 }, svg);
	h('text', { x: W - M, y: top - 8, 'text-anchor': 'end', class: 't-axis' }, svg, 'baseline = coin flip (50%)');
	const colW = (W - 2 * M) / rates.length;
	const bw = Math.min(44, colW * 0.56);
	rates.forEach((rate, i) => {
		const v = rate - 50;
		const x = M + colW * i + (colW - bw) / 2;
		const y = zero - (v / maxV) * half;
		const bar = Math.abs(v) < 0.05 ? h('rect', { x, y: zero - 1.5, width: bw, height: 3, fill: 'var(--text-muted)' }, svg) : vbar(svg, x, bw, zero, y, v > 0 ? a : b);
		h('text', { x: x + bw / 2, y: bot + 20, 'text-anchor': 'middle', class: 't-axis' }, svg, labels[i]);
		if (i === 0 || i === rates.length - 1 || i === 4) {
			h('text', { x: x + bw / 2, y: v > 0 ? y - 7 : v < 0 ? y + 17 : zero - 10, 'text-anchor': 'middle', class: 't-val' }, svg, `${f1(rate, 0)}%`);
		}
		tip(bar, `<b>Jumper ${HEIGHT_LABELS[i]} vs the other jumper</b><br>wins the tip ${f1(rate)}% of the time`);
	});
	h('text', { x: W / 2, y: bot + 46, 'text-anchor': 'middle', class: 't-axis' }, svg, 'height difference between the two jumpers (inches)');
	return bot + 56;
}

function jumpers(svg, W, { data, a, tip }) {
	const narrow = W < 520;
	const H = narrow ? 340 : 410;
	const M = { l: 42, r: 14, t: 14, b: 44 };
	const iw = W - M.l - M.r;
	const ih = H - M.t - M.b;
	const J = data.jumpers;
	const X = lin(77, 91, M.l, M.l + iw);
	const Y = lin(85, 20, M.t, M.t + ih);
	[20, 30, 40, 50, 60, 70, 80].forEach((v) => {
		gridLine(svg, M.l, M.l + iw, Y(v), v === 50);
		h('text', { x: M.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 't-axis' }, svg, `${v}%`);
	});
	(narrow ? [78, 82, 86, 90] : [78, 80, 82, 84, 86, 88, 90]).forEach((v) =>
		h('text', { x: X(v), y: M.t + ih + 18, 'text-anchor': 'middle', class: 't-axis' }, svg, feetInches(v))
	);
	h('text', { x: M.l + iw / 2, y: H - 6, 'text-anchor': 'middle', class: 't-axis' }, svg, 'listed height');
	h('text', { x: M.l + 6, y: Y(50) - 6, class: 't-axis' }, svg, 'coin flip');
	const R = (n) => 2.2 + Math.sqrt(n) * 0.2;
	const all = {
		'Victor Wembanyama': 'Wembanyama',
		'Andre Drummond': 'Drummond',
		"Shaquille O'Neal": 'Shaq',
		'Domantas Sabonis': 'Sabonis',
		'Nikola Jokić': 'Jokić',
		'Yao Ming': 'Yao Ming',
		'Shawn Bradley': 'Shawn Bradley',
		'Ben Wallace': 'Ben Wallace'
	};
	const few = ['Victor Wembanyama', 'Andre Drummond', 'Domantas Sabonis', 'Yao Ming', 'Nikola Jokić'];
	const named = Object.fromEntries(Object.entries(all).filter(([k]) => !narrow || few.includes(k)));
	J.slice()
		.sort((p, q) => q.n - p.n)
		.forEach((d) => {
			const on = named[d.name];
			h('circle', { cx: X(d.ht), cy: Y(d.rate), r: R(d.n), fill: a, 'fill-opacity': on ? 1 : 0.45, stroke: 'var(--bg-surface)', 'stroke-width': 1.5 }, svg);
		});
	J.forEach((d) => {
		const hit = h('circle', { cx: X(d.ht), cy: Y(d.rate), r: Math.max(8, R(d.n)), class: 'hit' }, svg);
		tip(hit, `<b>${d.name}</b><br>${feetInches(d.ht)} · ${d.n.toLocaleString('en-US')} jumps<br>won ${f1(d.rate)}% (${seasonLabel(d.s0)} to ${seasonLabel(d.s1)})`);
	});
	J.forEach((d) => {
		const label = named[d.name];
		if (!label) return;
		const left = X(d.ht) > M.l + iw - 90;
		const above = d.name === 'Ben Wallace' || d.name === 'Domantas Sabonis';
		h('text', { x: X(d.ht) + (left ? -R(d.n) - 5 : R(d.n) + 5), y: Y(d.rate) + (above ? -2 : 4), 'text-anchor': left ? 'end' : 'start', class: 't-ann' }, svg, `${label} ${f1(d.rate, 0)}%`);
	});
	return H;
}

function scatter(svg, W, { data, a, tip }) {
	const narrow = W < 520;
	const H = narrow ? 340 : 430;
	const M = { l: 44, r: 16, t: 14, b: 44 };
	const iw = W - M.l - M.r;
	const ih = H - M.t - M.b;
	const X = lin(10, 90, M.l, M.l + iw);
	const Y = lin(90, 5, M.t, M.t + ih);
	[20, 40, 60, 80].forEach((v) => {
		gridLine(svg, M.l, M.l + iw, Y(v), false);
		h('text', { x: M.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 't-axis' }, svg, `${v}%`);
		h('text', { x: X(v), y: M.t + ih + 18, 'text-anchor': 'middle', class: 't-axis' }, svg, `${v}%`);
	});
	h('line', { x1: X(50), x2: X(50), y1: M.t, y2: M.t + ih, stroke: 'var(--border)', 'stroke-width': 1 }, svg);
	h('line', { x1: M.l, x2: M.l + iw, y1: Y(50), y2: Y(50), stroke: 'var(--border)', 'stroke-width': 1 }, svg);
	h('text', { x: M.l + iw / 2, y: H - 6, 'text-anchor': 'middle', class: 't-axis' }, svg, 'share of opening tips won');
	h('text', { x: 12, y: M.t + ih / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${M.t + ih / 2})`, class: 't-axis' }, svg, 'share of games won');
	data.scatter.forEach((d) => h('circle', { cx: X(d.x), cy: Y(d.y), r: narrow ? 2.4 : 3, fill: a, 'fill-opacity': 0.45 }, svg));
	data.scatter.forEach((d) => {
		const hit = h('circle', { cx: X(d.x), cy: Y(d.y), r: 7, class: 'hit' }, svg);
		tip(hit, `<b>${d.l}</b><br>tips ${f1(d.x, 0)}% · wins ${f1(d.y, 0)}%`);
	});
	const notes = [
		{ l: 'CLE 2002-03', t: narrow ? "Big Z's Cavs" : "Big Z's Cavs, 84% of tips", dx: -8, dy: -10, anchor: 'end' },
		{ l: 'LAL 2000-01', t: "Shaq's Lakers", dx: -8, dy: -8, anchor: 'end' },
		{ l: 'CLE 2017-18', t: narrow ? 'LeBron, 2017-18' : "LeBron's 2017-18 Cavs: 21% of tips, 50 wins", dx: 9, dy: -8, anchor: 'start' },
		{ l: 'HOU 2009-10', t: narrow ? 'Scola jumps' : 'Rockets 2009-10: Scola jumping', dx: 9, dy: 15, anchor: 'start' }
	];
	notes.forEach((note) => {
		const d = data.scatter.find((p) => p.l === note.l);
		if (!d) return;
		h('circle', { cx: X(d.x), cy: Y(d.y), r: 5, fill: a, stroke: 'var(--bg-surface)', 'stroke-width': 2 }, svg);
		h('text', { x: X(d.x) + note.dx, y: Y(d.y) + note.dy, 'text-anchor': note.anchor, class: 't-ann' }, svg, note.t);
	});
	return H;
}

function placebo(svg, W, { data, a, b, tip }) {
	const M = { l: 14, r: 14 };
	const iw = W - M.l - M.r;
	const rowH = 72;
	const top = 8;
	const X = lin(46, 54, M.l, M.l + iw);
	data.placebo.forEach((row, i) => {
		const y = top + i * rowH;
		const ly = y + 44;
		h('text', { x: M.l, y: y + 14, class: 't-lbl' }, svg, row.label);
		h('text', { x: M.l + iw, y: y + 14, 'text-anchor': 'end', class: 't-val' }, svg, `gap ${f1(row.win - row.lose)} pts`);
		h('line', { x1: X(row.lose), x2: X(row.win), y1: ly, y2: ly, stroke: 'var(--text)', 'stroke-width': 2 }, svg);
		const won = h('circle', { cx: X(row.win), cy: ly, r: 7, fill: a, stroke: 'var(--bg-surface)', 'stroke-width': 2 }, svg);
		const lost = h('circle', { cx: X(row.lose), cy: ly, r: 7, fill: b, stroke: 'var(--bg-surface)', 'stroke-width': 2 }, svg);
		h('text', { x: X(row.win) + 12, y: ly + 4, class: 't-val' }, svg, `${f1(row.win)}%`);
		h('text', { x: X(row.lose) - 12, y: ly + 4, 'text-anchor': 'end', class: 't-val' }, svg, `${f1(row.lose)}%`);
		tip(won, `<b>${row.label}</b><br>teams that won it won ${f1(row.win)}% of games`);
		tip(lost, `<b>${row.label}</b><br>teams that lost it won ${f1(row.lose)}% of games`);
	});
	const ay = top + data.placebo.length * rowH + 4;
	h('line', { x1: X(50), x2: X(50), y1: top + 24, y2: ay - 4, stroke: 'var(--border)', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
	[46, 48, 50, 52, 54].forEach((v) =>
		h('text', { x: X(v), y: ay + 12, 'text-anchor': v === 46 ? 'start' : v === 54 ? 'end' : 'middle', class: 't-axis' }, svg, `${v}%`)
	);
	h('circle', { cx: M.l + 6, cy: ay + 40, r: 5, fill: a }, svg);
	h('text', { x: M.l + 16, y: ay + 44, class: 't-lbl-s' }, svg, 'won that tip');
	h('circle', { cx: M.l + 126, cy: ay + 40, r: 5, fill: b }, svg);
	h('text', { x: M.l + 136, y: ay + 44, class: 't-lbl-s' }, svg, 'lost that tip');
	return ay + 54;
}

function ladder(svg, W, { data, a, tip }) {
	const rows = data.ladder;
	const narrow = W < 560;
	const rowH = narrow ? 82 : 62;
	const M = { l: 6, r: 10 };
	const top = 8;
	const iw = W - M.l - M.r;
	const X = lin(0, 6, M.l + 4, M.l + iw - 4);
	const H = top + rows.length * rowH + 30;
	const ticks = [0, 2, 4, 6];
	ticks.forEach((v) => {
		h('text', { x: X(v), y: H - 8, 'text-anchor': v === 0 ? 'start' : v === 6 ? 'end' : 'middle', class: 't-axis' }, svg, v === 0 ? 'no edge' : signed(v, 0));
	});
	rows.forEach((row, i) => {
		const y = top + i * rowH;
		if (row.key.startsWith('spread')) {
			h('rect', { x: 0, y: y + 2, width: W, height: rowH - 4, rx: 6, fill: a, 'fill-opacity': 0.1 }, svg);
		}
		ticks.forEach((v) => {
			h('line', { x1: X(v), x2: X(v), y1: y + (narrow ? 26 : 29), y2: y + (narrow ? 52 : rowH - 8), stroke: v === 0 ? 'var(--text)' : 'var(--border)', 'stroke-width': v === 0 ? 1.5 : 1 }, svg);
		});
		const cy = y + (narrow ? 38 : 46);
		h('text', { x: M.l + 2, y: y + 19, class: 't-lbl' }, svg, row.label);
		const range = `${signed(row.est, 2)} pts`;
		if (narrow) h('text', { x: M.l + 2, y: y + 70, class: 't-val' }, svg, range);
		else h('text', { x: W - M.r - 2, y: y + 19, 'text-anchor': 'end', class: 't-val' }, svg, range);
		h('line', { x1: X(0), x2: X(row.est), y1: cy, y2: cy, stroke: a, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
		h('circle', { cx: X(row.est), cy, r: 7, fill: a, stroke: 'var(--bg-surface)', 'stroke-width': 2 }, svg);
		const hit = h('rect', { x: 0, y, width: W, height: rowH, class: 'hit' }, svg);
		tip(hit, `<b>${row.label}</b><br>${row.note}<br>${signed(row.est, 2)} pts`);
	});
	return H;
}

function priced(svg, W, { data, a, b, tip }) {
	const P = data.priced;
	const M = { l: 4, r: 4 };
	const X = lin(50, 54, M.l, W - M.r);
	const barY = 46;
	const barH = 18;
	h('rect', { x: X(50), y: barY, width: X(54) - X(50), height: barH, rx: 4, fill: 'var(--border-subtle)' }, svg);
	const market = h('rect', { x: X(50), y: barY, width: X(P.market) - X(50) - 1, height: barH, rx: 4, fill: a }, svg);
	const left = h('rect', { x: X(P.market) + 1, y: barY, width: X(P.actual) - X(P.market) - 1, height: barH, rx: 2, fill: b }, svg);
	tip(market, `<b>Priced in by the market</b><br>${signed(P.market - 50)} points above a coin flip`);
	tip(left, `<b>Left over</b><br>${signed(P.left)} points`);
	h('line', { x1: X(P.actual), x2: X(P.actual), y1: 18, y2: barY + barH, stroke: 'var(--text)', 'stroke-width': 1 }, svg);
	const flip = X(P.actual) + 110 > W;
	const ax = X(P.actual) + (flip ? -6 : 6);
	h('text', { x: ax, y: 16, 'text-anchor': flip ? 'end' : 'start', class: 't-lbl-s' }, svg, 'Actual win rate');
	h('text', { x: ax, y: 32, 'text-anchor': flip ? 'end' : 'start', class: 't-val' }, svg, `${f1(P.actual)}%`);
	h('line', { x1: X(P.market), x2: X(P.market), y1: barY, y2: barY + barH + 36, stroke: 'var(--text-muted)', 'stroke-width': 1 }, svg);
	h('text', { x: X(P.market) - 6, y: barY + barH + 30, 'text-anchor': 'end', class: 't-lbl-s' }, svg, "Market's price");
	h('text', { x: X(P.market) - 6, y: barY + barH + 46, 'text-anchor': 'end', class: 't-val' }, svg, `${f1(P.market)}%`);
	const ty = barY + barH + 72;
	[50, 51, 52, 53, 54].forEach((v) => {
		h('line', { x1: X(v), x2: X(v), y1: ty - 12, y2: ty - 6, stroke: 'var(--border)', 'stroke-width': 1 }, svg);
		h('text', { x: X(v), y: ty + 6, 'text-anchor': v === 50 ? 'start' : v === 54 ? 'end' : 'middle', class: 't-axis' }, svg, v === 50 && W >= 520 ? '50% coin flip' : `${v}%`);
	});
	const ly = ty + 32;
	h('rect', { x: M.l, y: ly - 9, width: 12, height: 10, rx: 2, fill: a }, svg);
	h('text', { x: M.l + 18, y: ly, class: 't-lbl-s' }, svg, `priced in by the market (${signed(P.market - 50)})`);
	const legendX = W < 520 ? M.l : M.l + 250;
	const legendY = W < 520 ? ly + 20 : ly;
	h('rect', { x: legendX, y: legendY - 9, width: 12, height: 10, rx: 2, fill: b }, svg);
	h('text', { x: legendX + 18, y: legendY, class: 't-lbl-s' }, svg, `left over (${signed(P.left)})`);
	return legendY + 10;
}

function iou(svg, W, { data, a, b, tip }) {
	const narrow = W < 520;
	const H = narrow ? 270 : 290;
	const M = { l: 40, r: 18, t: 30, b: 34 };
	const iw = W - M.l - M.r;
	const ih = H - M.t - M.b;
	const C = data.runningPossessions;
	const names = ['Tip-off', 'After Q1', 'After Q2', 'After Q3', 'Final'];
	const X = (i) => M.l + 14 + (i / 4) * (iw - 28);
	const Y = lin(0.75, -0.75, M.t, M.t + ih);
	[-0.5, 0, 0.5].forEach((v) => {
		h('line', { x1: M.l, x2: M.l + iw, y1: Y(v), y2: Y(v), stroke: v === 0 ? 'var(--text)' : 'var(--border-subtle)', 'stroke-width': v === 0 ? 1.4 : 1 }, svg);
		h('text', { x: M.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 't-axis' }, svg, v === 0 ? 'even' : signed(v));
	});
	h('polygon', { points: `${X(0)},${Y(0)} ${X(1)},${Y(C[1])} ${X(2)},${Y(C[2])}`, fill: a, 'fill-opacity': 0.14 }, svg);
	h('polygon', { points: `${X(2)},${Y(0)} ${X(3)},${Y(C[3])} ${X(4)},${Y(C[4])}`, fill: b, 'fill-opacity': 0.18 }, svg);
	h('polyline', { points: C.map((v, i) => `${X(i)},${Y(v)}`).join(' '), fill: 'none', stroke: a, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, svg);
	C.forEach((v, i) => {
		h('circle', { cx: X(i), cy: Y(v), r: 6, fill: i === 3 ? b : a, stroke: 'var(--bg-surface)', 'stroke-width': 2 }, svg);
		const label = Math.abs(v) < 0.015 ? '0.00' : signed(v, 2);
		h('text', { x: X(i), y: Y(v) + (v > 0.1 ? -12 : v < -0.1 ? 22 : -12), 'text-anchor': 'middle', class: 't-val' }, svg, label);
		h('text', { x: X(i), y: H - 10, 'text-anchor': i === 0 ? 'start' : i === 4 ? 'end' : 'middle', class: 't-axis' }, svg, names[i]);
		const hit = h('circle', { cx: X(i), cy: Y(v), r: 14, class: 'hit' }, svg);
		tip(hit, `<b>${names[i]}</b><br>tip winner ${i === 0 ? 'level' : `${signed(v, 2)} possessions vs the loser`}`);
	});
	h('text', { x: X(3) - 10, y: Y(C[3]) + 40, 'text-anchor': 'end', class: 't-ann' }, svg, narrow ? 'Entering Q4: half a' : 'Entering Q4: half a possession behind');
	if (narrow) h('text', { x: X(3) - 10, y: Y(C[3]) + 56, 'text-anchor': 'end', class: 't-ann' }, svg, 'possession behind');
	h('text', { x: X(4) - 8, y: Y(0) - 26, 'text-anchor': 'end', class: 't-ann' }, svg, 'Q4 opener repays it');
	return H;
}

// How much of the raw gap each added control removes, on the games with a closing spread.
export function ledgerRows(data) {
	const est = (key) => data.ladder.find((row) => row.key === key).est;
	return [
		{
			label: 'Regular season, 1999-2000 to 2025-26',
			raw: est('raw'),
			parts: [est('raw') - est('strength'), est('strength') - est('strength_flags'), est('strength_flags') - est('spread_flags'), est('spread_flags')]
		}
	];
}
export const LEDGER_PARTS = ['Team strength', 'Who took the tip', 'Betting line', 'Left over'];

function ledger(svg, W, { data, a, b, c, tip }) {
	const colors = [a, b, c, 'var(--text-muted)'];
	const rows = ledgerRows(data);
	const max = 6.2;
	const X = lin(0, max, 0, W);
	const narrow = W < 520;
	const rowH = narrow ? 86 : 70;
	rows.forEach((row, i) => {
		const y0 = i * rowH;
		h('text', { x: 0, y: y0 + 16, class: 't-lbl' }, svg, row.label);
		if (narrow) h('text', { x: 0, y: y0 + 33, class: 't-axis' }, svg, `raw gap ${f1(row.raw)} pts`);
		else h('text', { x: W, y: y0 + 16, 'text-anchor': 'end', class: 't-val' }, svg, `raw gap ${f1(row.raw)} pts`);
		const y = narrow ? y0 + 16 : y0;
		let x = 0;
		row.parts.forEach((part, k) => {
			if (!part) return;
			const w = X(part);
			const seg = h('rect', { x: x + (k ? 1 : 0), y: y + 26, width: Math.max(0, w - (k ? 2 : 1)), height: 18, rx: 3, fill: colors[k] }, svg);
			if (w > 34) h('text', { x: x + w / 2, y: y + 60, 'text-anchor': 'middle', class: 't-val' }, svg, f1(part, 2));
			tip(seg, `<b>${LEDGER_PARTS[k]}</b><br>${f1(part, 2)} of ${f1(row.raw, 2)} points`);
			x += w;
		});
	});
	const ly = rows.length * rowH + (narrow ? 14 : 8);
	let lx = 0;
	LEDGER_PARTS.forEach((part, k) => {
		const lineY = narrow ? ly + Math.floor(k / 2) * 20 : ly;
		if (narrow && k % 2 === 0) lx = 0;
		h('rect', { x: lx, y: lineY - 9, width: 12, height: 10, rx: 2, fill: colors[k] }, svg);
		h('text', { x: lx + 18, y: lineY, class: 't-lbl-s' }, svg, part.toLowerCase());
		lx += 150;
	});
	return ly + (narrow ? 30 : 10);
}

export const JUMP_BALL_CHARTS = { seasons, quarters, height, jumpers, scatter, placebo, ladder, priced, iou, ledger };
