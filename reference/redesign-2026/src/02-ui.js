/* ---------- shared state ---------- */
const STATE = {
  asOf: LATEST,
  todayWin: store.get('todayWin', '30'),
  watch: new Set(store.get('watch', [])),
};
const isLatest = () => STATE.asOf === LATEST;
const inCurrentSeason = () => STATE.asOf >= DAYS[0];
const asOfDi = () => (inCurrentSeason() ? dayIndexFor(STATE.asOf) : -1);

function toggleWatch(id) {
  id = Number(id);
  if (STATE.watch.has(id)) STATE.watch.delete(id); else STATE.watch.add(id);
  store.set('watch', [...STATE.watch]);
  const on = STATE.watch.has(id);
  $$(`[data-star="${id}"]`).forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', `${on ? 'Remove' : 'Add'} ${P.name(id)} ${on ? 'from' : 'to'} watchlist`);
    b.innerHTML = on ? ICON.star : ICON.starOff;
  });
  toast(on ? `Following ${P.name(id)}` : `Removed ${P.name(id)}`);
}
function starBtn(id) {
  const on = STATE.watch.has(id);
  return `<button class="star" type="button" data-star="${id}" aria-pressed="${on}" aria-label="${on ? 'Remove' : 'Add'} ${esc(P.name(id))} ${on ? 'from' : 'to'} watchlist">${on ? ICON.star : ICON.starOff}</button>`;
}

/* ---------- chart registry (redrawn on resize) ---------- */
let CHARTS = [];
function chart(el, draw) { if (el) CHARTS.push({ el, draw }); }
function drawCharts() {
  for (const c of CHARTS) {
    if (!c.el.isConnected) continue;
    const w = Math.floor(c.el.clientWidth);
    if (w > 0) c.draw(c.el, w);
  }
}

/* ---------- tooltip ---------- */
const TIP = {
  el: null,
  show(html, cx, cy) {
    const el = this.el || (this.el = document.getElementById('tip'));
    el.innerHTML = html;
    el.classList.add('on');
    const r = el.getBoundingClientRect();
    let x = cx + 16; let y = cy + 14;
    if (x + r.width > window.innerWidth - 8) x = cx - r.width - 16;
    if (y + r.height > window.innerHeight - 8) y = cy - r.height - 14;
    el.style.left = `${Math.max(8, x)}px`;
    el.style.top = `${Math.max(8, y)}px`;
  },
  hide() { if (this.el) this.el.classList.remove('on'); },
};
const ttRow = (value, label, key) => `<div class="tt-r"><span class="tt-k" style="background:${key || 'transparent'}"></span><span class="tt-v">${value}</span><span class="tt-l">${esc(label)}</span></div>`;
const ttHead = (t) => `<div class="tt-h">${esc(t)}</div>`;

/* ---------- small components ---------- */
function teamChip(ti, link = true) {
  const t = TEAMS[ti];
  if (!t) return '<span class="tm"><i style="background:var(--line-2)"></i>FA</span>';
  const inner = `<i style="background:${t.c[0]}"></i>${t.abbr}`;
  return link ? `<a class="tm" href="#t-${t.abbr}" title="${esc(t.full)}">${inner}</a>` : `<span class="tm" title="${esc(t.full)}">${inner}</span>`;
}
const gO = '<i class="gO" aria-hidden="true"></i>';
const gX = '<i class="gX" aria-hidden="true"></i>';
function oxPair(o, d, dec = 1) {
  return `<span class="ox" title="Offense">${gO}<span class="sr-only">Offense </span>${sgn(o, dec)}</span> <span class="ox" title="Defense">${gX}<span class="sr-only">Defense </span>${sgn(d, dec)}</span>`;
}
function deltaHtml(v, dec = 2) {
  if (v == null || Number.isNaN(v)) return '<span class="delta muted">—</span>';
  const r = Number(v.toFixed(dec));
  const cls = r > 0 ? 'up' : r < 0 ? 'down' : 'muted';
  return `<span class="delta ${cls}">${sgn(v, dec)}</span>`;
}
function plink(id, label) {
  return `<a class="plink" href="#p${id}">${esc(label || P.name(id))}</a>`;
}

function spark(vals, o = {}) {
  const w = o.w || 96; const h = o.h || 26; const pad = 3.5;
  const idx = []; vals.forEach((v, i) => { if (v != null && !Number.isNaN(v)) idx.push(i); });
  if (idx.length < 2) return `<svg width="${w}" height="${h}" aria-hidden="true"></svg>`;
  const v = idx.map((i) => vals[i]);
  let lo = Math.min(...v); let hi = Math.max(...v);
  if (o.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  const span = o.minSpan ?? 0.6;
  if (hi - lo < span) { const m = (hi + lo) / 2; lo = m - span / 2; hi = m + span / 2; }
  const n = vals.length - 1 || 1;
  const X = (i) => pad + (i / n) * (w - 2 * pad);
  const Y = (val) => pad + (1 - (val - lo) / (hi - lo)) * (h - 2 * pad);
  let d = ''; let pen = false;
  vals.forEach((val, i) => {
    if (val == null || Number.isNaN(val)) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(val).toFixed(1)}`; pen = true;
  });
  const li = idx[idx.length - 1];
  const zero = lo < 0 && hi > 0 ? `<line class="zero" x1="0" x2="${w}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>` : '';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${zero}<path class="${o.cls || 'ln'}" d="${d}"/><circle class="${o.dot || 'dot'}" r="3" cx="${X(li).toFixed(1)}" cy="${Y(vals[li]).toFixed(1)}"/></svg>`;
}

/* diverging O/D split: positives stack right of zero, negatives left */
function oxBar(o, d, opt = {}) {
  const w = opt.w || 92; const h = opt.h || 14; const max = opt.max || 6;
  const mid = Math.round(w / 2); const k = (w / 2 - 2) / max; const bh = opt.bh || 8; const y = (h - bh) / 2;
  let pos = mid + 1; let neg = mid - 1; const segs = [];
  for (const [v, cls] of [[o, 'f-o'], [d, 'f-d']]) {
    let len = Math.abs(v) * k;
    if (len < 0.6) continue;
    if (v >= 0) { len = Math.min(len, w - pos); if (len <= 0) continue; segs.push(`<rect class="${cls}" x="${pos.toFixed(1)}" y="${y}" width="${len.toFixed(1)}" height="${bh}" rx="1.5"/>`); pos += len + 2; }
    else { len = Math.min(len, neg); if (len <= 0) continue; neg -= len; segs.push(`<rect class="${cls}" x="${neg.toFixed(1)}" y="${y}" width="${len.toFixed(1)}" height="${bh}" rx="1.5"/>`); neg -= 2; }
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line class="zero" x1="${mid}" x2="${mid}" y1="0" y2="${h}"/>${segs.join('')}</svg>`;
}

/* skill fingerprint glyph: one petal per skill, offense orange, defense blue */
function glyph(c, size = 44, opt = {}) {
  const prof = skillProfile(c); const n = prof.length;
  const cx = size / 2; const cy = size / 2; const R = size / 2 - 1.5; const r0 = R * 0.2;
  const step = (2 * Math.PI) / n;
  const pt = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  const petals = prof.map((s, i) => {
    const a0 = -Math.PI / 2 + i * step + step * 0.09; const a1 = a0 + step * 0.82;
    const r = r0 + (R - r0) * Math.max(0.05, s.p);
    const d = `M${pt(r0, a0)} L${pt(r, a0)} A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${pt(r, a1)} L${pt(r0, a1)} A${r0.toFixed(2)} ${r0.toFixed(2)} 0 0 0 ${pt(r0, a0)} Z`;
    return `<path class="${s.side === 'o' ? 'f-o' : 'f-d'}" d="${d}"${opt.titles ? `><title>${esc(s.label)}: ${Math.round(s.p * 100)}th percentile</title></path>` : '/>'}`;
  }).join('');
  const rings = `<circle class="ring" cx="${cx}" cy="${cy}" r="${R.toFixed(2)}"/><circle class="ring" cx="${cx}" cy="${cy}" r="${(r0 + (R - r0) * 0.5).toFixed(2)}"/>`;
  return `<svg class="glyph" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Skill fingerprint for ${esc(c.name)}">${rings}${petals}</svg>`;
}

/* compact SVG axis helpers */
function niceTicks(lo, hi, n = 5) { return d3.scaleLinear().domain([lo, hi]).nice(n).ticks(n); }
function yGrid(y, ticks, x0, x1, fmt = (v) => fx(v, 0)) {
  return ticks.map((t) => `<line class="${t === 0 ? 'zero' : 'grid-l'}" x1="${x0}" x2="${x1}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="axis-t" x="${x0 - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${t > 0 ? '+' : ''}${fmt(t)}</text>`).join('');
}

/* table-view twin for charts */
function tableToggle(id, label = 'Show as table') {
  return `<button class="btn ghost sm" type="button" data-tt="${id}" aria-expanded="false" aria-controls="${id}">${label}</button>`;
}
function simpleTable(cols, rows, left = [0]) {
  const cl = (i) => (left.includes(i) ? 'l' : '');
  return `<table class="tbl compact"><thead><tr>${cols.map((c, i) => `<th class="${cl(i)}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v, i) => `<td class="${cl(i)}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
