/* ---------- Rewind: 30 seasons of the DARKO top 15, week by week ---------- */
const RW = { playing: false, speed: Number(store.get('rwSpeed', 1)), timer: 0 };
const RW_JUMPS = ['1998-03-05', '2003-03-13', '2009-03-12', '2016-03-10', '2020-02-06', '2023-03-09', '2026-03-12'];
const rwJumpLabel = (d) => { const fi = frameIndexFor(d); const t = FRAME_TOP[fi][0]; return `${seasonLabel(seasonOfDate(FRAMES[fi]))} · ${t ? lastName(t[0]) : ''}`; };
const rwFrame = () => frameIndexFor(STATE.asOf >= DAYS[0] && STATE.asOf > FRAMES[FRAMES.length - 1] ? FRAMES[FRAMES.length - 1] : STATE.asOf);
const rwDur = () => Math.round(820 / RW.speed);

function rwReigns(fi) {
  const cnt = new Map();
  for (let i = 0; i <= fi; i++) { const t = FRAME_TOP[i][0]; if (t) cnt.set(t[0], (cnt.get(t[0]) || 0) + 1); }
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]);
}
function rwSeasonWeek(fi) {
  const s = seasonOfDate(FRAMES[fi]);
  let first = fi; while (first > 0 && seasonOfDate(FRAMES[first - 1]) === s) first--;
  let last = fi; while (last < FRAMES.length - 1 && seasonOfDate(FRAMES[last + 1]) === s) last++;
  return { s, week: fi - first + 1, weeks: last - first + 1 };
}
function rwHeadHtml(fi) {
  const { s, week, weeks } = rwSeasonWeek(fi);
  const top = FRAME_TOP[fi][0];
  return `<div class="rw-date"><span class="eyebrow">${seasonLabel(s)} · week ${week} of ${weeks}</span><span class="big-num">${esc(dateStr(FRAMES[fi]))}</span>
    <span class="soft">${top ? `No. 1: <b style="color:var(--ink)">${esc(P.name(top[0]))}</b> at ${sgn(top[1] / 100, 2)}` : ''}</span></div>`;
}
function rwReignHtml(fi) {
  const r = rwReigns(fi).slice(0, 10);
  const max = r.length ? r[0][1] : 1;
  const now = FRAME_TOP[fi][0] ? FRAME_TOP[fi][0][0] : null;
  return r.map(([id, n]) => `<div class="reign${id === now ? ' now' : ''}"><b>${plink(id)}</b><span class="w">${n}</span><div class="meter"><i style="width:${(n / max) * 100}%;${id === now ? 'background:var(--maple)' : ''}"></i></div></div>`).join('');
}
function drawRace(el, w, animate) {
  const fi = rwFrame();
  const n = 15; const rowH = w < 520 ? 26 : 30; const H = n * rowH + 30;
  const labelW = Math.round(w < 560 ? clamp(w * 0.36, 112, 150) : clamp(w * 0.4, 130, 230));
  const x = d3.scaleLinear().domain([0, 10]).range([labelW, w - 58]);
  let svg = d3.select(el).select('svg');
  if (svg.empty() || Number(svg.attr('data-w')) !== w) {
    el.innerHTML = '';
    svg = d3.select(el).append('svg').attr('data-w', w).attr('viewBox', `0 0 ${w} ${H}`).attr('width', w).attr('height', H)
      .attr('role', 'img').attr('aria-label', 'Top 15 players by DPM for the selected week');
    const ax = svg.append('g').attr('class', 'axis');
    for (const t of [0, 2, 4, 6, 8, 10]) {
      ax.append('line').attr('class', t === 0 ? 'zero' : 'grid-l').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 0).attr('y2', H - 22);
      ax.append('text').attr('class', 'axis-t').attr('x', x(t)).attr('y', H - 6).attr('text-anchor', 'middle').text(t === 0 ? '0' : `+${t}`);
    }
    svg.append('g').attr('class', 'bars');
  }
  const data = (FRAME_TOP[fi] || []).slice(0, n).map((r, i) => ({ id: r[0], v: r[1] / 100, tm: r[2], i }));
  const dur = animate && !reduceMotion() ? rwDur() : 0;
  const t = svg.transition().duration(dur).ease(d3.easeLinear);
  const narrow = w < 560;
  const g = svg.select('g.bars').selectAll('g.bar').data(data, (d) => d.id);
  const enter = g.enter().append('g').attr('class', 'bar').attr('transform', `translate(0,${H})`);
  enter.append('rect').attr('class', 'race-rect').attr('x', labelW).attr('y', 4).attr('height', rowH - 9).attr('rx', 3).attr('width', 0);
  enter.append('text').attr('class', 'race-rank').attr('x', 0).attr('y', rowH / 2 + 3);
  enter.append('text').attr('class', 'race-bar-name').attr('x', 24).attr('y', rowH / 2 + 3);
  enter.append('text').attr('class', 'race-bar-team').attr('x', labelW - 8).attr('text-anchor', 'end').attr('y', rowH / 2 + 3);
  enter.append('text').attr('class', 'race-bar-val').attr('x', labelW + 6).attr('y', rowH / 2 + 3);
  const all = enter.merge(g);
  all.select('.race-rect').classed('first', (d) => d.i === 0);
  all.select('.race-rank').text((d) => d.i + 1);
  const nm = (d) => { if (!narrow) return P.name(d.id); const l = lastName(d.id); return l.length > 12 ? `${l.slice(0, 11)}…` : l; };
  all.select('.race-bar-name').text(nm).style('font-size', narrow ? '12px' : null);
  all.select('.race-bar-team').text((d) => (!narrow && TEAMS[d.tm] ? TEAMS[d.tm].abbr : ''));
  all.transition(t).attr('transform', (d) => `translate(0,${d.i * rowH + 2})`);
  all.select('.race-rect').transition(t).attr('width', (d) => Math.max(0, x(clamp(d.v, 0, 10)) - labelW));
  all.select('.race-bar-val').transition(t).attr('x', (d) => x(clamp(d.v, 0, 10)) + 6)
    .tween('text', function (d) {
      const from = Number(this.dataset.v ?? d.v);
      const it = d3.interpolateNumber(from, d.v);
      this.dataset.v = d.v;
      return (tt) => { this.textContent = sgn(it(tt), 2); };
    });
  g.exit().transition(t).attr('transform', `translate(0,${H + 12})`).remove();
}
function rwStop() { RW.playing = false; clearInterval(RW.timer); RW.timer = 0; const b = $('#rwPlay'); if (b) { b.innerHTML = `${ICON.play} Play`; b.setAttribute('aria-pressed', 'false'); } }
function rwPlay() {
  if (RW.playing) { rwStop(); return; }
  let fi = rwFrame();
  if (fi >= FRAMES.length - 1) { fi = 0; setAsOf(FRAMES[0]); }
  RW.playing = true;
  const b = $('#rwPlay'); if (b) { b.innerHTML = `${ICON.pause} Pause`; b.setAttribute('aria-pressed', 'true'); }
  RW.timer = setInterval(() => {
    const cur = rwFrame();
    if (cur >= FRAMES.length - 1) { rwStop(); return; }
    setAsOf(FRAMES[cur + 1]);
  }, rwDur());
}

VIEWS.rewind = {
  title: () => 'Rewind',
  html() {
    const fi = rwFrame();
    const cur = seasonOfDate(FRAMES[fi]);
    return `
    <section class="page-head"><div class="t">
      <span class="eyebrow">New · time machine</span>
      <h1 class="display">Rewind</h1>
      <p class="lede">DARKO has a rating for every player on every day since November 1996. Press play to watch 30 seasons of the top 15, one week per beat, or drag the timeline under the menu to any date. The whole site follows that date.</p>
    </div></section>
    <div class="rw-head">
      <div id="rwHead">${rwHeadHtml(fi)}</div>
      <div class="controls" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <button class="btn primary" type="button" id="rwPlay" aria-pressed="false">${ICON.play} Play</button>
        <button class="btn" type="button" data-rwstep="-1" aria-label="Previous week">‹ Week</button><button class="btn" type="button" data-rwstep="1" aria-label="Next week">Week ›</button>
        <div class="seg" role="group" aria-label="Speed">${[1, 2, 4].map((sp) => `<button type="button" data-speed="${sp}" aria-pressed="${RW.speed === sp}">${sp}×</button>`).join('')}</div>
        <label class="sr-only" for="rwSeason">Season</label><select class="select" id="rwSeason">${SEASONS.map((s) => `<option value="${s}"${s === cur ? ' selected' : ''}>${seasonLabel(s)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="jumps" style="margin-bottom:16px"><span class="eyebrow" style="align-self:center;margin-right:4px">Jump to</span>${RW_JUMPS.map((d) => `<button class="btn sm" type="button" data-jump="${d}">${esc(rwJumpLabel(d))}</button>`).join('')}</div>
    <div class="rw-layout">
      <section class="panel"><div class="ph"><div class="ph-l"><h2>Top 15 by DPM</h2><span class="sub">Regular-season weeks. Players need 3+ games that season and a game in the last four weeks. The scale is fixed so eras compare.</span></div></div><div class="chart" id="raceChart"></div></section>
      <aside class="panel"><div class="ph"><div class="ph-l"><h2>Weeks at No. 1</h2><span class="sub">Since 1996-97, through this week</span></div></div><div id="rwReigns">${rwReignHtml(fi)}</div></aside>
    </div>`;
  },
  mount() {
    chart($('#raceChart'), (el, w) => drawRace(el, w, false));
    $('#rwPlay').addEventListener('click', rwPlay);
    $$('[data-rwstep]').forEach((b) => b.addEventListener('click', () => { rwStop(); const fi = clamp(rwFrame() + Number(b.dataset.rwstep), 0, FRAMES.length - 1); setAsOf(FRAMES[fi]); }));
    $$('[data-speed]').forEach((b) => b.addEventListener('click', () => {
      RW.speed = Number(b.dataset.speed); store.set('rwSpeed', RW.speed);
      $$('[data-speed]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (RW.playing) { rwStop(); rwPlay(); }
    }));
    $('#rwSeason').addEventListener('change', (e) => { rwStop(); const s = Number(e.target.value); const r = META.reg[s]; setAsOf(FRAMES[frameIndexFor(addDays(r[0], 6))]); });
    $$('[data-jump]').forEach((b) => b.addEventListener('click', () => { rwStop(); setAsOf(FRAMES[frameIndexFor(b.dataset.jump)]); }));
  },
  onAsOf() {
    const fi = rwFrame();
    const head = $('#rwHead'); if (head) head.innerHTML = rwHeadHtml(fi);
    const rg = $('#rwReigns'); if (rg) rg.innerHTML = rwReignHtml(fi);
    const sel = $('#rwSeason'); if (sel) sel.value = String(seasonOfDate(FRAMES[fi]));
    const el = $('#raceChart'); if (el) drawRace(el, Math.floor(el.clientWidth), true);
  },
  unmount() { rwStop(); },
};
