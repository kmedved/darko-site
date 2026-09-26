/* ---------- Roster Lab: rebuild rotations, trade between two teams ---------- */
const LAB = Object.assign({ a: 'NYK', b: 'SAS', rosters: {}, auto: true }, store.get('lab', {}));
const labSave = () => store.set('lab', LAB);
const defaultRoster = (abbr) => rotationFor(TEAM_BY_ABBR.get(abbr).i).map((r) => ({ id: r.id, min: Number(r.min.toFixed(1)) }));
function labRoster(abbr) {
  if (!LAB.rosters[abbr]) return defaultRoster(abbr);
  return LAB.rosters[abbr];
}
function labEdit(abbr) {
  if (!LAB.rosters[abbr]) LAB.rosters[abbr] = defaultRoster(abbr);
  return LAB.rosters[abbr];
}
function rebalance(roster, fixedId) {
  const fixed = roster.find((r) => r.id === fixedId);
  const target = 240 - (fixed ? fixed.min : 0);
  const others = roster.filter((r) => r !== fixed && r.min > 0);
  for (let pass = 0; pass < 4; pass++) {
    const free = others.filter((r) => r.min < 42);
    const capped = sum(others.filter((r) => r.min >= 42), (r) => r.min);
    const s = sum(free, (r) => r.min);
    if (s <= 0) break;
    const k = (target - capped) / s;
    for (const r of free) r.min = clamp(r.min * k, 0, 42);
    if (Math.abs(sum(others, (r) => r.min) - target) < 0.05) break;
  }
  for (const r of roster) r.min = Math.round(r.min * 10) / 10;
}
function defaultMinutes(id) {
  const c = CUR_BY_ID.get(id);
  const rot = (RAW.rot[c.tm] || []).find((r) => r[0] === id);
  return Number(clamp(rot ? rot[1] : c.mpg || 18, 6, 38).toFixed(1));
}
function labAdd(abbr, id) {
  const other = abbr === LAB.a ? LAB.b : LAB.a;
  const ro = labEdit(other);
  const k = ro.findIndex((r) => r.id === id);
  let min = defaultMinutes(id);
  if (k >= 0 && other !== abbr) { min = ro[k].min || min; ro.splice(k, 1); if (LAB.auto) rebalance(ro); }
  const roster = labEdit(abbr);
  if (roster.some((r) => r.id === id)) return;
  roster.push({ id, min, add: 1 });
  if (LAB.auto) rebalance(roster, id);
  labSave();
}
function labRemove(abbr, id) {
  const roster = labEdit(abbr);
  const k = roster.findIndex((r) => r.id === id);
  if (k < 0) return;
  roster.splice(k, 1);
  if (LAB.auto) rebalance(roster);
  labSave();
}
function labScore(abbr) {
  const t = TEAM_BY_ABBR.get(abbr);
  const now = rateRoster(labRoster(abbr));
  const base = TEAM_BASE[t.i];
  const others = TEAM_BASE.filter((b) => b.t.abbr !== LAB.a && b.t.abbr !== LAB.b).map((b) => b.r);
  const otherSide = abbr === LAB.a ? LAB.b : LAB.a;
  if (otherSide !== abbr) others.push(rateRoster(labRoster(otherSide)).r);
  const rank = 1 + others.filter((r) => r > now.r).length;
  const sal = sum(labRoster(abbr), (r) => (CUR_BY_ID.get(r.id) || {}).sal || 0);
  const salBase = sum(base.roster, (r) => (CUR_BY_ID.get(r.id) || {}).sal || 0);
  return { t, now, base, rank, sal, salBase };
}
function labSideHtml(side) {
  const abbr = LAB[side];
  const sc = labScore(abbr);
  const roster = labRoster(abbr).slice().sort((a, b) => b.min - a.min);
  const tot = sum(roster, (r) => r.min);
  const opts = TEAMS.map((t) => `<option value="${t.abbr}"${t.abbr === abbr ? ' selected' : ''}>${esc(t.full)}</option>`).join('');
  const modified = !!LAB.rosters[abbr];
  return `
  <section class="panel lab-side" data-side="${side}" aria-label="${esc(sc.t.full)} roster">
    <div class="lab-top"><span class="t-badge" style="width:36px;height:36px;border-radius:9px;font-size:11px;background:${sc.t.c[0]}">${abbr}</span>
      <label class="sr-only" for="labSel-${side}">Team</label><select class="select" id="labSel-${side}" data-sel="${side}" style="flex:1;min-width:0">${opts}</select>
      <button class="btn sm ghost" type="button" data-reset="${side}"${modified ? '' : ' disabled'}>Reset</button></div>
    <div class="lab-score" data-score="${side}">${labScoreHtml(sc)}</div>
    <div class="minbar"><div class="row"><span>Minutes <b data-mintot="${side}">${tot.toFixed(0)}</b> of 240</span><span class="muted">Salary <b data-sal="${side}">${money(sc.sal)}</b> <span data-saldelta="${side}">${sc.sal !== sc.salBase ? `(${money(sc.sal - sc.salBase, true)})` : ''}</span></span></div>
      <div class="meter"><i data-minmeter="${side}" style="width:${clamp(tot / 240, 0, 1) * 100}%;${Math.abs(tot - 240) > 1 ? 'background:var(--down)' : ''}"></i></div></div>
    <div class="lab-roster">
      <div class="lr head"><span>Player</span><span class="v">DPM</span><span>Minutes</span><span class="m">Min</span><span></span></div>
      ${roster.map((r) => { const c = CUR_BY_ID.get(r.id); return `<div class="lr${r.add ? ' added' : ''}" data-row="${r.id}"><span class="who"><a href="#p${c.id}" title="${esc(c.name)}">${esc(c.name.length > 15 ? shortName(c.id) : c.name)}</a><span>${r.add && c.team && c.team.abbr !== abbr ? `from ${c.team.abbr} · ` : ''}${esc(c.pos || '')} · ${c.age.toFixed(0)}</span></span><span class="v">${sgn(c.dpm)}</span><input type="range" min="0" max="44" step="0.5" value="${r.min}" data-min="${side}:${r.id}" aria-label="Minutes for ${esc(c.name)}"><span class="m" data-minv="${side}:${r.id}">${r.min.toFixed(1)}</span><span class="acts"><button class="mbtn" type="button" data-move="${side}:${r.id}" title="Send to ${LAB[side === 'a' ? 'b' : 'a']}" aria-label="Send ${esc(c.name)} to ${LAB[side === 'a' ? 'b' : 'a']}">${ICON.swap}</button><button class="mbtn" type="button" data-rm="${side}:${r.id}" aria-label="Remove ${esc(c.name)}">${ICON.x}</button></span></div>`; }).join('')}
    </div>
    <div class="addbox"><label class="sr-only" for="labAdd-${side}">Add a player</label><input class="input" id="labAdd-${side}" data-add="${side}" placeholder="Add any player: sign or trade for him…" autocomplete="off" style="width:100%"><div class="suggest" data-sug="${side}" hidden></div></div>
  </section>`;
}
function labScoreHtml(sc) {
  const dr = sc.now.r - sc.base.r; const dw = winsFor(sc.now.r) - winsFor(sc.base.r);
  return `<div class="stat"><span class="k">DARKO rating</span><span class="v">${sgn(sc.now.r)}</span><span class="s">${Math.abs(dr) >= 0.05 ? deltaHtml(dr, 1) + ' vs actual' : oxPair(sc.now.o, sc.now.d)}</span></div>
    <div class="stat"><span class="k">Projected wins</span><span class="v">${Math.round(winsFor(sc.now.r))}</span><span class="s">${Math.abs(dw) >= 0.5 ? deltaHtml(dw, 1) : `${sc.t.w} actual`}</span></div>
    <div class="stat"><span class="k">League rank</span><span class="v">#${sc.rank}</span><span class="s">of 30 teams</span></div>`;
}
function labMatchupHtml() {
  const A = labScore(LAB.a); const B = labScore(LAB.b);
  const margin = ((A.now.r - B.now.r) * LEAGUE_PACE) / 100;
  const pA = phi(margin / 12.5);
  const same = LAB.a === LAB.b;
  return `<div class="ph"><div class="ph-l"><h2>Neutral-floor matchup</h2><span class="sub">Win odds for one game from the two ratings (margin spread of 12.5 points)</span></div></div>
    ${same ? '<div class="empty">Pick two different teams to see the matchup.</div>' : `<div class="matchup"><div class="side"><span class="pct">${Math.round(pA * 100)}%</span><span>${esc(A.t.full)}</span></div><div class="muted mono" style="font-size:12px">vs</div><div class="side r"><span class="pct">${Math.round((1 - pA) * 100)}%</span><span>${esc(B.t.full)}</span></div></div>
    <div class="probbar" style="margin-top:12px" role="img" aria-label="${A.t.abbr} ${Math.round(pA * 100)} percent, ${B.t.abbr} ${Math.round((1 - pA) * 100)} percent"><i style="width:${pA * 100}%;background:${A.t.c[0]}"></i><i style="flex:1;background:${B.t.c[0]}"></i></div>
    <p class="note" style="margin-top:10px">Expected margin: ${margin >= 0 ? A.t.abbr : B.t.abbr} by ${Math.abs(margin).toFixed(1)} points.</p>`}`;
}
function drawLeagueStrip(el, w) {
  const H = 96; const m = { l: 16, r: 16 };
  const A = labScore(LAB.a); const B = labScore(LAB.b);
  const vals = [...TEAM_BASE.map((b) => b.r), A.now.r, B.now.r];
  const x = d3.scaleLinear().domain([Math.min(-10, ...vals) - 0.5, Math.max(10, ...vals) + 0.5]).range([m.l, w - m.r]);
  const yb = 58;
  let s = `<svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="Where the two lab teams land among all 30 teams">`;
  for (const t of x.ticks(8)) s += `<line class="${t === 0 ? 'zero' : 'grid-l'}" x1="${x(t)}" x2="${x(t)}" y1="${yb - 20}" y2="${yb + 12}"/><text class="axis-t" x="${x(t)}" y="${H - 4}" text-anchor="middle">${t > 0 ? '+' : ''}${fx(t, 0)}</text>`;
  for (const b of TEAM_BASE) {
    if (b.t.abbr === LAB.a || b.t.abbr === LAB.b) continue;
    s += `<circle class="f-line" cx="${x(b.r)}" cy="${yb}" r="4"><title>${esc(b.t.full)} ${sgn(b.r)}</title></circle>`;
  }
  const mark = (sc, up) => {
    const x0 = x(sc.base.r); const x1 = x(sc.now.r); const yy = up ? yb - 16 : yb + 0;
    let g = '';
    if (Math.abs(x1 - x0) > 2) g += `<line x1="${x0}" x2="${x1}" y1="${yb}" y2="${yb}" style="stroke:var(--maple);stroke-width:2"/><circle cx="${x0}" cy="${yb}" r="4" style="fill:var(--surface);stroke:var(--maple);stroke-width:1.5"/>`;
    g += `<circle cx="${x1}" cy="${yb}" r="6.5" style="fill:${sc.t.c[0]};stroke:var(--surface);stroke-width:2"/><text class="lbl-t" x="${x1}" y="${up ? yb - 14 : yb + 26}" text-anchor="middle">${sc.t.abbr} ${sgn(sc.now.r)}</text>`;
    return g;
  };
  s += mark(A, true) + (LAB.a !== LAB.b ? mark(B, false) : '');
  s += '</svg>';
  el.innerHTML = s;
}
function labRefreshNumbers() {
  for (const side of ['a', 'b']) {
    const abbr = LAB[side]; const sc = labScore(abbr); const roster = labRoster(abbr);
    const tot = sum(roster, (r) => r.min);
    const box = $(`[data-score="${side}"]`); if (box) box.innerHTML = labScoreHtml(sc);
    const mt = $(`[data-mintot="${side}"]`); if (mt) mt.textContent = tot.toFixed(0);
    const mm = $(`[data-minmeter="${side}"]`); if (mm) { mm.style.width = `${clamp(tot / 240, 0, 1) * 100}%`; mm.style.background = Math.abs(tot - 240) > 1 ? 'var(--down)' : ''; }
    const sl = $(`[data-sal="${side}"]`); if (sl) sl.textContent = money(sc.sal);
    for (const r of roster) {
      const v = $(`[data-minv="${side}:${r.id}"]`); if (v) v.textContent = r.min.toFixed(1);
      const inp = $(`[data-min="${side}:${r.id}"]`); if (inp && document.activeElement !== inp) inp.value = r.min;
    }
  }
  const mu = $('#labMatchup'); if (mu) mu.innerHTML = labMatchupHtml();
  const ls = $('#labStrip'); if (ls) drawLeagueStrip(ls, Math.floor(ls.clientWidth));
}
const LAB_SCENARIOS = [
  { label: 'Giannis to the Knicks', a: 'NYK', b: 'MIL', moves: [['a', 'Giannis Antetokounmpo']] },
  { label: 'Swap Luka and Jokic', a: 'LAL', b: 'DEN', moves: [['b', 'Luka Doncic'], ['a', 'Nikola Jokic']] },
  { label: 'Wembanyama to Detroit', a: 'DET', b: 'SAS', moves: [['a', 'Victor Wembanyama']] },
];
function labScenario(i) {
  const sc = LAB_SCENARIOS[i];
  LAB.a = sc.a; LAB.b = sc.b; delete LAB.rosters[sc.a]; delete LAB.rosters[sc.b];
  for (const [side, name] of sc.moves) {
    const c = CUR.find((x) => x.name === name);
    if (c) labAdd(LAB[side], c.id);
  }
  labSave();
  render({ keepScroll: true });
}
function labTrade(playerId, toAbbr) {
  const c = CUR_BY_ID.get(playerId);
  if (!c) return;
  const from = c.team ? c.team.abbr : LAB.b;
  LAB.a = toAbbr; LAB.b = from === toAbbr ? LAB.b : from;
  labAdd(LAB.a, playerId);
  labSave();
}

VIEWS.lab = {
  title: () => 'Roster Lab',
  html(r) {
    if (r.abbr && TEAM_BY_ABBR.has(r.abbr) && LAB.a !== r.abbr && LAB.b !== r.abbr) { LAB.a = r.abbr; labSave(); }
    return `
    <section class="page-head"><div class="t">
      <span class="eyebrow">New · offseason sandbox</span>
      <h1 class="display">Roster Lab</h1>
      <p class="lede">Start from each team's late-season rotation, then sign, trade and re-slot minutes. Ratings are current DARKO DPM weighted by minutes; wins come from a straight-line fit of these ratings to 2025-26 records (r = ${WFIT.r.toFixed(2)}, about ${WFIT.b.toFixed(1)} wins per point).</p>
    </div><div class="controls"><span class="eyebrow">Try a what-if</span>${LAB_SCENARIOS.map((s, i) => `<button class="btn sm" type="button" data-scn="${i}">${esc(s.label)}</button>`).join('')}</div></section>
    <div class="lab">${labSideHtml('a')}${labSideHtml('b')}</div>
    <div class="grid" style="margin-top:16px">
      <section class="panel c5" id="labMatchup">${labMatchupHtml()}</section>
      <section class="panel c7"><div class="ph"><div class="ph-l"><h2>Across the league</h2><span class="sub">Grey dots are the other 28 teams as they finished. Maple shows how far your moves shifted each lab team.</span></div>
        <label class="check"><input type="checkbox" id="labAuto"${LAB.auto ? ' checked' : ''}> Keep minutes at 240</label></div><div class="chart" id="labStrip"></div></section>
    </div>`;
  },
  mount() {
    chart($('#labStrip'), drawLeagueStrip);
    $$('[data-scn]').forEach((b) => b.addEventListener('click', () => labScenario(Number(b.dataset.scn))));
    $$('[data-sel]').forEach((s) => s.addEventListener('change', () => { LAB[s.dataset.sel] = s.value; labSave(); render({ keepScroll: true }); }));
    $$('[data-reset]').forEach((b) => b.addEventListener('click', () => { delete LAB.rosters[LAB[b.dataset.reset]]; labSave(); render({ keepScroll: true }); }));
    $('#labAuto').addEventListener('change', (e) => { LAB.auto = e.target.checked; labSave(); });
    $$('input[data-min]').forEach((inp) => inp.addEventListener('input', () => {
      const [side, id] = inp.dataset.min.split(':');
      const roster = labEdit(LAB[side]);
      const row = roster.find((r) => r.id === Number(id));
      row.min = Number(inp.value);
      if (LAB.auto) rebalance(roster, row.id);
      labSave(); labRefreshNumbers();
    }));
    $$('[data-move]').forEach((b) => b.addEventListener('click', () => {
      const [side, id] = b.dataset.move.split(':');
      const to = LAB[side === 'a' ? 'b' : 'a'];
      if (to === LAB[side]) return;
      labAdd(to, Number(id)); render({ keepScroll: true });
    }));
    $$('[data-rm]').forEach((b) => b.addEventListener('click', () => { const [side, id] = b.dataset.rm.split(':'); labRemove(LAB[side], Number(id)); render({ keepScroll: true }); }));
    $$('[data-add]').forEach((inp) => {
      const side = inp.dataset.add; const box = $(`[data-sug="${side}"]`);
      let items = []; let sel = 0;
      const paint = () => {
        box.innerHTML = items.map((c, i) => `<button type="button" role="option" aria-selected="${i === sel}" data-pick="${c.id}"><b>${esc(c.name)}</b>${teamChip(c.tm, false)}<span class="r">${sgn(c.dpm)}</span></button>`).join('');
        box.hidden = !items.length;
        $$('[data-pick]', box).forEach((b) => b.addEventListener('mousedown', (ev) => { ev.preventDefault(); pick(Number(b.dataset.pick)); }));
      };
      const pick = (id) => { labAdd(LAB[side], id); render({ keepScroll: true }); };
      inp.addEventListener('input', () => {
        const q = norm(inp.value);
        const have = new Set(labRoster(LAB[side]).map((r) => r.id));
        items = q.length < 2 ? [] : CUR.filter((c) => !have.has(c.id) && norm(c.name).includes(q)).slice(0, 8);
        sel = 0; paint();
      });
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); paint(); ev.preventDefault(); }
        else if (ev.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); paint(); ev.preventDefault(); }
        else if (ev.key === 'Enter' && items[sel]) { pick(items[sel].id); ev.preventDefault(); }
        else if (ev.key === 'Escape') { items = []; paint(); }
      });
      inp.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 150));
    });
  },
};
