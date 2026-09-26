/* ---------- Ask DARKO: a command bar that understands basketball questions ---------- */
const ASK = { sel: 0, opts: [] };
const ASK_PLAYERS = (() => {
  const out = CUR.map((c) => ({ id: c.id, n: norm(c.name), cur: true, score: c.dpm }));
  for (const k of Object.keys(PM)) {
    const id = Number(k);
    if (CUR_BY_ID.has(id) || !SE_BY_ID.has(id)) continue;
    const rows = SE_BY_ID.get(id);
    out.push({ id, n: norm(P.name(id)), cur: false, score: Math.max(...rows.map((r) => r.dpm)) - 2 });
  }
  return out;
})();
const TEAM_ALIAS = { sixers: 'PHI', blazers: 'POR', wolves: 'MIN', twolves: 'MIN', cavs: 'CLE', mavs: 'DAL', dubs: 'GSW', niners: 'PHI', 'la lakers': 'LAL', 'la clippers': 'LAC', clips: 'LAC', pels: 'NOP', grizz: 'MEM', 'new york': 'NYK', 'golden state': 'GSW', 'san antonio': 'SAS', 'oklahoma city': 'OKC', 'new orleans': 'NOP' };
const TEAM_STOP = new Set(['was', 'min', 'den', 'ind', 'hou', 'mem', 'sac', 'cha', 'chi', 'mil', 'por', 'det']);
function teamExact(qn, raw = '') {
  const q = qn.replace(/^the /, '');
  if (TEAM_ALIAS[q]) return TEAM_BY_ABBR.get(TEAM_ALIAS[q]);
  for (const t of TEAMS) {
    if (q === t.abbr.toLowerCase() && (!TEAM_STOP.has(q) || raw.includes(t.abbr))) return t;
    if (q === norm(t.name) || q === norm(t.full) || (q === norm(t.city) && t.city !== 'Los Angeles')) return t;
  }
  return null;
}
function findTeam(q, raw) {
  const qn = norm(q).replace(/^the /, '');
  const t = teamExact(qn, raw || q);
  if (t) return t;
  if (qn.length >= 4) return TEAMS.find((x) => norm(x.name).startsWith(qn) || norm(x.city).startsWith(qn)) || null;
  return null;
}
function findPlayers(q, n = 6, curOnly = false) {
  const qn = norm(q);
  if (qn.length < 2) return [];
  const res = [];
  for (const p of ASK_PLAYERS) {
    if (curOnly && !p.cur) continue;
    let s;
    if (p.n === qn) s = 100; else if (p.n.startsWith(qn)) s = 80; else if (p.n.split(' ').some((w) => w.startsWith(qn))) s = 65; else if (p.n.includes(qn)) s = 40; else continue;
    res.push({ p, s: s + (p.cur ? 10 : 0) + p.score * 0.6 });
  }
  return res.sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.p);
}
const findPlayer = (q, curOnly) => findPlayers(q, 1, curOnly)[0] || null;
function seasonChange(id) { const h = hist(id); return h.length ? (h[h.length - 1][1] - h[0][1]) / 100 : 0; }
const ASK_SORTS = [
  [/\b(defen[cs]e|defenders?|defensive|stoppers?)\b/, 'd', 'defense', (c) => c.d, (v) => sgn(v)],
  [/\b(offen[cs]e|offensive)\b/, 'o', 'offense', (c) => c.o, (v) => sgn(v)],
  [/\b(scorers?|scoring|points)\b/, 'pts', 'points per 100', (c) => c.pts, (v) => v.toFixed(1)],
  [/\b(shooters?|shooting|snipers?|threes?|3pt|3-point|3 point)\b/, 'fg3p', '3-point accuracy (4+ attempts per 100)', (c) => c.fg3p, (v) => pct(v)],
  [/\b(passers?|passing|playmakers?|playmaking|assists?)\b/, 'ast', 'assists per 100', (c) => c.ast, (v) => v.toFixed(1)],
  [/\b(rebounders?|rebounding|boards|rebounds)\b/, 'reb', 'rebounds per 100', (c) => c.reb, (v) => v.toFixed(1)],
  [/\b(rim protectors?|shot blockers?|blocks?|blockers?)\b/, 'blk', 'blocks per 100', (c) => c.blk, (v) => v.toFixed(1)],
  [/\b(steals?|thieves|pickpockets?)\b/, 'stl', 'steals per 100', (c) => c.stl, (v) => v.toFixed(1)],
  [/\b(overpaid|worst contracts?)\b/, 'over', 'surplus value, lowest first', (c) => -(c.surplus ?? 0), (v) => money(-v, true)],
  [/\b(bargains?|underpaid|best contracts?|surplus|value)\b/, 'surplus', 'surplus value', (c) => c.surplus ?? -1e9, (v) => money(v, true)],
  [/\b(efficient|efficiency|true shooting)\b/, 'ts', 'true shooting', (c) => c.ts, (v) => pct(v)],
  [/\b(fallers?|sliders?|declin\w*)\b/, 'fall', 'drop since opening night', (c) => -seasonChange(c.id), (v) => sgn(-v, 2)],
  [/\b(risers?|climbers?|breakouts?|improved|improvers?)\b/, 'rise', 'change since opening night', (c) => seasonChange(c.id), (v) => sgn(v, 2)],
];
function parseStructured(qn, raw) {
  const f = { n: 10, pos: null, maxAge: null, minAge: null, team: null, rookies: false, sort: null, hit: false };
  let m;
  if ((m = qn.match(/\b(?:top|best) (\d{1,2})\b/)) || (m = qn.match(/\b(\d{1,2}) (?:best|top)\b/))) { f.n = clamp(Number(m[1]), 1, 25); f.hit = true; }
  if (/\b(best|top|who|which|most|leaders?|highest|lowest|worst|good|great)\b/.test(qn)) f.hit = true;
  if (/\b(guards?|pgs?|sgs?)\b/.test(qn)) { f.pos = 'G'; f.hit = true; }
  if (/\b(forwards?|wings?|sfs?|pfs?)\b/.test(qn)) { f.pos = 'F'; f.hit = true; }
  if (/\b(centers?|centres?|bigs?|big men)\b/.test(qn)) { f.pos = 'C'; f.hit = true; }
  if ((m = qn.match(/\b(?:under|younger than|below) (\d{2})\b/))) { f.maxAge = Number(m[1]); f.hit = true; }
  if ((m = qn.match(/\b(?:over|older than|above) (\d{2})\b/))) { f.minAge = Number(m[1]); f.hit = true; }
  if (/\byoung\b/.test(qn)) { f.maxAge = f.maxAge || 24; f.hit = true; }
  if (/\b(veterans?|vets)\b/.test(qn)) { f.minAge = f.minAge || 31; f.hit = true; }
  if (/\brookies?\b/.test(qn)) { f.rookies = true; f.hit = true; }
  for (const s of ASK_SORTS) if (s[0].test(qn)) { f.sort = s; f.hit = true; break; }
  const words = qn.split(' ');
  outer: for (let len = 3; len >= 1; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      const t = teamExact(words.slice(i, i + len).join(' '), raw);
      if (t) { f.team = t; break outer; }
    }
  }
  if (f.team && (f.hit || words.length > 1)) f.hit = true;
  return f;
}
function runStructured(f) {
  let rows = CUR.filter((c) => (f.team ? c.tm === f.team.i : c.gp >= 20));
  if (f.pos) rows = rows.filter((c) => c.pg === f.pos);
  if (f.maxAge) rows = rows.filter((c) => c.age < f.maxAge);
  if (f.minAge) rows = rows.filter((c) => c.age >= f.minAge);
  if (f.rookies) rows = rows.filter((c) => c.rookieYr === SEASON);
  const s = f.sort;
  if (s && s[1] === 'fg3p') rows = rows.filter((c) => c.fg3a >= 4);
  if (s && (s[1] === 'surplus' || s[1] === 'over')) rows = rows.filter((c) => c.surplus != null);
  const val = s ? s[3] : (c) => c.dpm;
  rows = rows.slice().sort((a, b) => val(b) - val(a)).slice(0, f.n);
  const bits = [];
  bits.push(f.rookies ? 'rookies' : f.pos ? { G: 'guards', F: 'forwards', C: 'centers' }[f.pos] : 'players');
  if (f.team) bits.push(`on the ${f.team.name}`);
  if (f.maxAge) bits.push(`under ${f.maxAge}`);
  if (f.minAge) bits.push(`${f.minAge} and older`);
  const title = `Top ${rows.length} ${bits.join(' ')} by ${s ? s[2] : 'DPM'}`;
  return { rows, title, val, fmt: s ? s[4] : (v) => sgn(v), key: s ? s[2] : 'DPM' };
}
function parseAskDate(txt) {
  const t = txt.trim();
  let m;
  if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/))) return snapIso(toDate(t));
  if ((m = t.match(/^(\d{4})-(\d{2})$/))) { const s = Number(m[1]) + 1; return META.reg[s] ? FRAMES[frameIndexFor(META.reg[s][1])] : null; }
  if ((m = t.match(/^(\d{4})$/))) { const y = Number(m[1]); const s = y; if (s === SEASON) return LATEST; return META.reg[s] ? FRAMES[frameIndexFor(META.reg[s][1])] : null; }
  if (/^(today|now|latest)$/.test(t)) return LATEST;
  return null;
}
const ASK_NAV = [
  [/^(today|daily|home|movers|the daily|front page)$/, 'Today · The Daily', '#today'],
  [/^(players?|leaderboard|dpm|rankings?)$/, 'Players leaderboard', '#players'],
  [/^(teams?|standings|team dna)$/, 'Teams', '#teams'],
  [/^(roster lab|lab|trade machine|trades?)$/, 'Roster Lab', '#lab'],
  [/^(fantasy|fantasy lab|draft)$/, 'Fantasy Lab', '#fantasy'],
  [/^(rewind|time machine|race|history)$/, 'Rewind', '#rewind'],
  [/^(darkodle|puzzle|game|wordle|daily game)$/, 'DARKOdle', '#darkodle'],
  [/^(card|cards|card studio)$/, 'Card Studio', '#card'],
  [/^(what'?s new|new|features|tour)$/, "What's new", '#new'],
];
const ASK_EXAMPLES = ['best defenders under 25', 'trade Giannis to the Knicks', 'Jokic vs Wembanyama', 'players like Cooper Flagg', 'rewind to 2016', 'OKC', 'rookies', 'overpaid', '3-point shooters', 'fantasy 9-cat', 'card for Chet Holmgren'];

function askGo(hash) { closeAsk(); if (location.hash === hash) render(); else location.hash = hash; }
function askInterpret(raw) {
  const qn = norm(raw);
  const out = { answers: [], players: [], teams: [], nav: [] };
  if (!qn) return out;
  let m;
  if ((m = qn.match(/^(?:trade|send|move|ship) (.+?) to (?:the )?(.+)$/))) {
    const p = findPlayer(m[1], true); const t = findTeam(m[2], raw);
    if (p && t) {
      const c = CUR_BY_ID.get(p.id);
      out.answers.push({
        html: `<h4>Trade ${esc(c.name)} to the ${esc(t.full)}</h4><p class="soft" style="font-size:13px">Opens Roster Lab with ${esc(c.team ? c.team.abbr : 'his team')} and ${t.abbr} side by side and the move made. Minutes rebalance to 240.</p>`,
        label: `Make the trade in Roster Lab`, run: () => { labTrade(p.id, t.abbr); askGo('#lab'); },
      });
    }
  }
  if ((m = qn.match(/^(?:compare )?(.+?) (?:vs\.?|versus|v\.?|or|against|and) (.+)$/)) && !out.answers.length) {
    const a = findPlayer(m[1], true); const b = findPlayer(m[2], true);
    if (a && b && a.id !== b.id) {
      const A = CUR_BY_ID.get(a.id); const B = CUR_BY_ID.get(b.id);
      const row = (k, fa, fb, better) => `<tr><td class="l muted">${k}</td><td${better === 1 ? ' style="font-weight:800"' : ''}>${fa}</td><td${better === 2 ? ' style="font-weight:800"' : ''}>${fb}</td></tr>`;
      const bt = (x, y) => (x > y ? 1 : y > x ? 2 : 0);
      out.answers.push({
        html: `<h4>${esc(A.name)} vs ${esc(B.name)}</h4><table class="tbl compact"><thead><tr><th class="l"></th><th>${esc(lastName(A.id))}</th><th>${esc(lastName(B.id))}</th></tr></thead><tbody>
          ${row('DPM', sgn(A.dpm), sgn(B.dpm), bt(A.dpm, B.dpm))}${row('Offense', sgn(A.o), sgn(B.o), bt(A.o, B.o))}${row('Defense', sgn(A.d), sgn(B.d), bt(A.d, B.d))}${row('Rank', `#${A.rank}`, `#${B.rank}`, bt(-A.rank, -B.rank))}${row('Age', A.age.toFixed(1), B.age.toFixed(1), 0)}${row('Surplus', money(A.surplus, true), money(B.surplus, true), bt(A.surplus ?? -1e9, B.surplus ?? -1e9))}</tbody></table>`,
        label: `Overlay their seasons in the Seismograph`, run: () => askGo(`#p${A.id}-vs-${B.id}`),
      });
    }
  }
  if ((m = qn.match(/^(?:players? |guys? |who (?:is|plays) )?(?:like|similar to|comparable to|comps? (?:for|of|to)?) ?(.+)$/)) || (m = qn.match(/^(.+?) comps?$/))) {
    const p = findPlayer(m[1], true);
    if (p) {
      const cc = COMPS[p.id];
      out.answers.push({
        html: `<h4>Historical comps for ${esc(P.name(p.id))}</h4>${cc ? simpleTable(['Comp', 'Season', 'Match'], cc.c.slice(0, 5).map((x) => [esc(P.name(x[0])), seasonLabel(x[1]), x[4]]), [0, 1]) : '<p class="muted">No comps.</p>'}`,
        label: 'Open comps & futures', run: () => askGo(`#p${p.id}-comps`),
      });
    }
  }
  if ((m = qn.match(/^(?:rewind|go back|back|time machine|jump|go)(?: to)? (.+)$/)) || (m = qn.match(/^((?:19|20)\d\d(?:-\d\d)?(?:-\d\d)?)$/))) {
    const iso = parseAskDate(m[1]);
    if (iso) out.answers.push({ html: `<h4>Rewind to ${esc(dateStr(iso))}</h4><p class="soft" style="font-size:13px">${seasonLabel(seasonOfDate(iso))}. The whole site follows the date you pick.</p>`, label: 'Open Rewind at that week', run: () => { setAsOf(iso); askGo('#rewind'); } });
  }
  if ((m = qn.match(/^(?:make a )?card(?: for)? (.+)$/))) {
    const p = findPlayer(m[1], true);
    if (p) out.answers.push({ html: `<h4>Card for ${esc(P.name(p.id))}</h4>`, label: 'Open Card Studio', run: () => askGo(`#card-${p.id}`) });
  }
  if ((m = qn.match(/^(?:lineups?|rotation|team dna|payroll)(?: for)? (.+)$/))) {
    const t = findTeam(m[1], raw);
    if (t) out.answers.push({ html: `<h4>${esc(t.full)}: Team DNA</h4><p class="soft" style="font-size:13px">Rating by player, best lineups and payroll against DARKO value.</p>`, label: `Open ${t.abbr}`, run: () => askGo(`#t-${t.abbr}`) });
  }
  if (/\b(fantasy|9[ -]?cat|draftkings|yahoo|espn)\b/.test(qn)) {
    const preset = /9[ -]?cat/.test(qn) ? 'cat9' : /draftkings|\bdk\b/.test(qn) ? 'dk' : /yahoo/.test(qn) ? 'yahoo' : /espn/.test(qn) ? 'espn' : FX.preset;
    out.answers.push({ html: `<h4>Fantasy Lab · ${esc(FX_PRESETS[preset].label)}</h4>`, label: 'Open Fantasy Lab', run: () => { FX.preset = preset; fxSave(); askGo('#fantasy'); } });
  }
  if (!out.answers.length) {
    const f = parseStructured(qn, raw);
    const onlyTeam = f.team && !f.sort && !f.pos && !f.maxAge && !f.minAge && !f.rookies && qn.split(' ').length <= 3 && !/\b(best|top|who|which|most)\b/.test(qn);
    if (f.hit && !onlyTeam) {
      const r = runStructured(f);
      if (r.rows.length) {
        out.answers.push({
          html: `<h4>${esc(r.title)}</h4>${f.sort
            ? simpleTable(['#', 'Player', 'Team', 'Age', r.key.split(' (')[0], 'DPM'], r.rows.map((c, i) => [i + 1, plink(c.id), teamChip(c.tm, false), Math.floor(c.age), `<b>${r.fmt(r.val(c))}</b>`, sgn(c.dpm)]), [0, 1, 2])
            : simpleTable(['#', 'Player', 'Team', 'Age', 'DPM', 'Off / Def'], r.rows.map((c, i) => [i + 1, plink(c.id), teamChip(c.tm, false), Math.floor(c.age), `<b>${sgn(c.dpm)}</b>`, oxPair(c.o, c.d)]), [0, 1, 2])}`,
          label: `Open ${esc(r.rows[0].name)}`, run: () => askGo(`#p${r.rows[0].id}`),
        });
      }
    }
  }
  for (const [re, label, hash] of ASK_NAV) if (re.test(qn)) out.nav.push({ label, hash });
  const t = findTeam(qn, raw);
  if (t) out.teams.push(t);
  out.players = findPlayers(raw, 6);
  return out;
}
function renderAsk() {
  const raw = $('#askIn').value;
  ASK.lastQ = raw;
  const r = askInterpret(raw);
  const res = $('#askRes');
  let html = '';
  const opt = (inner, meta, attrs) => `<button type="button" class="opt" ${attrs}>${inner}<span class="meta">${meta || ''}</span></button>`;
  ASK.run = [];
  const add = (fn) => { ASK.run.push(fn); return `data-ai="${ASK.run.length - 1}"`; };
  if (!raw.trim()) {
    html += '<div class="grp">Try asking</div><div class="examples">' + ASK_EXAMPLES.map((e) => `<button type="button" class="ex" data-ex="${esc(e)}">${esc(e)}</button>`).join('') + '</div>';
    html += '<div class="grp">Go to</div>' + ASK_NAV.map(([, label, hash]) => opt(`<span class="ic">→</span>${esc(label)}`, '', add(() => askGo(hash)))).join('');
  } else {
    for (const a of r.answers) html += `<div class="answer">${a.html}${opt(`<span class="ic">↵</span><b>${esc(a.label)}</b>`, '', add(a.run))}</div>`;
    if (r.teams.length) html += '<div class="grp">Teams</div>' + r.teams.map((t) => opt(`<span class="ic" style="background:${t.c[0]};color:#fff">${t.abbr.slice(0, 1)}</span>${esc(t.full)}`, `${TEAM_BASE[t.i].rank ? `#${TEAM_BASE[t.i].rank} · ` : ''}${sgn(TEAM_BASE[t.i].r)}`, add(() => askGo(`#t-${t.abbr}`)))).join('');
    if (r.players.length) html += '<div class="grp">Players</div>' + r.players.map((p) => { const c = CUR_BY_ID.get(p.id); const rows = SE_BY_ID.get(p.id) || []; return opt(`<span class="ic">${c ? '●' : '○'}</span>${esc(P.name(p.id))}`, c ? `${c.team ? c.team.abbr : 'FA'} · ${sgn(c.dpm)}` : `${rows.length ? `${seasonLabel(rows[0].season)} to ${seasonLabel(rows[rows.length - 1].season)}` : ''}`, add(() => askGo(`#p${p.id}`))); }).join('');
    if (r.nav.length) html += '<div class="grp">Go to</div>' + r.nav.map((n) => opt(`<span class="ic">→</span>${esc(n.label)}`, '', add(() => askGo(n.hash)))).join('');
    if (!html) html = `<div class="empty" style="margin:8px">No match for “${esc(raw)}”. Try a player, a team, or a question like “best rim protectors”.</div>`;
  }
  res.innerHTML = html;
  ASK.opts = $$('.opt', res); ASK.sel = 0; askPaintSel();
  ASK.opts.forEach((b) => b.addEventListener('click', () => ASK.run[Number(b.dataset.ai)]()));
  $$('[data-ex]', res).forEach((b) => b.addEventListener('click', () => { $('#askIn').value = b.dataset.ex; renderAsk(); $('#askIn').focus(); }));
  $$('a', res).forEach((a) => a.addEventListener('click', () => closeAsk()));
}
function askPaintSel() {
  ASK.opts.forEach((o, i) => { o.setAttribute('aria-selected', String(i === ASK.sel)); o.id = `askopt-${i}`; });
  const cur = ASK.opts[ASK.sel];
  $('#askIn').setAttribute('aria-activedescendant', cur ? cur.id : '');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}
function openAsk(prefill = '') {
  const el = $('#ask'); el.classList.add('on');
  const inp = $('#askIn'); inp.value = prefill; renderAsk();
  setTimeout(() => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }, 10);
}
function closeAsk() { $('#ask').classList.remove('on'); }
function initAsk() {
  const inp = $('#askIn');
  inp.addEventListener('input', debounce(renderAsk, 60));
  inp.addEventListener('keyup', debounce(() => { if (inp.value !== ASK.lastQ) renderAsk(); }, 80));
  inp.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown') { ASK.sel = Math.min(ASK.sel + 1, ASK.opts.length - 1); askPaintSel(); ev.preventDefault(); }
    else if (ev.key === 'ArrowUp') { ASK.sel = Math.max(ASK.sel - 1, 0); askPaintSel(); ev.preventDefault(); }
    else if (ev.key === 'Enter') { if (inp.value !== ASK.lastQ) renderAsk(); const o = ASK.opts[ASK.sel]; if (o) ASK.run[Number(o.dataset.ai)](); ev.preventDefault(); }
    else if (ev.key === 'Escape') { closeAsk(); ev.preventDefault(); }
  });
  $('#ask .scrim').addEventListener('click', closeAsk);
  $('#askOpen').addEventListener('click', () => openAsk());
  document.addEventListener('keydown', (ev) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); if ($('#ask').classList.contains('on')) closeAsk(); else openAsk(); }
    else if (ev.key === '/' && !typing) { ev.preventDefault(); openAsk(); }
    else if (ev.key === 'Escape' && $('#ask').classList.contains('on')) closeAsk();
  });
}
