/* ---------- reusable time-series chart with crosshair tooltip ---------- */
const fmtMonth = d3.utcFormat('%b');
function monthTicks(x, minGap = 44) {
  const [a, b] = x.domain();
  const out = []; let last = -Infinity;
  for (const m of d3.utcMonth.range(d3.utcMonth.ceil(a), b)) {
    const px = x(m);
    if (px - last >= minGap) { out.push(m); last = px; }
  }
  return out;
}
function lastPointAtOrBefore(pts, di) {
  let lo = 0; let hi = pts.length - 1; let ans = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (pts[mid][0] <= di) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return ans < 0 ? null : pts[ans];
}
function yDomain(vals, minSpan = 1) {
  let lo = Math.min(...vals); let hi = Math.max(...vals);
  if (lo > 0 && lo < 1.5) lo = 0;
  if (hi < 0 && hi > -1.5) hi = 0;
  if (hi - lo < minSpan) { const m = (hi + lo) / 2; lo = m - minSpan / 2; hi = m + minSpan / 2; }
  const pad = (hi - lo) * 0.08;
  return [lo - pad, hi + pad];
}

/**
 * cfg: { h, series: [{pts: [[di, v]], cls, name, key}], d0, d1, asOfDi, tip(di) -> html, label, endLabels }
 */
function timeChart(el, w, cfg) {
  const h = cfg.h || 170;
  const m = { t: 12, r: cfg.endLabels ? 64 : 16, b: 24, l: 42 };
  const d0 = cfg.d0 ?? 0; const d1 = Math.max(cfg.d1 ?? LAST_DI, d0 + 1);
  const x = d3.scaleUtc().domain([toDate(DAYS[d0]), toDate(DAYS[d1])]).range([m.l, w - m.r]);
  const vals = [];
  const series = cfg.series.map((s) => ({ ...s, pts: s.pts.filter((p) => p[0] >= d0 && p[0] <= d1) }));
  for (const s of series) for (const p of s.pts) vals.push(p[1]);
  if (vals.length < 2) { el.innerHTML = '<div class="empty">No games in this window yet.</div>'; return; }
  const y = d3.scaleLinear().domain(yDomain(vals, cfg.minSpan || 1)).nice(4).range([h - m.b, m.t]);
  const [ylo, yhi] = y.domain();
  const dec = yhi - ylo <= 2.5 ? 1 : 0;
  const line = d3.line().x((p) => x(toDate(DAYS[p[0]]))).y((p) => y(p[1])).curve(d3.curveMonotoneX);
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(cfg.label || 'Rating over time')}">`;
  s += yGrid(y, y.ticks(4), m.l, w - m.r, (v) => fx(v, dec));
  for (const t of monthTicks(x)) s += `<text class="axis-t" x="${x(t).toFixed(1)}" y="${h - 6}" text-anchor="middle">${fmtMonth(t)}</text>`;
  if (cfg.asOfDi != null && cfg.asOfDi >= d0 && cfg.asOfDi < d1) {
    const ax = x(toDate(DAYS[cfg.asOfDi]));
    s += `<line class="asof" x1="${ax}" x2="${ax}" y1="${m.t - 4}" y2="${h - m.b}"/><text class="asof-t" x="${ax + 4}" y="${m.t + 6}">${esc(dateShort(DAYS[cfg.asOfDi]))}</text>`;
  }
  const lineStraight = d3.line().x((p) => x(toDate(DAYS[p[0]]))).y((p) => y(p[1]));
  for (let i = series.length - 1; i >= 0; i--) {
    const se = series[i];
    const { main, tail } = splitProj(se.pts);
    if (main.length > 1) s += `<path class="${se.cls}" d="${line(main)}"/>`;
    if (tail) s += `<path class="proj-thin" d="${lineStraight(tail)}"/>`;
  }
  const lab = [];
  series.forEach((se, i) => {
    const lp = se.pts[se.pts.length - 1];
    if (!lp) return;
    if (i === 0 || cfg.endDots) s += `<circle class="${se.dot || 'dot'}" r="4" cx="${x(toDate(DAYS[lp[0]])).toFixed(1)}" cy="${y(lp[1]).toFixed(1)}"/>`;
    if (cfg.endLabels) lab.push({ y: y(lp[1]), t: `${se.name} ${sgn(lp[1])}`, x: x(toDate(DAYS[lp[0]])) });
  });
  if (lab.length) {
    lab.sort((a, b) => a.y - b.y);
    for (let i = 1; i < lab.length; i++) if (lab[i].y - lab[i - 1].y < 13) lab[i].y = lab[i - 1].y + 13;
    for (const l of lab) s += `<text class="lbl-s" x="${(l.x + 8).toFixed(1)}" y="${(l.y + 4).toFixed(1)}">${esc(l.t)}</text>`;
  }
  s += `<g class="hov" style="display:none"><line class="xhair" y1="${m.t}" y2="${h - m.b}"/>${series.map((se) => `<circle class="${se.dot || 'dot'}" r="4"/>`).join('')}</g>`;
  s += `<rect class="hit" x="${m.l}" y="0" width="${w - m.l - m.r}" height="${h - m.b}"/></svg>`;
  el.innerHTML = s;
  const svgEl = el.firstElementChild;
  const hov = svgEl.querySelector('.hov');
  const circles = hov.querySelectorAll('circle');
  const xs = series[0].pts;
  const move = (ev) => {
    const r = svgEl.getBoundingClientRect();
    const t = x.invert((ev.clientX - r.left) * (w / r.width));
    const iso = isoOf(t);
    let best = xs[0]; let bd = Infinity;
    for (const p of xs) { const dd = Math.abs(daysBetween(DAYS[p[0]], iso)); if (dd < bd) { bd = dd; best = p; } }
    const di = best[0]; const px = x(toDate(DAYS[di]));
    hov.style.display = '';
    hov.querySelector('line').setAttribute('x1', px); hov.querySelector('line').setAttribute('x2', px);
    series.forEach((se, i) => {
      const p = lastPointAtOrBefore(se.pts, di);
      if (!p) { circles[i].setAttribute('r', 0); return; }
      circles[i].setAttribute('r', 4); circles[i].setAttribute('cx', px); circles[i].setAttribute('cy', y(p[1]));
    });
    const html = cfg.tip ? cfg.tip(di) : ttHead(dateStr(DAYS[di])) + series.map((se) => { const p = lastPointAtOrBefore(se.pts, di); return p ? ttRow(sgn(p[1], 2), se.name, se.key) : ''; }).join('');
    TIP.show(html, ev.clientX, ev.clientY);
  };
  svgEl.addEventListener('pointermove', move);
  svgEl.addEventListener('pointerleave', () => { hov.style.display = 'none'; TIP.hide(); });
}
const KEY = { ink: 'var(--ink)', o: 'var(--o)', d: 'var(--d)', soft: 'var(--ink-3)', maple: 'var(--maple)' };
function histPts(id, field = 1) {
  return hist(id).map((r) => [r[0], field === 1 ? r[1] / 100 : field === 2 ? r[2] / 100 : (r[1] - r[2]) / 100, r[3] < 0 ? 1 : 0]);
}
/* split a series into the game-by-game line and a dashed tail to any projection rows */
function splitProj(pts) {
  let k = pts.length;
  while (k > 0 && pts[k - 1][2]) k--;
  if (k === pts.length || k === 0) return { main: pts, tail: null };
  return { main: pts.slice(0, k), tail: pts.slice(k - 1) };
}
