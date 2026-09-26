/* ---------- Players: the leaderboard, readable at any date ---------- */
const PL = Object.assign({ q: '', pos: 'all', team: 'all', age: 'all', sort: 'dpm', dir: -1, starred: false }, store.get('pl', {}));
let plLimit = 50;
function plMode() { return isLatest() ? 'latest' : inCurrentSeason() ? 'past' : 'hist'; }
function plRows() {
  const mode = plMode();
  let rows;
  if (mode === 'latest') {
    rows = CUR.map((c) => ({ id: c.id, c, tm: c.tm, dpm: c.dpm, o: c.o, d: c.d, box: c.box, onoff: c.onoff, age: c.age, xmin: c.xmin, fair: c.fair, sal: c.sal, surplus: c.surplus, pg: c.pg }));
  } else if (mode === 'past') {
    const di = asOfDi(); rows = [];
    for (const c of CUR) {
      const v = valAt(c.id, di); if (!v) continue;
      rows.push({ id: c.id, c, tm: v.tm >= 0 ? v.tm : c.tm, dpm: v.dpm, o: v.o, d: v.d, now: c.dpm, chg: c.dpm - v.dpm, age: c.age - daysBetween(DAYS[di], LATEST) / 365.25, pg: c.pg, di });
    }
  } else {
    const s = seasonOfDate(STATE.asOf);
    rows = (SE_BY_SEASON.get(s) || []).map((r) => ({ id: r.id, tm: r.tm, dpm: r.dpm, o: r.o, d: r.dpm - r.o, box: r.box, age: r.age, gp: r.gp, mpg: r.gp ? r.min / r.gp : 0, pg: posGroup(P.pos(r.id)) }));
  }
  rows.sort((a, b) => b.dpm - a.dpm);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}
function plFilter(rows) {
  const q = norm(PL.q);
  return rows.filter((r) => {
    if (q && !norm(P.name(r.id)).includes(q)) return false;
    if (PL.pos !== 'all' && r.pg !== PL.pos) return false;
    if (PL.team !== 'all' && TEAMS[r.tm] && TEAMS[r.tm].abbr !== PL.team) return false;
    if (PL.team !== 'all' && !TEAMS[r.tm]) return false;
    if (PL.age === 'u24' && !(r.age < 24)) return false;
    if (PL.age === '24-29' && !(r.age >= 24 && r.age < 30)) return false;
    if (PL.age === '30+' && !(r.age >= 30)) return false;
    if (PL.starred && !STATE.watch.has(r.id)) return false;
    return true;
  });
}
const PL_COLS = {
  latest: [
    ['dpm', 'DPM'], ['o', 'Off'], ['d', 'Def'], [null, 'Split'], [null, 'Season'], ['box', 'Box'], ['onoff', 'On/Off'], ['age', 'Age'], ['xmin', 'MPG'], ['fair', '$ Value'], ['sal', 'Salary'], ['surplus', 'Surplus'],
  ],
  past: [['dpm', 'DPM'], ['o', 'Off'], ['d', 'Def'], [null, 'Split'], [null, 'To date'], ['now', 'Now'], ['chg', 'Since']],
  hist: [['dpm', 'DPM'], ['o', 'Off'], ['d', 'Def'], [null, 'Split'], ['box', 'Box'], ['age', 'Age'], ['gp', 'Games'], ['mpg', 'MPG']],
};
function plCell(mode, key, label, r) {
  switch (label) {
    case 'DPM': return `<td class="dpm">${sgn(r.dpm)}</td>`;
    case 'Off': return `<td>${sgn(r.o)}</td>`;
    case 'Def': return `<td>${sgn(r.d)}</td>`;
    case 'Split': return `<td class="c">${oxBar(r.o, r.d, { w: 84, max: 5.5 })}</td>`;
    case 'Season': return `<td class="c">${spark(seriesUpTo(r.id, LAST_DI), { w: 84, h: 22 })}</td>`;
    case 'To date': return `<td class="c">${spark(seriesUpTo(r.id, r.di), { w: 84, h: 22 })}</td>`;
    case 'Box': return `<td>${sgn(r.box)}</td>`;
    case 'On/Off': return `<td>${sgn(r.onoff)}</td>`;
    case 'Age': return `<td>${r.age.toFixed(1)}</td>`;
    case 'MPG': return `<td>${fx(mode === 'hist' ? r.mpg : Math.max(0, r.xmin), 1)}</td>`;
    case '$ Value': return `<td>${money(r.fair)}</td>`;
    case 'Salary': return `<td class="muted">${money(r.sal)}</td>`;
    case 'Surplus': return `<td>${r.surplus == null ? '—' : `<span class="${r.surplus >= 0 ? 'up' : 'down'}">${money(r.surplus, true)}</span>`}</td>`;
    case 'Now': return `<td>${sgn(r.now)}</td>`;
    case 'Since': return `<td>${deltaHtml(r.chg)}</td>`;
    case 'Games': return `<td>${r.gp}</td>`;
    default: return '<td></td>';
  }
}
function renderPlTable() {
  const mode = plMode();
  const all = plRows();
  let rows = plFilter(all);
  const k = PL.sort; const dir = PL.dir;
  if (k === 'name') rows = rows.slice().sort((a, b) => P.name(a.id).localeCompare(P.name(b.id)) * dir);
  else if (k && rows.length && rows[0][k] !== undefined) rows = rows.slice().sort((a, b) => ((a[k] ?? -1e9) - (b[k] ?? -1e9)) * dir || b.dpm - a.dpm);
  const cols = PL_COLS[mode];
  const head = `<tr><th class="c"><span class="sr-only">Watch</span></th><th class="l">#</th><th class="l"><button class="sort" type="button" data-sort="name">Player</button></th><th class="l">Team</th>${cols.map(([key, label]) => (key ? `<th${PL.sort === key ? ` aria-sort="${PL.dir < 0 ? 'descending' : 'ascending'}"` : ''}><button class="sort" type="button" data-sort="${key}">${label}</button></th>` : `<th class="c">${label}</th>`)).join('')}</tr>`;
  const body = rows.slice(0, plLimit).map((r) => `<tr class="clickrow${STATE.watch.has(r.id) ? ' me' : ''}" data-href="#p${r.id}"><td class="c">${starBtn(r.id)}</td><td class="rk l">${r.rank}</td><td class="l">${plink(r.id)}<span class="pos">${esc(P.pos(r.id))}</span></td><td class="l">${teamChip(r.tm)}</td>${cols.map(([key, label]) => plCell(mode, key, label, r)).join('')}</tr>`).join('');
  const el = document.getElementById('plTable');
  el.innerHTML = `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">DARKO player ratings</caption><thead>${head}</thead><tbody>${body || `<tr><td colspan="${cols.length + 4}" class="c muted">No players match these filters.</td></tr>`}</tbody></table></div>
    <div class="row" style="justify-content:space-between;margin-top:12px"><span class="note">${rows.length ? `Showing ${Math.min(plLimit, rows.length)} of ${rows.length} players` : ''}${mode === 'hist' ? ' · season-end ratings; games and minutes include playoffs' : ''}</span>${rows.length > plLimit ? '<button class="btn" type="button" id="plMore">Show 50 more</button>' : ''}</div>`;
  $$('button.sort', el).forEach((b) => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const key = b.dataset.sort;
    if (PL.sort === key) PL.dir = -PL.dir; else { PL.sort = key; PL.dir = key === 'age' || key === 'name' ? 1 : -1; }
    store.set('pl', PL); renderPlTable();
  }));
  const more = document.getElementById('plMore');
  if (more) more.addEventListener('click', () => { plLimit += 50; renderPlTable(); });
  drawDistribution(all, new Set(rows.map((r) => r.id)));
}
function drawDistribution(all, keep) {
  const el = document.getElementById('plDist');
  if (!el) return;
  const draw = (node, w) => {
    const h = 64; const m = { l: 10, r: 10 };
    const x = d3.scaleLinear().domain([-6, 8]).range([m.l, w - m.r]);
    const bins = new Map();
    let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Distribution of DPM across all players; filtered players highlighted">`;
    for (let t = -6; t <= 8; t += 2) s += `<line class="${t === 0 ? 'zero' : 'grid-l'}" x1="${x(t)}" x2="${x(t)}" y1="4" y2="${h - 16}"/><text class="axis-t" x="${x(t)}" y="${h - 3}" text-anchor="middle">${t > 0 ? '+' : ''}${fx(t, 0)}</text>`;
    const sorted = all.slice().sort((a, b) => (keep.has(a.id) ? 1 : 0) - (keep.has(b.id) ? 1 : 0));
    for (const r of sorted) {
      const b = Math.round(x(clamp(r.dpm, -6, 8)) / 4);
      const k = bins.get(b) || 0; bins.set(b, k + 1);
    }
    const cnt = new Map();
    for (const r of sorted) {
      const b = Math.round(x(clamp(r.dpm, -6, 8)) / 4);
      const k = cnt.get(b) || 0; cnt.set(b, k + 1);
      const cy = h - 20 - k * 4.2;
      if (cy < 3) continue;
      s += `<circle class="${keep.has(r.id) ? 'f-ink' : 'f-line'}" cx="${(b * 4).toFixed(1)}" cy="${cy.toFixed(1)}" r="1.7"><title>${esc(P.name(r.id))} ${sgn(r.dpm)}</title></circle>`;
    }
    s += '</svg>';
    node.innerHTML = s;
  };
  CHARTS = CHARTS.filter((c) => c.el !== el);
  chart(el, draw);
  draw(el, Math.floor(el.clientWidth));
}
VIEWS.players = {
  title: () => 'Players',
  dated: true,
  html() {
    const mode = plMode();
    const s = seasonOfDate(STATE.asOf);
    const lede = mode === 'latest' ? `Every active player's DARKO Daily Plus-Minus: points per 100 possessions above an average player, split into offense ${gO} and defense ${gX}. Updated nightly; this snapshot is from ${dateStr(LATEST)}.`
      : mode === 'past' ? `Ratings as they stood on ${dateStr(STATE.asOf)}, with each player's change since. Drag the time machine to move the date.`
        : `Season-end ratings for ${seasonLabel(s)}. Daily detail for every player covers the current season; Rewind has weekly top 20s back to 1996-97.`;
    const teams = TEAMS.map((t) => `<option value="${t.abbr}"${PL.team === t.abbr ? ' selected' : ''}>${t.abbr} · ${esc(t.name)}</option>`).join('');
    return `
    <section class="page-head"><div class="t">
      <span class="eyebrow">${mode === 'hist' ? `${seasonLabel(s)} · season end` : `2025-26 · ${esc(dateStr(STATE.asOf))}`}</span>
      <h1 class="display">Players</h1>
      <p class="lede">${lede}</p>
    </div></section>
    <div class="rewound-banner">Viewing ${esc(dateStr(STATE.asOf))}. <button class="linkbtn" type="button" data-latest>Back to latest</button></div>
    <section class="panel" style="margin-top:16px">
      <div class="fx-controls" role="search">
        <label class="field" style="flex:1;min-width:180px"><span>Search</span><input class="input" id="plQ" type="search" placeholder="Player name" value="${esc(PL.q)}" autocomplete="off"></label>
        <label class="field"><span>Position</span><select class="select" id="plPos">${[['all', 'All'], ['G', 'Guards'], ['F', 'Forwards'], ['C', 'Centers']].map(([v, l]) => `<option value="${v}"${PL.pos === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Team</span><select class="select" id="plTeam"><option value="all">All teams</option>${teams}</select></label>
        <label class="field"><span>Age</span><select class="select" id="plAge">${[['all', 'Any'], ['u24', 'Under 24'], ['24-29', '24–29'], ['30+', '30 and up']].map(([v, l]) => `<option value="${v}"${PL.age === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="check" style="height:34px"><input type="checkbox" id="plStar"${PL.starred ? ' checked' : ''}> Watchlist only</label>
      </div>
      <div class="chart" id="plDist" style="margin-bottom:8px"></div>
      <div id="plTable"></div>
    </section>`;
  },
  mount() {
    const upd = () => { plLimit = 50; store.set('pl', PL); renderPlTable(); };
    $('#plQ').addEventListener('input', debounce((e) => { PL.q = e.target.value; upd(); }, 120));
    $('#plPos').addEventListener('change', (e) => { PL.pos = e.target.value; upd(); });
    $('#plTeam').addEventListener('change', (e) => { PL.team = e.target.value; upd(); });
    $('#plAge').addEventListener('change', (e) => { PL.age = e.target.value; upd(); });
    $('#plStar').addEventListener('change', (e) => { PL.starred = e.target.checked; upd(); });
    renderPlTable();
  },
};
