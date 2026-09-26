/* ---------- DARKOdle: name the player from his career DPM curve ---------- */
const DLE_EPOCH = '2026-09-01';
function dlePuzzleNumber() { return Math.max(1, daysBetween(DLE_EPOCH, localISO()) + 1); }
const DLE = { mode: 'daily', practiceId: null, practice: [] };
const dleAnswer = () => (DLE.mode === 'practice' ? DLE.practiceId : DLE_POOL[(dlePuzzleNumber() - 1) % DLE_POOL.length]);
const dleKey = () => `dle.${dlePuzzleNumber()}`;
function dleState() {
  if (DLE.mode === 'practice') return { g: DLE.practice, done: DLE.practice.includes(DLE.practiceId) || DLE.practice.length >= 6 };
  const st = store.get(dleKey(), { g: [] });
  st.done = st.g.includes(dleAnswer()) || st.g.length >= 6;
  return st;
}
function dleFacts(id) {
  const rows = SE_BY_ID.get(id) || [];
  const real = rows.filter((r) => r.gp >= 20);
  const peak = (real.length ? real : rows).reduce((b, r) => (!b || r.dpm > b.dpm ? r : b), null);
  const tmCount = new Map(); for (const r of rows) tmCount.set(r.tm, (tmCount.get(r.tm) || 0) + r.gp);
  const mainTm = [...tmCount.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    rows, peak, seasons: rows.length, debut: P.rookie(id) || (rows[0] && rows[0].season), teams: new Set(real.map((r) => r.tm)),
    mainTm: mainTm ? mainTm[0] : -1, pg: posGroup(P.pos(id)),
  };
}
function dleFeedback(gid, aid) {
  const g = dleFacts(gid); const a = dleFacts(aid);
  const cmp = (gv, av, tol, fmtHi, fmtLo) => (Math.abs(gv - av) <= tol ? { hit: true, t: fmtHi } : { hit: false, t: av > gv ? `${fmtLo} ↑` : `${fmtLo} ↓` });
  const out = [];
  out.push(g.peak && a.peak ? cmp(g.peak.dpm, a.peak.dpm, 0.35, 'Peak ✓', 'Peak') : { hit: false, t: 'Peak ?' });
  out.push(cmp(g.debut || 0, a.debut || 0, 0, 'Debut ✓', 'Debut'));
  out.push(cmp(g.seasons, a.seasons, 0, 'Seasons ✓', 'Seasons'));
  out.push(g.pg === a.pg ? { hit: true, t: 'Pos ✓' } : { hit: false, t: 'Pos ✗' });
  const share = [...g.teams].some((t) => a.teams.has(t));
  out.push(share ? { hit: true, t: 'Team ✓' } : { hit: false, t: 'Team ✗' });
  return out;
}
function dleHints(aid, misses, done) {
  const f = dleFacts(aid);
  const t = TEAMS[f.mainTm];
  const list = [
    ['Career curve', `${f.seasons} seasons in DARKO's data (since 1996-97). Peak season-end DPM ${sgn(f.peak.dpm)}.`],
    ['Position', `${POS_NAME[f.pg]} (${P.pos(aid) || '—'})`],
    ['Arrival', `${f.debut ? `Rookie season ${seasonLabel(f.debut)}` : 'Debut before 1996-97'} · first DARKO season ${seasonLabel(f.rows[0].season)}`],
    ['Offense and defense', `The ${gO} offense and ${gX} defense lines now show on the chart. Peak season: ${seasonLabel(f.peak.season)}.`],
    ['Frame', `${heightStr(P.ht(aid))}${P.country(aid) ? ` · ${esc(P.country(aid))}` : ''}`],
    ['Franchise', t ? `Played the most games for the ${t.full}` : 'No main franchise'],
  ];
  return list.map(([k, v], i) => {
    const open = done || i <= misses;
    return `<div class="hint${open ? '' : ' locked'}"><span class="n">${i + 1}</span><span>${open ? `<b>${k}.</b> ${v}` : `${k}: unlocks after ${i === 1 ? 'your first miss' : `${i} misses`}`}</span></div>`;
  }).join('');
}
function drawDle(el, w) {
  const aid = dleAnswer(); const st = dleState();
  const misses = st.g.filter((g) => g !== aid).length;
  const showOD = st.done || misses >= 3;
  const ans = SE_BY_ID.get(aid) || [];
  const guesses = st.g.filter((g) => g !== aid).map((g) => ({ id: g, rows: SE_BY_ID.get(g) || [] }));
  const H = Math.min(360, Math.max(260, w * 0.5)); const m = { l: 44, r: 20, t: 16, b: 30 };
  const all = [...ans, ...guesses.flatMap((g) => g.rows)];
  const x = d3.scaleLinear().domain([Math.min(19, ...all.map((r) => r.age)) - 0.3, Math.max(36, ...all.map((r) => r.age)) + 0.3]).range([m.l, w - m.r]);
  const vals = [...all.map((r) => r.dpm), ...(showOD ? ans.flatMap((r) => [r.o, r.dpm - r.o]) : []), 0];
  const y = d3.scaleLinear().domain(yDomain(vals, 4)).nice(5).range([H - m.b, m.t]);
  let s = `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="Mystery player's season-end DPM by age">`;
  s += yGrid(y, y.ticks(5), m.l, w - m.r, (v) => fx(v, 0));
  for (let a = Math.ceil(x.domain()[0]); a <= x.domain()[1]; a += (w < 520 ? 3 : 2)) s += `<text class="axis-t" x="${x(a)}" y="${H - 10}" text-anchor="middle">${a}</text>`;
  s += `<text class="axis-t" x="${w - m.r}" y="${H - 10}" text-anchor="end" dy="-12">Age</text>`;
  const L = (rows, f) => d3.line().x((r) => x(r.age)).y((r) => y(f(r))).curve(d3.curveMonotoneX)(rows);
  guesses.forEach((g, i) => {
    if (g.rows.length < 1) return;
    s += `<path class="ln-soft" d="${L(g.rows, (r) => r.dpm)}"/>`;
    if (i === guesses.length - 1) { const lr = g.rows[g.rows.length - 1]; s += `<text class="lbl-s" x="${Math.min(x(lr.age) + 6, w - m.r - 2)}" y="${y(lr.dpm) + 4}" ${x(lr.age) > w - 120 ? 'text-anchor="end" dx="-12"' : ''}>${esc(lastName(g.id))}</text>`; }
  });
  if (showOD && ans.length > 1) s += `<path class="ln-d" d="${L(ans, (r) => r.dpm - r.o)}"/><path class="ln-o" d="${L(ans, (r) => r.o)}"/>`;
  if (ans.length > 1) s += `<path class="ln-2" d="${L(ans, (r) => r.dpm)}"/>`;
  s += ans.map((r) => `<circle class="dot" r="4" cx="${x(r.age)}" cy="${y(r.dpm)}"><title>Age ${Math.floor(r.age)}: ${sgn(r.dpm)}</title></circle>`).join('');
  s += '</svg>';
  el.innerHTML = s;
}
function dleShareText() {
  const aid = dleAnswer(); const st = dleState(); const won = st.g.includes(aid);
  const rows = st.g.map((g) => (g === aid ? '■' : '□')).join('');
  return `DARKOdle #${dlePuzzleNumber()} ${won ? st.g.length : 'X'}/6\n${rows}\nName the player from his DARKO career curve.`;
}
function dleGuess(id) {
  const aid = dleAnswer(); const st = dleState();
  if (st.done || st.g.includes(id)) return;
  if (DLE.mode === 'practice') { DLE.practice.push(id); }
  else {
    st.g.push(id);
    store.set(dleKey(), { g: st.g });
    const done = st.g.includes(aid) || st.g.length >= 6;
    if (done) {
      const stats = store.get('dleStats', { played: 0, won: 0, streak: 0, best: 0, last: 0 });
      const n = dlePuzzleNumber();
      if (stats.last !== n) {
        stats.played += 1;
        if (st.g.includes(aid)) { stats.won += 1; stats.streak = stats.last === n - 1 ? stats.streak + 1 : 1; stats.best = Math.max(stats.best, stats.streak); } else stats.streak = 0;
        stats.last = n; store.set('dleStats', stats);
      }
    }
  }
  render({ keepScroll: true });
}
const DLE_NAMES = Object.keys(PM).map(Number).filter((id) => SE_BY_ID.has(id)).map((id) => ({ id, n: norm(P.name(id)), seasons: SE_BY_ID.get(id).length }));

VIEWS.darkodle = {
  title: () => 'DARKOdle',
  html() {
    const aid = dleAnswer(); const st = dleState();
    const won = st.g.includes(aid); const misses = st.g.filter((g) => g !== aid).length;
    const stats = store.get('dleStats', { played: 0, won: 0, streak: 0, best: 0 });
    const n = dlePuzzleNumber();
    return `
    <section class="page-head"><div class="t">
      <span class="eyebrow">New · ${DLE.mode === 'practice' ? 'practice round' : `daily puzzle #${n} · ${esc(dateLong(localISO()))}`}</span>
      <h1 class="display">DARKOdle</h1>
      <p class="lede">The chart shows a mystery player's season-end DPM at every age of his career. You have six guesses. Every miss unlocks a hint and draws your guess's career in grey so you can compare the shapes.</p>
    </div><div class="controls">${DLE.mode === 'practice' ? '<button class="btn" type="button" id="dleDaily">Back to today\'s puzzle</button><button class="btn" type="button" id="dleNew">New random player</button>' : '<button class="btn" type="button" id="dlePractice">Practice with a random player</button>'}</div></section>
    <div class="dle">
      <section class="panel">
        <div class="ph"><div class="ph-l"><h2>${st.done ? esc(P.name(aid)) : 'Who is this?'}</h2><span class="sub">Season-end DPM by age${misses >= 3 || st.done ? `, with offense ${gO} and defense ${gX}` : ''}</span></div><span class="pill">${st.g.length}/6 guesses</span></div>
        <div class="chart" id="dleChart"></div>
        ${st.done ? `<div class="result" style="margin-top:14px"><span class="eyebrow">${won ? `Solved in ${st.g.length}` : 'Out of guesses'}</span><h3>${won ? 'Got him.' : 'It was'} ${plink(aid)}</h3>
          <p class="soft">${esc(dleFacts(aid).seasons)} seasons, peak ${sgn(dleFacts(aid).peak.dpm)} in ${seasonLabel(dleFacts(aid).peak.season)}.</p>
          ${DLE.mode === 'daily' ? `<div class="row"><button class="btn primary" type="button" id="dleShare">${ICON.copy} Copy result</button><span class="note">Next puzzle tomorrow. Streak ${stats.streak} · best ${stats.best} · won ${stats.won} of ${stats.played}</span></div><textarea id="dleShareText" class="input" style="width:100%;height:72px;margin-top:8px;padding:8px;font-family:var(--mono);font-size:12px" readonly hidden>${esc(dleShareText())}</textarea>` : '<div class="row"><button class="btn primary" type="button" id="dleNew2">Another one</button></div>'}</div>`
          : `<div class="addbox" style="margin-top:14px"><label class="sr-only" for="dleInput">Your guess</label><input class="input" id="dleInput" placeholder="Type a player's name…" autocomplete="off" style="width:100%;height:42px;font-size:15px"><div class="suggest" id="dleSug" hidden role="listbox"></div></div>`}
        ${st.g.length ? `<div class="guesses" style="margin-top:14px">${st.g.map((g) => `<div class="guess"><span class="gn">${g === aid ? '■ ' : ''}${esc(P.name(g))}</span>${g === aid ? '<span class="fb hit">Correct</span>' : dleFeedback(g, aid).slice(0, 4).map((f) => `<span class="fb${f.hit ? ' hit' : ''}">${esc(f.t)}</span>`).join('')}</div>`).join('')}</div><p class="note" style="margin-top:8px">Arrows point toward the answer: Peak ↑ means his peak DPM is higher than your guess's; Debut ↑ means he arrived later.</p>` : ''}
      </section>
      <aside class="panel"><div class="ph"><div class="ph-l"><h2>Hints</h2><span class="sub">${st.done ? 'All hints' : `${Math.min(misses + 1, 6)} of 6 unlocked`}</span></div></div><div class="hints">${dleHints(aid, misses, st.done)}</div></aside>
    </div>`;
  },
  mount() {
    chart($('#dleChart'), drawDle);
    const pr = $('#dlePractice'); if (pr) pr.addEventListener('click', () => { DLE.mode = 'practice'; DLE.practice = []; const today = DLE_POOL[(dlePuzzleNumber() - 1) % DLE_POOL.length]; do { DLE.practiceId = DLE_POOL[Math.floor(Math.random() * DLE_POOL.length)]; } while (DLE.practiceId === today); render(); });
    const nw = () => { DLE.practice = []; DLE.practiceId = DLE_POOL[Math.floor(Math.random() * DLE_POOL.length)]; render(); };
    const b1 = $('#dleNew'); if (b1) b1.addEventListener('click', nw);
    const b2 = $('#dleNew2'); if (b2) b2.addEventListener('click', nw);
    const bd = $('#dleDaily'); if (bd) bd.addEventListener('click', () => { DLE.mode = 'daily'; render(); });
    const sh = $('#dleShare');
    if (sh) sh.addEventListener('click', () => {
      const text = dleShareText();
      const fallback = () => { const ta = $('#dleShareText'); ta.hidden = false; ta.focus(); ta.select(); toast('Select and copy the text below'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('Copied result'), fallback); else fallback();
    });
    const inp = $('#dleInput'); const box = $('#dleSug');
    if (!inp) return;
    let items = []; let sel = 0;
    const st = dleState();
    const paint = () => {
      box.innerHTML = items.map((it, i) => { const rows = SE_BY_ID.get(it.id); return `<button type="button" role="option" aria-selected="${i === sel}" data-g="${it.id}"><b>${esc(P.name(it.id))}</b><span class="muted" style="font-size:12px">${seasonLabel(rows[0].season)}–${seasonLabel(rows[rows.length - 1].season).slice(-2)}</span></button>`; }).join('');
      box.hidden = !items.length;
      $$('[data-g]', box).forEach((b) => b.addEventListener('mousedown', (ev) => { ev.preventDefault(); dleGuess(Number(b.dataset.g)); }));
    };
    inp.addEventListener('input', () => {
      const q = norm(inp.value);
      if (q.length < 2) { items = []; paint(); return; }
      const starts = []; const has = [];
      for (const p of DLE_NAMES) {
        if (st.g.includes(p.id)) continue;
        if (p.n.startsWith(q) || p.n.split(' ').some((w2) => w2.startsWith(q))) starts.push(p); else if (p.n.includes(q)) has.push(p);
      }
      items = [...starts.sort((a, b) => b.seasons - a.seasons), ...has.sort((a, b) => b.seasons - a.seasons)].slice(0, 8);
      sel = 0; paint();
    });
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); paint(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); paint(); ev.preventDefault(); }
      else if (ev.key === 'Enter' && items[sel]) { dleGuess(items[sel].id); ev.preventDefault(); }
      else if (ev.key === 'Escape') { items = []; paint(); }
    });
    inp.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 150));
  },
};
