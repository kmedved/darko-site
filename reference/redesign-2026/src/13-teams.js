/* ---------- Teams: the league map and Team DNA pages ---------- */
function resultPill(t) {
  return `<span class="pill${t.result === 'Champion' ? ' champ' : ''}">${t.result === 'Champion' ? '2026 champion' : t.result === 'Finals' ? 'Lost Finals' : t.result === 'Playoffs' ? 'Playoffs' : 'Lottery'}</span>`;
}
function drawQuadrant(el, w) {
  const H = Math.min(460, Math.max(320, w * 0.72)); const m = { l: 48, r: 18, t: 18, b: 40 };
  const pts = TEAM_BASE.map((b) => ({ t: b.t, o: b.o, d: b.d, r: b.r }));
  const ox = d3.extent(pts, (p) => p.o); const dy = d3.extent(pts, (p) => p.d);
  const x = d3.scaleLinear().domain([Math.min(ox[0], -1) - 0.6, Math.max(ox[1], 1) + 0.6]).nice().range([m.l, w - m.r]);
  const y = d3.scaleLinear().domain([Math.min(dy[0], -1) - 0.6, Math.max(dy[1], 1) + 0.6]).nice().range([H - m.b, m.t]);
  let s = `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="Team offense and defense ratings from DARKO">`;
  s += `<defs><clipPath id="qclip"><rect x="${m.l}" y="${m.t}" width="${w - m.l - m.r}" height="${H - m.t - m.b}"/></clipPath></defs>`;
  for (const t of x.ticks(6)) s += `<line class="${t === 0 ? 'zero' : 'grid-l'}" x1="${x(t)}" x2="${x(t)}" y1="${m.t}" y2="${H - m.b}"/><text class="axis-t" x="${x(t)}" y="${H - m.b + 16}" text-anchor="middle">${t > 0 ? '+' : ''}${fx(t, 0)}</text>`;
  for (const t of y.ticks(6)) s += `<line class="${t === 0 ? 'zero' : 'grid-l'}" x1="${m.l}" x2="${w - m.r}" y1="${y(t)}" y2="${y(t)}"/><text class="axis-t" x="${m.l - 8}" y="${y(t) + 3.5}" text-anchor="end">${t > 0 ? '+' : ''}${fx(t, 0)}</text>`;
  let iso = '';
  for (const k of [-10, -5, 5, 10]) {
    const x0 = x.domain()[0]; const x1 = x.domain()[1];
    iso += `<line class="grid-l" style="stroke-dasharray:2 4" x1="${x(x0)}" y1="${y(k - x0)}" x2="${x(x1)}" y2="${y(k - x1)}"/>`;
    const lx = clamp(k - y.domain()[1] + 0.3, x0 + 0.2, x1 - 0.6);
    iso += `<text class="axis-t" x="${x(lx) + 4}" y="${y(k - lx) + 12}">${k > 0 ? '+' : ''}${fx(k, 0)} net</text>`;
  }
  s += `<g clip-path="url(#qclip)">${iso}</g>`;
  s += `<text class="lbl-s" x="${w - m.r}" y="${H - 4}" text-anchor="end">Offense ${'→'}</text><text class="lbl-s" x="${m.l}" y="${m.t - 6}">Defense ${'↑'}</text>`;
  const placed = pts.map((p) => ({ x0: x(p.o) - 5, x1: x(p.o) + 5, y0: y(p.d) - 5, y1: y(p.d) + 5 }));
  const hits = (b) => placed.some((q) => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0);
  for (const p of pts.slice().sort((a, b) => b.r - a.r)) {
    const cx = x(p.o); const cy = y(p.d); const lw = 27; const lh = 12;
    const cands = [[cx + 8, cy + 4, 'start', cx + 7, cy - 6], [cx - 8, cy + 4, 'end', cx - 8 - lw, cy - 6], [cx, cy - 9, 'middle', cx - lw / 2, cy - 9 - lh + 2], [cx, cy + 17, 'middle', cx - lw / 2, cy + 7]];
    let pick = cands[0];
    for (const c of cands) { const b = { x0: c[3], x1: c[3] + lw, y0: c[4], y1: c[4] + lh }; if (!hits(b) && b.x0 > m.l && b.x1 < w - m.r) { pick = c; break; } }
    placed.push({ x0: pick[3], x1: pick[3] + lw, y0: pick[4], y1: pick[4] + lh });
    s += `<g class="qpt" data-abbr="${p.t.abbr}" tabindex="0" role="link" aria-label="${esc(p.t.full)}: offense ${sgn(p.o)}, defense ${sgn(p.d)}"><circle class="hit" r="14" cx="${cx}" cy="${cy}"/><circle class="${p.t.result === 'Champion' ? 'dot-maple' : 'dot'}" r="${p.t.result === 'Champion' ? 6 : 4.5}" cx="${cx}" cy="${cy}"/><text class="lbl-t" x="${pick[0]}" y="${pick[1]}" text-anchor="${pick[2]}">${p.t.abbr}</text></g>`;
  }
  s += '</svg>';
  el.innerHTML = s;
  $$('.qpt', el).forEach((g) => {
    const b = TEAM_BASE[TEAM_BY_ABBR.get(g.dataset.abbr).i];
    g.style.cursor = 'pointer';
    g.addEventListener('click', () => { location.hash = `#t-${g.dataset.abbr}`; });
    g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') location.hash = `#t-${g.dataset.abbr}`; });
    g.addEventListener('pointermove', (ev) => TIP.show(ttHead(b.t.full) + ttRow(sgn(b.r, 1), 'DARKO rating', KEY.ink) + ttRow(sgn(b.o, 1), 'Offense', KEY.o) + ttRow(sgn(b.d, 1), 'Defense', KEY.d) + `<div class="muted" style="margin-top:4px">${b.t.w}-${b.t.l} · ${b.t.result === 'Champion' ? '2026 champion' : b.t.result}</div>`, ev.clientX, ev.clientY));
    g.addEventListener('pointerleave', () => TIP.hide());
  });
}

VIEWS.teams = {
  title: () => 'Teams',
  html() {
    const rows = TEAM_ORDER.map((b) => `<tr class="clickrow" data-href="#t-${b.t.abbr}"><td class="rk l">${b.rank}</td><td class="l">${teamChip(b.t.i)} <a class="plink" href="#t-${b.t.abbr}" style="margin-left:4px">${esc(b.t.name)}</a></td><td>${b.t.w}-${b.t.l}</td><td class="muted">${sgn(b.t.srs, 1)}</td><td class="dpm">${sgn(b.r)}</td><td class="c">${oxBar(b.o, b.d, { w: 90, max: 7 })}</td><td class="l">${resultPill(b.t)}</td></tr>`).join('');
    return `
    <section class="page-head"><div class="t">
      <span class="eyebrow">2025-26 final · team DNA</span>
      <h1 class="display">Teams</h1>
      <p class="lede">A team's DARKO rating is its players' current DPM weighted by their share of minutes after January 1. Across the 30 teams it lines up with 2025-26 wins at r = ${WFIT.r.toFixed(2)}, about ${WFIT.b.toFixed(1)} wins per point of rating.</p>
    </div></section>
    <div class="grid">
      <section class="panel c7"><div class="ph"><div class="ph-l"><h2>Offense against defense</h2><span class="sub">Up and to the right is better. Dotted lines mark equal net rating. The 2026 champion is in maple.</span></div></div><div class="chart" id="quadChart"></div></section>
      <section class="panel c5 flush"><div class="ph"><div class="ph-l"><h2>Power order</h2><span class="sub">By DARKO rating, with actual record and SRS</span></div></div>
        <div class="tbl-wrap" style="padding:0 8px 8px"><table class="tbl compact"><thead><tr><th class="l">#</th><th class="l">Team</th><th>W-L</th><th>SRS</th><th>DARKO</th><th class="c">Split</th><th class="l">Finish</th></tr></thead><tbody>${rows}</tbody></table></div>
      </section>
    </div>`;
  },
  mount() { chart($('#quadChart'), drawQuadrant); },
};

function drawContrib(el, w, ti) {
  const b = TEAM_BASE[ti];
  const rows = b.roster.map((r) => { const c = CUR_BY_ID.get(r.id); return { c, min: r.min, co: (c.o * r.min) / 48, cd: (c.d * r.min) / 48 }; })
    .map((r) => ({ ...r, tot: r.co + r.cd })).sort((a, b2) => b2.tot - a.tot);
  const rh = 28; const labelW = Math.min(190, w * 0.38); const valW = 52;
  const H = rows.length * rh + 30;
  let lo = 0; let hi = 0;
  for (const r of rows) { hi = Math.max(hi, Math.max(0, r.co) + Math.max(0, r.cd)); lo = Math.min(lo, Math.min(0, r.co) + Math.min(0, r.cd)); }
  const x = d3.scaleLinear().domain([Math.min(lo, -0.5), Math.max(hi, 0.5)]).nice().range([labelW, w - valW]);
  let s = `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="Each player's contribution to the ${esc(b.t.full)} rating">`;
  for (const t of x.ticks(5)) s += `<line class="${t === 0 ? 'zero' : 'grid-l'}" x1="${x(t)}" x2="${x(t)}" y1="0" y2="${H - 22}"/><text class="axis-t" x="${x(t)}" y="${H - 6}" text-anchor="middle">${t > 0 ? '+' : ''}${fx(t, 1)}</text>`;
  rows.forEach((r, i) => {
    const y0 = i * rh + 4; const bh = 12; const yb = y0 + (rh - 8 - bh) / 2;
    s += `<a href="#p${r.c.id}"><text class="lbl-t" x="0" y="${y0 + 12}">${esc(r.c.name.length > 22 ? shortName(r.c.id) : r.c.name)}</text></a><text class="lbl-s" x="0" y="${y0 + 24}" style="font-size:10.5px">${r.min.toFixed(1)} min · ${sgn(r.c.dpm)}</text>`;
    let pos = x(0) + 1; let neg = x(0) - 1;
    for (const [v, cls] of [[r.co, 'f-o'], [r.cd, 'f-d']]) {
      const len = Math.abs(x(v) - x(0));
      if (len < 0.5) continue;
      if (v >= 0) { s += `<rect class="${cls}" x="${pos}" y="${yb}" width="${len}" height="${bh}" rx="2"/>`; pos += len + 2; }
      else { neg -= len; s += `<rect class="${cls}" x="${neg}" y="${yb}" width="${len}" height="${bh}" rx="2"/>`; neg -= 2; }
    }
    s += `<text class="val-t" x="${w}" y="${yb + 10}" text-anchor="end">${sgn(r.tot, 2)}</text>`;
    s += `<rect class="hit" x="0" y="${y0 - 2}" width="${w}" height="${rh}" data-i="${i}"/>`;
  });
  s += '</svg>';
  el.innerHTML = s;
  $$('rect.hit', el).forEach((hit) => {
    const r = rows[Number(hit.dataset.i)];
    hit.addEventListener('pointermove', (ev) => TIP.show(ttHead(r.c.name) + ttRow(sgn(r.tot, 2), 'points per 100 to the team', KEY.ink) + ttRow(sgn(r.co, 2), 'from offense', KEY.o) + ttRow(sgn(r.cd, 2), 'from defense', KEY.d) + `<div class="muted" style="margin-top:4px">${sgn(r.c.dpm)} DPM × ${r.min.toFixed(1)} of 48 minutes</div>`, ev.clientX, ev.clientY));
    hit.addEventListener('pointerleave', () => TIP.hide());
  });
}
function drawPayroll(el, w, ti) {
  const rows = (BY_TEAM.get(ti) || []).filter((c) => c.sal != null && c.fair != null).sort((a, b) => b.sal - a.sal).slice(0, 12);
  if (!rows.length) { el.innerHTML = '<div class="empty">No salary data.</div>'; return; }
  const rh = 26; const labelW = Math.min(170, w * 0.36); const valW = 64; const H = rows.length * rh + 28;
  const mx = Math.max(...rows.map((c) => Math.max(c.sal, Math.max(0, c.fair))));
  const x = d3.scaleLinear().domain([0, mx]).nice().range([labelW, w - valW]);
  let s = `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="Salary against DARKO fair value">`;
  for (const t of x.ticks(4)) s += `<line class="grid-l" x1="${x(t)}" x2="${x(t)}" y1="0" y2="${H - 22}"/><text class="axis-t" x="${x(t)}" y="${H - 6}" text-anchor="middle">$${(t / 100).toFixed(0)}M</text>`;
  rows.forEach((c, i) => {
    const y = i * rh + 12; const xs = x(c.sal); const xf = x(Math.max(0, c.fair));
    s += `<a href="#p${c.id}"><text class="lbl-t" x="0" y="${y + 4}">${esc(c.name.length > 20 ? shortName(c.id) : c.name)}</text></a>`;
    s += `<line x1="${xs}" x2="${xf}" y1="${y}" y2="${y}" style="stroke:${c.surplus >= 0 ? 'var(--up)' : 'var(--down)'};stroke-width:2.5"/>`;
    s += `<circle cx="${xs}" cy="${y}" r="4.5" style="fill:var(--surface);stroke:var(--ink);stroke-width:2"/><circle class="dot" cx="${xf}" cy="${y}" r="4.5"/>`;
    s += `<text class="val-t" x="${w}" y="${y + 4}" text-anchor="end" style="fill:${c.surplus >= 0 ? 'var(--up)' : 'var(--down)'}">${money(c.surplus, true)}</text>`;
    s += `<rect class="hit" x="0" y="${y - rh / 2}" width="${w}" height="${rh}" data-i="${i}"/>`;
  });
  s += '</svg>';
  el.innerHTML = s;
  $$('rect.hit', el).forEach((hit) => {
    const c = rows[Number(hit.dataset.i)];
    hit.addEventListener('pointermove', (ev) => TIP.show(ttHead(c.name) + ttRow(money(c.fair), 'DARKO fair value', KEY.ink) + ttRow(money(c.sal), '2025-26 salary', KEY.soft) + ttRow(money(c.surplus, true), 'surplus', c.surplus >= 0 ? 'var(--up)' : 'var(--down)'), ev.clientX, ev.clientY));
    hit.addEventListener('pointerleave', () => TIP.hide());
  });
}

VIEWS.team = {
  title: (r) => (TEAM_BY_ABBR.get(r.abbr) || { full: 'Team' }).full,
  html(r) {
    const t = TEAM_BY_ABBR.get(r.abbr);
    if (!t) return '<div class="empty">Team not found.</div>';
    const b = TEAM_BASE[t.i];
    const lu = RAW.lineups[t.i] || [];
    const players = BY_TEAM.get(t.i) || [];
    const payroll = sum(players.filter((c) => c.sal != null), (c) => c.sal);
    const value = sum(players.filter((c) => c.fair != null), (c) => Math.max(0, c.fair));
    const core = b.roster.slice(0, 9).map((r2) => CUR_BY_ID.get(r2.id));
    const confRank = [...TEAMS].filter((x) => x.conf === t.conf).sort((a, c2) => c2.w - a.w).findIndex((x) => x.abbr === t.abbr) + 1;
    return `
    <section class="t-head">
      <div class="t-badge" style="background:${t.c[0]}">${t.abbr}</div>
      <div class="p-id"><span class="eyebrow">${t.conf === 'E' ? 'Eastern' : 'Western'} Conference · 2025-26</span><h1 class="display">${esc(t.full)}</h1>
        <div class="p-facts"><span>${t.w}-${t.l}</span><span>${ordinal(confRank)} in the ${t.conf === 'E' ? 'East' : 'West'}</span><span>SRS ${sgn(t.srs, 2)}</span>${resultPill(t)}</div>
        <div class="p-actions"><a class="btn primary" href="#lab-${t.abbr}">${ICON.flask} Rebuild in Roster Lab</a><a class="btn ghost" href="#teams">All teams</a></div></div>
      <div class="p-score"><span class="lbl">DARKO rating · #${b.rank} of 30</span><span class="big-num">${sgn(b.r)}</span><div class="p-split">${oxPair(b.o, b.d)}</div><span class="note">Worth about ${Math.round(winsFor(b.r))} wins over 82 games</span></div>
    </section>
    <div class="grid">
      <section class="panel c7"><div class="ph"><div class="ph-l"><h2>Where the rating comes from</h2><span class="sub">Each player's DPM times his share of the 48 minutes. The bars add up to the team's ${sgn(b.r)}.</span></div></div><div class="chart" id="contribChart"></div></section>
      <section class="panel c5"><div class="ph"><div class="ph-l"><h2>Best five-man lineups</h2><span class="sub">DARKO lineup model (prior-informed), 100+ possessions</span></div></div>
        ${lu.length ? `<div class="lineup head"><span>Lineup</span><span class="v">Poss</span><span class="v">Net</span><span class="v">Off</span><span class="v">Def</span></div>${lu.map((l) => `<div class="lineup"><span class="who">${l.slice(0, 5).map((id) => `<a href="#p${id}">${esc(lastName(id))}</a>`).join('')}</span><span class="v muted">${l[5].toLocaleString()}</span><span class="v"><b>${sgn(l[6])}</b></span><span class="v">${sgn(l[7])}</span><span class="v">${sgn(l[8])}</span></div>`).join('')}` : '<div class="empty">No lineup with 100+ possessions.</div>'}
      </section>
      <section class="panel c7"><div class="ph"><div class="ph-l"><h2>Payroll against DARKO value</h2><span class="sub">Hollow dot: 2025-26 salary. Solid dot: DARKO fair value. Payroll ${money(payroll)} for ${money(value)} of value.</span></div></div><div class="chart" id="payChart"></div></section>
      <section class="panel c5"><div class="ph"><div class="ph-l"><h2>Core outlook</h2><span class="sub">Rotation players by minutes: age, rating and staying power</span></div></div>
        <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th class="l">Player</th><th>Age</th><th>DPM</th><th>Seasons left</th><th>On a roster in 3 yrs</th></tr></thead><tbody>
        ${core.map((c) => `<tr><td class="l">${plink(c.id, c.name.length > 20 ? shortName(c.id) : c.name)}</td><td>${Math.floor(c.age)}</td><td><b>${sgn(c.dpm)}</b></td><td>${fx(c.yrs, 1)}</td><td>${c.s && c.s[2] != null ? pct0(c.s[2]) : '—'}</td></tr>`).join('')}
        </tbody></table></div></section>
    </div>`;
  },
  mount(r) {
    const t = TEAM_BY_ABBR.get(r.abbr);
    if (!t) return;
    chart($('#contribChart'), (el, w) => drawContrib(el, w, t.i));
    chart($('#payChart'), (el, w) => drawPayroll(el, w, t.i));
  },
};
