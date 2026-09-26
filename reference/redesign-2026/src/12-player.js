/* ---------- player page: seismograph, comps & futures, skills, contract, career ---------- */
let fanHL = -1;

function drawSeismo(el, w, id, vsId) {
  const h = hist(id);
  if (h.length < 2) { el.innerHTML = '<div class="empty">Not enough games this season.</div>'; return; }
  const h1 = 190; const gap = 34; const h2 = 118; const bottom = 24;
  const H = h1 + gap + h2 + bottom;
  const m = { l: 44, r: 16, t: 14 };
  const d0 = h[0][0]; const d1 = Math.max(h[h.length - 1][0], d0 + 1);
  const x = d3.scaleUtc().domain([toDate(DAYS[d0]), toDate(DAYS[d1])]).range([m.l, w - m.r]);
  const X = (di) => x(toDate(DAYS[di]));
  const pts = histPts(id); const po = histPts(id, 2); const pd = histPts(id, 3);
  const vs = vsId ? histPts(vsId).filter((p) => p[0] >= d0) : [];
  const vals = [...pts, ...po, ...pd, ...vs].map((p) => p[1]);
  const y1 = d3.scaleLinear().domain(yDomain(vals, 1.5)).nice(4).range([m.t + h1 - 10, m.t]);
  const ups = gameUpdates(id);
  let pmax = 0.15; let nmin = -0.15;
  for (const u of ups) { const pos = Math.max(0, u.dO) + Math.max(0, u.dD); const neg = Math.min(0, u.dO) + Math.min(0, u.dD); pmax = Math.max(pmax, pos); nmin = Math.min(nmin, neg); }
  const ext = Math.max(pmax, -nmin) * 1.08;
  const top2 = m.t + h1 + gap;
  const y2 = d3.scaleLinear().domain([-ext, ext]).range([top2 + h2, top2]);
  const line = d3.line().x((p) => X(p[0])).y((p) => y1(p[1])).curve(d3.curveMonotoneX);
  const plotW = w - m.l - m.r;
  const bw = clamp((plotW / Math.max(ups.length, 1)) * 0.62, 1.4, 7);
  let s = `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="${esc(P.name(id))}: DPM this season and the update after each game">`;
  s += `<text class="lbl-s" x="${m.l}" y="${m.t - 2}">Rating</text>`;
  s += yGrid(y1, y1.ticks(4), m.l, w - m.r, (v) => fx(v, 0));
  s += `<text class="lbl-s" x="${m.l}" y="${top2 - 8}">Update after each game</text>`;
  const t2 = [-ext * 0.6, 0, ext * 0.6].map((v) => Number(v.toFixed(2)));
  s += t2.map((t) => `<line class="${t === 0 ? 'zero' : 'grid-l'}" x1="${m.l}" x2="${w - m.r}" y1="${y2(t).toFixed(1)}" y2="${y2(t).toFixed(1)}"/><text class="axis-t" x="${m.l - 8}" y="${(y2(t) + 3.5).toFixed(1)}" text-anchor="end">${t > 0 ? '+' : ''}${fx(t, 2)}</text>`).join('');
  for (const t of monthTicks(x)) s += `<text class="axis-t" x="${x(t).toFixed(1)}" y="${H - 6}" text-anchor="middle">${fmtMonth(t)}</text>`;
  const regEndDi = dayIndexFor(META.regEnd);
  if (regEndDi > d0 && regEndDi < d1) { const rx = X(regEndDi); s += `<line class="grid-l" x1="${rx}" x2="${rx}" y1="${m.t}" y2="${top2 + h2}"/><text class="axis-t" x="${rx + 4}" y="${top2 - 8}">Playoffs</text>`; }
  const aDi = asOfDi();
  if (!isLatest() && aDi >= d0 && aDi < d1) { const ax = X(aDi); s += `<line class="asof" x1="${ax}" x2="${ax}" y1="${m.t}" y2="${top2 + h2}"/><text class="asof-t" x="${ax + 4}" y="${m.t + 8}">${esc(dateShort(DAYS[aDi]))}</text>`; }
  const straight = d3.line().x((p) => X(p[0])).y((p) => y1(p[1]));
  const seg = (arr, cls) => { const { main, tail } = splitProj(arr); return (main.length > 1 ? `<path class="${cls}" d="${line(main)}"/>` : '') + (tail ? `<path class="proj-thin" d="${straight(tail)}"/>` : ''); };
  if (vs.length > 1) s += seg(vs, 'ln-soft');
  s += seg(pd, 'ln-d') + seg(po, 'ln-o') + seg(pts, 'ln-2');
  const lp = pts[pts.length - 1];
  s += `<circle class="dot" r="4" cx="${X(lp[0])}" cy="${y1(lp[1])}"/>`;
  for (const u of ups) {
    const cx = X(u.di) - bw / 2;
    let up = y2(0); let dn = y2(0);
    for (const [v, cls] of [[u.dO, 'f-o'], [u.dD, 'f-d']]) {
      const hh = Math.abs(y2(v) - y2(0));
      if (hh < 0.4) continue;
      if (v >= 0) { up -= hh; s += `<rect class="${cls}" x="${cx.toFixed(1)}" y="${up.toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}"/>`; up -= 1; }
      else { s += `<rect class="${cls}" x="${cx.toFixed(1)}" y="${dn.toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}"/>`; dn += hh + 1; }
    }
  }
  s += `<g class="hov" style="display:none"><line class="xhair" y1="${m.t}" y2="${top2 + h2}"/><circle class="dot" r="4"/><circle class="dot-o" r="3.5"/><circle class="dot-d" r="3.5"/></g>`;
  s += `<rect class="hit" x="${m.l}" y="0" width="${plotW}" height="${top2 + h2}"/></svg>`;
  el.innerHTML = s;
  const svgEl = el.firstElementChild; const hov = svgEl.querySelector('.hov');
  const [cD, cO, cDef] = hov.querySelectorAll('circle');
  const upByDi = new Map(ups.map((u) => [u.di, u]));
  svgEl.addEventListener('pointermove', (ev) => {
    const r = svgEl.getBoundingClientRect();
    const iso = isoOf(x.invert((ev.clientX - r.left) * (w / r.width)));
    let best = h[0]; let bd = Infinity;
    for (const row of h) { const dd = Math.abs(daysBetween(DAYS[row[0]], iso)); if (dd < bd) { bd = dd; best = row; } }
    const di = best[0]; const px = X(di);
    hov.style.display = '';
    hov.firstElementChild.setAttribute('x1', px); hov.firstElementChild.setAttribute('x2', px);
    cD.setAttribute('cx', px); cD.setAttribute('cy', y1(best[1] / 100));
    cO.setAttribute('cx', px); cO.setAttribute('cy', y1(best[2] / 100));
    cDef.setAttribute('cx', px); cDef.setAttribute('cy', y1((best[1] - best[2]) / 100));
    const u = upByDi.get(di);
    let html = ttHead(`${dateStr(DAYS[di])}${best[4] >= 0 && best[3] > 0 ? ' · vs ' + TEAMS[best[4]].abbr : ''}`);
    html += ttRow(sgn(best[1] / 100, 2), 'DPM', KEY.ink) + ttRow(sgn(best[2] / 100, 2), 'Offense', KEY.o) + ttRow(sgn((best[1] - best[2]) / 100, 2), 'Defense', KEY.d);
    if (vsId) { const v = lastPointAtOrBefore(vs, di); if (v) html += ttRow(sgn(v[1], 2), P.name(vsId), KEY.soft); }
    if (u) html += `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--line)">${ttRow(sgn(u.dd, 2), `update after ${u.min} min`, 'transparent')}${ttRow(sgn(u.dO, 2), 'from offense', KEY.o)}${ttRow(sgn(u.dD, 2), 'from defense', KEY.d)}</div>`;
    else if (best[3] === 0) html += '<div class="muted" style="margin-top:4px">Did not play; the rating still drifts with league and schedule adjustments.</div>';
    else if (best[3] < 0) html += '<div class="muted" style="margin-top:4px">Projection row for the next game.</div>';
    TIP.show(html, ev.clientX, ev.clientY);
  });
  svgEl.addEventListener('pointerleave', () => { hov.style.display = 'none'; TIP.hide(); });
}

function seismoCallouts(c) {
  const ups = gameUpdates(c.id);
  const h = hist(c.id);
  if (!ups.length) return '<div class="empty">No games this season.</div>';
  const best = ups.reduce((a, b) => (b.dd > a.dd ? b : a));
  const worst = ups.reduce((a, b) => (b.dd < a.dd ? b : a));
  const recent = ups.slice(-20);
  const vol = sum(recent, (u) => Math.abs(u.dd)) / recent.length;
  const ratio = vol / LEAGUE_UPDATE_MEDIAN;
  const state = ratio < 0.8 ? 'Settled' : ratio <= 1.25 ? 'Typical' : 'Still moving';
  const first = h[0][1] / 100; const last = h[h.length - 1][1] / 100;
  const g = (u) => `${dateShort(DAYS[u.di])}${u.opp >= 0 ? ' vs ' + TEAMS[u.opp].abbr : ''} · ${u.min} min`;
  return `<div class="callouts">
    <div class="callout"><span class="k">Season change</span><span class="v">${sgn(last - first, 2)}</span><span class="s">${sgn(first, 2)} on opening night → ${sgn(last, 2)} now</span></div>
    <div class="callout"><span class="k">Biggest boost</span><span class="v up">${sgn(best.dd, 2)}</span><span class="s">${esc(g(best))}</span></div>
    <div class="callout"><span class="k">Biggest drop</span><span class="v down">${sgn(worst.dd, 2)}</span><span class="s">${esc(g(worst))}</span></div>
    <div class="callout"><span class="k">Update size, last ${recent.length} games</span><span class="v">${vol.toFixed(2)} <span style="font-size:14px;font-weight:600;font-stretch:100%">${state}</span></span><span class="s">League median ${LEAGUE_UPDATE_MEDIAN.toFixed(2)} per game. Smaller updates mean DARKO is more certain.</span></div>
  </div>`;
}

function drawFan(el, w, c) {
  const comp = COMPS[c.id];
  const own = (SE_BY_ID.get(c.id) || []).slice(-7);
  if (!comp || !own.length) { el.innerHTML = '<div class="empty">No comparable careers found.</div>'; return; }
  const nowRow = own[own.length - 1];
  const age0 = nowRow.age;
  const fan = comp.fan.filter((f) => f[3] != null);
  const H = 250; const m = { l: 44, r: 20, t: 16, b: 50 };
  const ages = [...own.map((r) => r.age), age0 + 5];
  const vals = [...own.map((r) => r.dpm), ...fan.flatMap((f) => [f[1] / 100, f[5] / 100]), 0];
  comp.c.forEach((cc) => { vals.push(cc[3] / 100); cc[5].forEach((v) => { if (v != null) vals.push(v / 100); }); });
  const x = d3.scaleLinear().domain([Math.min(...ages) - 0.4, age0 + 5.4]).range([m.l, w - m.r]);
  const y = d3.scaleLinear().domain(yDomain(vals, 2)).nice(5).range([H - m.b, m.t]);
  let s = `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="${esc(c.name)} DPM by age, with the range of outcomes for his historical comps">`;
  s += yGrid(y, y.ticks(5), m.l, w - m.r, (v) => fx(v, 0));
  for (let a = Math.ceil(x.domain()[0]); a <= Math.floor(x.domain()[1]); a++) s += `<text class="axis-t" x="${x(a)}" y="${H - m.b + 16}" text-anchor="middle">${a}</text>`;
  s += `<text class="axis-t" x="${m.l - 8}" y="${H - m.b + 16}" text-anchor="end">Age</text>`;
  const band = (lo, hi, cls) => {
    const pts = [[age0, nowRow.dpm, nowRow.dpm], ...fan.map((f) => [age0 + f[0], f[lo] / 100, f[hi] / 100])];
    const area = d3.area().x((p) => x(p[0])).y0((p) => y(p[1])).y1((p) => y(p[2])).curve(d3.curveMonotoneX);
    return `<path class="${cls}" d="${area(pts)}"/>`;
  };
  if (fan.length) s += band(1, 5, 'f-band1') + band(2, 4, 'f-band2');
  comp.c.forEach((cc, i) => {
    const pts = [[age0, cc[3] / 100], ...cc[5].map((v, k) => (v == null ? null : [age0 + k + 1, v / 100]))];
    let d = ''; let pen = false;
    for (const p of pts) { if (!p) { pen = false; continue; } d += `${pen ? 'L' : 'M'}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`; pen = true; }
    if (i === fanHL) return;
    s += `<path class="ln-ghost" d="${d}" data-ci="${i}"/>`;
  });
  if (fan.length) {
    const med = d3.line().x((p) => x(p[0])).y((p) => y(p[1])).curve(d3.curveMonotoneX)([[age0, nowRow.dpm], ...fan.map((f) => [age0 + f[0], f[3] / 100])]);
    s += `<path class="proj" d="${med}"/>`;
    const lf = fan[fan.length - 1];
    s += `<text class="lbl-s" x="${x(age0 + lf[0]) - 4}" y="${y(lf[3] / 100) - 10}" text-anchor="end">Comps' median</text>`;
  }
  if (fanHL >= 0 && comp.c[fanHL]) {
    const cc = comp.c[fanHL];
    const pts = [[age0, cc[3] / 100], ...cc[5].map((v, k) => (v == null ? null : [age0 + k + 1, v / 100]))];
    let d = ''; let pen = false;
    for (const p of pts) { if (!p) { pen = false; continue; } d += `${pen ? 'L' : 'M'}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`; pen = true; }
    s += `<path class="ln-maple" d="${d}"/>${pts.filter(Boolean).map((p) => `<circle class="dot-maple" r="4" cx="${x(p[0])}" cy="${y(p[1])}"/>`).join('')}`;
    const lastP = pts.filter(Boolean).pop();
    s += `<text class="lbl-t" x="${Math.min(x(lastP[0]) + 8, w - m.r - 4)}" y="${y(lastP[1]) - 8}" text-anchor="end">${esc(P.name(cc[0]))} ${seasonLabel(cc[1])}</text>`;
  }
  const ownLine = d3.line().x((r) => x(r.age)).y((r) => y(r.dpm)).curve(d3.curveMonotoneX)(own);
  s += `<path class="ln-2" d="${ownLine}"/>${own.map((r) => `<circle class="dot" r="4" cx="${x(r.age)}" cy="${y(r.dpm)}"/>`).join('')}`;
  s += `<text class="lbl-t" x="${x(age0) - 8}" y="${y(nowRow.dpm) - 10}" text-anchor="end">${esc(seasonLabel(nowRow.season))} ${sgn(nowRow.dpm)}</text>`;
  const rowY = H - 14;
  s += `<text class="axis-t" x="${m.l - 8}" y="${rowY}" text-anchor="end">In NBA</text>`;
  comp.fan.forEach((f) => { s += `<text class="axis-t" x="${x(age0 + f[0])}" y="${rowY}" text-anchor="middle" style="font-weight:600;fill:var(--ink-2)">${f[6]}%</text>`; });
  s += `<g class="hov" style="display:none"><line class="xhair" y1="${m.t}" y2="${H - m.b}"/></g><rect class="hit" x="${m.l}" y="0" width="${w - m.l - m.r}" height="${H - m.b}"/></svg>`;
  el.innerHTML = s;
  const svgEl = el.firstElementChild; const hov = svgEl.querySelector('.hov');
  svgEl.addEventListener('pointermove', (ev) => {
    const r = svgEl.getBoundingClientRect();
    const a = x.invert((ev.clientX - r.left) * (w / r.width));
    const k = Math.round(a - age0);
    if (k >= 1 && k <= 5) {
      const f = comp.fan[k - 1];
      hov.style.display = ''; hov.firstElementChild.setAttribute('x1', x(age0 + k)); hov.firstElementChild.setAttribute('x2', x(age0 + k));
      const html = ttHead(`Age ${Math.floor(age0 + k)} · ${k} season${k > 1 ? 's' : ''} ahead`)
        + (f[3] != null ? ttRow(sgn(f[3] / 100), 'median of comps', KEY.ink) + ttRow(`${sgn(f[2] / 100)} to ${sgn(f[4] / 100)}`, 'middle half', KEY.soft) + ttRow(`${sgn(f[1] / 100)} to ${sgn(f[5] / 100)}`, '10th–90th pct', KEY.soft) : '<div class="muted">Too few comps still playing.</div>')
        + `<div class="muted" style="margin-top:4px">${f[6]}% of comps (weighted) played 10+ games; ${f[7]} of 25 had a rating.</div>`;
      TIP.show(html, ev.clientX, ev.clientY);
    } else {
      const row = own.reduce((b, rr) => (Math.abs(rr.age - a) < Math.abs(b.age - a) ? rr : b));
      hov.style.display = ''; hov.firstElementChild.setAttribute('x1', x(row.age)); hov.firstElementChild.setAttribute('x2', x(row.age));
      TIP.show(ttHead(`${seasonLabel(row.season)} · age ${Math.floor(row.age)}`) + ttRow(sgn(row.dpm, 2), 'season-end DPM', KEY.ink) + `<div class="muted">${row.gp} games · ${TEAMS[row.tm] ? TEAMS[row.tm].abbr : ''}</div>`, ev.clientX, ev.clientY);
    }
  });
  svgEl.addEventListener('pointerleave', () => { hov.style.display = 'none'; TIP.hide(); });
}

function compsTable(c) {
  const comp = COMPS[c.id];
  if (!comp) return '';
  return `<div class="tbl-wrap"><table class="tbl compact" id="compsTbl"><thead><tr><th class="l">Comp</th><th>Age</th><th>DPM then</th><th class="c">Next 5 seasons</th><th>Match</th></tr></thead><tbody>
    ${comp.c.map((cc, i) => `<tr class="comp-row${i === fanHL ? ' hl' : ''}" data-ci="${i}" tabindex="0"><td class="l">${plink(cc[0])} <span class="pos">${seasonLabel(cc[1])}</span></td><td>${(cc[2] / 10).toFixed(0)}</td><td>${sgn(cc[3] / 100)}</td><td class="c">${spark([cc[3] / 100, ...cc[5].map((v) => (v == null ? null : v / 100))], { w: 86, h: 22, zero: true })}</td><td><span class="sim"><i><b style="width:${cc[4]}%"></b></i>${cc[4]}</span></td></tr>`).join('')}
  </tbody></table></div>`;
}

function drawSurvival(el, w, c) {
  const sv = c.s || [];
  const H = 170; const m = { l: 44, r: 16, t: 12, b: 26 };
  const x = d3.scaleLinear().domain([1, sv.length]).range([m.l, w - m.r]);
  const y = d3.scaleLinear().domain([0, 1]).range([H - m.b, m.t]);
  let s = `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="Probability ${esc(c.name)} is on an NBA roster in each future season">`;
  for (const t of [0, 0.25, 0.5, 0.75, 1]) s += `<line class="${t === 0 ? 'zero' : 'grid-l'}" x1="${m.l}" x2="${w - m.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis-t" x="${m.l - 8}" y="${y(t) + 3.5}" text-anchor="end">${t * 100}%</text>`;
  const step = w < 520 ? 2 : 1;
  for (let k = 1; k <= sv.length; k += step) s += `<text class="axis-t" x="${x(k)}" y="${H - 7}" text-anchor="middle">+${k}</text>`;
  const pts = sv.map((v, i) => [i + 1, v]).filter((p) => p[1] != null);
  const area = d3.area().x((p) => x(p[0])).y0(y(0)).y1((p) => y(p[1])).curve(d3.curveMonotoneX)(pts);
  const ln = d3.line().x((p) => x(p[0])).y((p) => y(p[1])).curve(d3.curveMonotoneX)(pts);
  s += `<path class="f-wash" d="${area}"/><path class="ln-2" d="${ln}"/>`;
  const half = pts.find((p) => p[1] < 0.5);
  if (half) s += `<circle class="dot" r="4" cx="${x(half[0])}" cy="${y(half[1])}"/><text class="lbl-s" x="${x(half[0]) + 8}" y="${y(half[1]) - 8}">Below 50% in season +${half[0]}</text>`;
  s += '</svg>';
  el.innerHTML = s;
}

function drawCareer(el, w, id) {
  const rows = SE_BY_ID.get(id) || [];
  if (!rows.length) { el.innerHTML = '<div class="empty">No seasons in DARKO data.</div>'; return; }
  const H = 220; const m = { l: 44, r: 16, t: 12, b: 26 };
  const x = d3.scaleLinear().domain([rows[0].season - 0.5, rows[rows.length - 1].season + 0.5]).range([m.l, w - m.r]);
  const vals = rows.flatMap((r) => [r.dpm, r.o, r.dpm - r.o]);
  const y = d3.scaleLinear().domain(yDomain(vals, 2)).nice(5).range([H - m.b, m.t]);
  let s = `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="${esc(P.name(id))} season-end DPM by season">`;
  s += yGrid(y, y.ticks(5), m.l, w - m.r, (v) => fx(v, 0));
  const every = Math.ceil(rows.length / Math.max(2, Math.floor((w - 60) / 64)));
  rows.forEach((r, i) => { if (i % every === 0 || i === rows.length - 1) s += `<text class="axis-t" x="${x(r.season)}" y="${H - 7}" text-anchor="middle">${seasonLabel(r.season)}</text>`; });
  const L = (f) => d3.line().x((r) => x(r.season)).y((r) => y(f(r))).curve(d3.curveMonotoneX)(rows);
  s += `<path class="ln-d" d="${L((r) => r.dpm - r.o)}"/><path class="ln-o" d="${L((r) => r.o)}"/><path class="ln-2" d="${L((r) => r.dpm)}"/>`;
  s += rows.map((r) => `<circle class="dot" r="4" cx="${x(r.season)}" cy="${y(r.dpm)}"/>`).join('');
  s += `<g class="hov" style="display:none"><line class="xhair" y1="${m.t}" y2="${H - m.b}"/></g><rect class="hit" x="${m.l}" y="0" width="${w - m.l - m.r}" height="${H - m.b}"/></svg>`;
  el.innerHTML = s;
  const svgEl = el.firstElementChild; const hov = svgEl.querySelector('.hov');
  svgEl.addEventListener('pointermove', (ev) => {
    const r = svgEl.getBoundingClientRect();
    const sx = x.invert((ev.clientX - r.left) * (w / r.width));
    const row = rows.reduce((b, rr) => (Math.abs(rr.season - sx) < Math.abs(b.season - sx) ? rr : b));
    hov.style.display = ''; hov.firstElementChild.setAttribute('x1', x(row.season)); hov.firstElementChild.setAttribute('x2', x(row.season));
    TIP.show(ttHead(`${seasonLabel(row.season)} · age ${Math.floor(row.age)} · ${TEAMS[row.tm] ? TEAMS[row.tm].abbr : '—'}`) + ttRow(sgn(row.dpm, 2), 'DPM', KEY.ink) + ttRow(sgn(row.o, 2), 'Offense', KEY.o) + ttRow(sgn(row.dpm - row.o, 2), 'Defense', KEY.d) + `<div class="muted">${row.gp} games · ${Math.round(row.min)} min</div>`, ev.clientX, ev.clientY);
  });
  svgEl.addEventListener('pointerleave', () => { hov.style.display = 'none'; TIP.hide(); });
}

function draftStr(id) {
  const r = P.rookie(id);
  return r ? `Rookie season ${seasonLabel(r)}` : 'Rookie season unknown';
}
function careerTable(id) {
  const rows = (SE_BY_ID.get(id) || []).slice().reverse();
  return simpleTable(['Season', 'Team', 'Age', 'Games*', 'DPM', 'Off', 'Def'], rows.map((r) => [seasonLabel(r.season), teamChip(r.tm), Math.floor(r.age), r.gp, `<b>${sgn(r.dpm)}</b>`, sgn(r.o), sgn(r.dpm - r.o)]), [0, 1]);
}

function historicalPlayer(id) {
  const rows = SE_BY_ID.get(id) || [];
  const peak = rows.reduce((b, r) => (!b || (r.gp >= 20 && r.dpm > b.dpm) ? r : b), null);
  const cited = [];
  for (const k in COMPS) for (const cc of COMPS[k].c) if (cc[0] === id) cited.push({ cur: Number(k), cc });
  cited.sort((a, b) => b.cc[4] - a.cc[4]);
  return `
  <section class="p-head" style="grid-template-columns:minmax(0,1fr) auto">
    <div class="p-id"><span class="eyebrow">${esc(POS_NAME[posGroup(P.pos(id))])} · ${rows.length ? `${seasonLabel(rows[0].season)} to ${seasonLabel(rows[rows.length - 1].season)} in DARKO data` : 'No DARKO seasons'}</span>
      <h1 class="display">${esc(P.name(id))}</h1>
      <div class="p-facts"><span>${heightStr(P.ht(id))}</span><span>${esc(draftStr(id))}</span>${P.country(id) ? `<span>${esc(P.country(id))}</span>` : ''}<span>${rows.length} seasons</span></div></div>
    ${peak ? `<div class="p-score"><span class="lbl">Peak season-end DPM · ${seasonLabel(peak.season)}</span><span class="big-num">${sgn(peak.dpm)}</span><div class="p-split">${oxPair(peak.o, peak.dpm - peak.o)}</div></div>` : ''}
  </section>
  <div class="grid">
    <section class="panel c8"><div class="ph"><div class="ph-l"><h2>Career in DARKO</h2><span class="sub">Season-end DPM with offense ${gO} and defense ${gX}</span></div><div class="legend"><span class="k"><span class="ln-k"></span>DPM</span><span class="k"><span class="ln-k" style="background:var(--o)"></span>Offense</span><span class="k"><span class="ln-k" style="background:var(--d)"></span>Defense</span></div></div><div class="chart" id="careerChart"></div></section>
    <section class="panel c4"><div class="ph"><div class="ph-l"><h2>Echoes today</h2><span class="sub">Current players who match one of his seasons</span></div></div>
      ${cited.length ? cited.slice(0, 8).map((x) => `<div class="reign"><span>${plink(x.cur)} <span class="pos">like his ${seasonLabel(x.cc[1])}</span></span><span class="w">${x.cc[4]}</span></div>`).join('') + '<p class="note" style="margin-top:8px">Match score out of 100.</p>' : '<div class="empty">No current player matches his seasons closely.</div>'}
    </section>
    <section class="panel c12"><div class="ph"><h2>Season by season</h2><span class="sub">*Games include playoffs</span></div><div class="tbl-wrap">${careerTable(id)}</div></section>
  </div>`;
}

VIEWS.player = {
  title: (r) => P.name(r.id),
  dated: false,
  html(r) {
    const c = CUR_BY_ID.get(r.id);
    if (!c) return PM[r.id] ? historicalPlayer(r.id) : '<div class="empty">Player not found.</div>';
    const vs = r.vs && CUR_BY_ID.get(r.vs);
    const rare = ageRank(c.id, SEASON);
    const poss = (c.pace * Math.max(0, c.xmin)) / 48;
    const pg = (v) => (v * poss) / 100;
    const box = [
      ['Points', c.pts, pg(c.pts), 1], ['Rebounds', c.reb, pg(c.reb), 1], ['  Offensive', c.orb, pg(c.orb), 1], ['  Defensive', c.drb, pg(c.drb), 1],
      ['Assists', c.ast, pg(c.ast), 1], ['Steals', c.stl, pg(c.stl), 1], ['Blocks', c.blk, pg(c.blk), 1], ['Turnovers', c.tov, pg(c.tov), 1],
      ['3-pt attempts', c.fg3a, pg(c.fg3a), 1], ['FG attempts', c.fga, pg(c.fga), 1], ['FT attempts', c.fta, pg(c.fta), 1],
    ];
    const comp = COMPS[c.id];
    const topComp = comp && comp.c[0];
    const lastSe = (SE_BY_ID.get(c.id) || []).slice(-1)[0];
    return `
    <section class="p-head">
      ${glyph(c, 104, { titles: true })}
      <div class="p-id">
        <span class="eyebrow">${esc(c.team ? c.team.full : 'Free agent')} · ${esc(POS_NAME[c.pg])} · ${esc(c.pos || '')}</span>
        <h1 class="display">${esc(c.name)}</h1>
        <div class="p-facts"><span>Age ${Math.floor(c.age)}</span><span>${heightStr(P.ht(c.id))}${P.wt(c.id) ? ` · ${P.wt(c.id)} lb` : ''}</span><span>${esc(draftStr(c.id))}</span>${P.country(c.id) ? `<span>${esc(P.country(c.id))}</span>` : ''}<span>${c.cgames.toLocaleString()} career games</span></div>
        <div class="p-actions">${starBtn(c.id)}<a class="btn" href="#card-${c.id}">${ICON.card} Make a card</a><button class="btn" type="button" data-compare="${c.id}">Compare…</button>${c.team ? `<a class="btn ghost" href="#lab-${c.team.abbr}">${ICON.flask} Roster Lab</a>` : ''}</div>
      </div>
      <div class="p-score"><span class="lbl">DPM · #${c.rank} of ${N_CUR}</span><span class="big-num">${sgn(c.dpm)}</span><div class="p-split">${oxPair(c.o, c.d)}</div></div>
    </section>
    ${vs ? `<div class="rewound-banner" style="display:flex;margin:-6px 0 18px;background:var(--wash-2)">Comparing with <b>${esc(vs.name)}</b> (${sgn(vs.dpm)}, #${vs.rank}). His DPM is the grey line in the Seismograph. <a class="linkbtn" href="#p${c.id}">Clear</a><a class="linkbtn" href="#p${vs.id}-vs-${c.id}">Swap</a></div>` : ''}
    <nav class="row" aria-label="Sections" style="margin-bottom:16px;gap:6px">${[['seismo', 'Seismograph'], ['comps', 'Comps & futures'], ['skills', 'Skills'], ['contract', 'Contract & longevity'], ['career', 'Career']].map(([k, l]) => `<button class="btn ghost sm" type="button" data-scroll="${k}">${l}</button>`).join('')}</nav>
    <div class="grid">
      <section class="panel c12" id="sec-seismo" aria-labelledby="h-seismo">
        <div class="ph"><div class="ph-l"><h2 id="h-seismo">Seismograph · 2025-26</h2><span class="sub">DARKO re-estimates every player after every game. The line is the rating; the bars are each game's update, split into offense ${gO} and defense ${gX}.</span></div>
          <div class="legend"><span class="k"><span class="ln-k"></span>DPM</span><span class="k"><span class="ln-k" style="background:var(--o)"></span>Offense</span><span class="k"><span class="ln-k" style="background:var(--d)"></span>Defense</span>${vs ? `<span class="k"><span class="ln-k" style="background:var(--ink-3)"></span>${esc(vs.name)}</span>` : ''}</div></div>
        <div class="grid" style="gap:24px">
          <div class="seis-main"><div class="chart" id="seismoChart"></div>
            <div class="row" style="margin-top:8px">${tableToggle('seismoTable', 'Show game log')}</div>
            <div class="tbl-view" id="seismoTable" hidden></div></div>
          <div class="seis-side">${seismoCallouts(c)}</div>
        </div>
      </section>
      <section class="panel c12" id="sec-comps" aria-labelledby="h-comps">
        <div class="ph"><div class="ph-l"><h2 id="h-comps">Comps & futures</h2><span class="sub">The ten most similar player-seasons since 1996-97 at the same age, and what happened to them next</span></div></div>
        ${rare ? `<p class="rarity" style="margin-bottom:14px">${rare.rank <= 10 ? `<b>${sgn(rare.dpm)} at age ${rare.age}</b> ranks <b>#${rare.rank} of ${rare.n}</b> age-${rare.age} seasons in DARKO's data.` : `His 2025-26 season-end ${sgn(rare.dpm)} ranks #${rare.rank} of ${rare.n} age-${rare.age} seasons since 1996-97.`}${topComp ? ` Closest match: <b>${esc(P.name(topComp[0]))}</b>, ${seasonLabel(topComp[1])}.` : ''}</p>` : ''}
        <div class="grid" style="gap:24px">
          <div class="c7"><div class="chart" id="fanChart"></div>
            <div class="legend" style="margin-top:6px"><span class="k"><span class="ln-k"></span>${esc(c.name)}</span><span class="k"><span class="ln-k" style="background:repeating-linear-gradient(90deg,var(--ink) 0 5px,transparent 5px 9px)"></span>Median of 25 comps</span><span class="k"><span class="sq-k" style="background:var(--band-2)"></span>Middle half</span><span class="k"><span class="sq-k" style="background:var(--band-1)"></span>10th–90th percentile</span><span class="k"><span class="ln-k" style="background:var(--maple)"></span>Highlighted comp</span></div></div>
          <div class="c5">${compsTable(c)}<p class="note" style="margin-top:10px">Hover or focus a comp to trace his next five seasons. Matching uses DPM and its offense/defense split, the two prior seasons, box-score profile, height, experience and age (prototype method).</p></div>
        </div>
      </section>
      <section class="panel c6" id="sec-skills" aria-labelledby="h-skills">
        <div class="ph"><div class="ph-l"><h2 id="h-skills">Skill fingerprint</h2><span class="sub">Percentile among rotation players, from DARKO's per-100 projections</span></div></div>
        <div class="row" style="align-items:flex-start;gap:24px;flex-wrap:wrap">
          <div style="flex:none">${glyph(c, 176, { titles: true })}</div>
          <div class="sk-list" style="flex:1;min-width:240px">${skillProfile(c).map((s) => `<div class="sk"><span class="n">${s.side === 'o' ? gO : gX}${esc(s.label)}</span><span class="bar"><i class="${s.side}" style="width:${(s.p * 100).toFixed(0)}%"></i></span><span class="p">${Math.round(s.p * 100)}</span><span class="raw">${esc(s.raw(c))}</span></div>`).join('')}</div>
        </div>
      </section>
      <section class="panel c6" aria-labelledby="h-box">
        <div class="ph"><div class="ph-l"><h2 id="h-box">Projected box score</h2><span class="sub">Per game at ${fx(Math.max(0, c.xmin), 1)} projected minutes and ${fx(c.pace, 1)} pace · starter odds ${pct0(clamp(c.starter, 0, 1))}</span></div></div>
        <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th class="l">Stat</th><th>Per 100</th><th>Per game</th></tr></thead><tbody>
          ${box.map(([k, a, b]) => `<tr><td class="l${k.startsWith('  ') ? ' muted' : ''}">${esc(k.trim())}</td><td>${a.toFixed(1)}</td><td><b>${b.toFixed(1)}</b></td></tr>`).join('')}
          <tr><td class="l">FG% · 3P% · FT%</td><td colspan="2">${pct(c.fgp)} · ${pct(c.fg3p)} · ${pct(c.ftp)}</td></tr>
        </tbody></table></div>
      </section>
      <section class="panel c12" id="sec-contract" aria-labelledby="h-contract">
        <div class="ph"><div class="ph-l"><h2 id="h-contract">Contract & longevity</h2><span class="sub">DARKO's fair salary from projected wins, against his 2025-26 salary, and his odds of staying on an NBA roster</span></div></div>
        <div class="grid" style="gap:24px">
          <div class="c5"><div class="statgrid">
            <div class="stat"><span class="k">Fair value</span><span class="v">${money(c.fair)}</span><span class="s">DARKO market estimate</span></div>
            <div class="stat"><span class="k">2025-26 salary</span><span class="v">${money(c.sal)}</span><span class="s">Actual</span></div>
            <div class="stat"><span class="k">Surplus</span><span class="v ${c.surplus >= 0 ? 'up' : 'down'}">${money(c.surplus, true)}</span><span class="s">Value minus salary</span></div>
            <div class="stat"><span class="k">WARP</span><span class="v">${fx(c.warp, 1)}</span><span class="s">Wins above replacement</span></div>
            <div class="stat"><span class="k">Seasons left</span><span class="v">${fx(c.yrs, 1)}</span><span class="s">Projected</span></div>
            <div class="stat"><span class="k">Retires at</span><span class="v">${fx(c.retAge, 1)}</span><span class="s">Projected age</span></div>
          </div></div>
          <div class="c7"><div class="eyebrow" style="margin-bottom:6px">Probability he is on an NBA roster, by seasons from now</div><div class="chart" id="survChart"></div></div>
        </div>
      </section>
      <section class="panel c12" id="sec-career" aria-labelledby="h-career">
        <div class="ph"><div class="ph-l"><h2 id="h-career">Career in DARKO</h2><span class="sub">Season-end DPM${lastSe ? ` through ${seasonLabel(lastSe.season)}` : ''}</span></div>
          <div class="legend"><span class="k"><span class="ln-k"></span>DPM</span><span class="k"><span class="ln-k" style="background:var(--o)"></span>Offense</span><span class="k"><span class="ln-k" style="background:var(--d)"></span>Defense</span>${tableToggle('careerTbl')}</div></div>
        <div class="chart" id="careerChart"></div>
        <div class="tbl-view" id="careerTbl" hidden>${careerTable(c.id)}</div>
      </section>
    </div>`;
  },
  mount(r) {
    const c = CUR_BY_ID.get(r.id);
    if (!c) { chart($('#careerChart'), (el, w) => drawCareer(el, w, r.id)); return; }
    fanHL = -1;
    const vs = r.vs && CUR_BY_ID.get(r.vs) ? r.vs : null;
    chart($('#seismoChart'), (el, w) => drawSeismo(el, w, c.id, vs));
    chart($('#fanChart'), (el, w) => drawFan(el, w, c));
    chart($('#survChart'), (el, w) => drawSurvival(el, w, c));
    chart($('#careerChart'), (el, w) => drawCareer(el, w, c.id));
    const st = $('#seismoTable');
    if (st) {
      const ups = gameUpdates(c.id).slice().reverse();
      st.innerHTML = simpleTable(['Date', 'Opp', 'Min', 'DPM after', 'Update', 'Offense', 'Defense'], ups.map((u) => [esc(dateStr(DAYS[u.di])), u.opp >= 0 ? TEAMS[u.opp].abbr : '—', u.min, sgn(u.dpm, 2), deltaHtml(u.dd), sgn(u.dO, 2), sgn(u.dD, 2)]), [0, 1]);
    }
    const fanEl = $('#fanChart');
    const setHL = (i) => {
      fanHL = i;
      $$('#compsTbl tr.comp-row').forEach((tr) => tr.classList.toggle('hl', Number(tr.dataset.ci) === i));
      drawFan(fanEl, Math.floor(fanEl.clientWidth), c);
    };
    $$('#compsTbl tr.comp-row').forEach((tr) => {
      tr.addEventListener('pointerenter', () => setHL(Number(tr.dataset.ci)));
      tr.addEventListener('focus', () => setHL(Number(tr.dataset.ci)));
    });
    const tbl = $('#compsTbl');
    if (tbl) tbl.addEventListener('pointerleave', () => setHL(-1));
    if (r.section) setTimeout(() => { const s = document.getElementById(`sec-${r.section}`); if (s) s.scrollIntoView({ block: 'start' }); }, 30);
  },
};
