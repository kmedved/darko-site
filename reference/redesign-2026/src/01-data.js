/* ---------- data layer ---------- */
const RAW = JSON.parse(document.getElementById('darko-data').textContent);
const META = RAW.meta;
const LATEST = META.asOf;
const SEASON = META.season;
const TEAMS = RAW.teams.map((t, i) => ({ ...t, i, full: `${t.city} ${t.name}` }));
const TEAM_BY_ABBR = new Map(TEAMS.map((t) => [t.abbr, t]));
const PM = RAW.players;
const POS_ABBR = { GUARD: 'G', FORWARD: 'F', CENTER: 'C', 'GUARD-FORWARD': 'G-F', 'FORWARD-GUARD': 'F-G', 'FORWARD-CENTER': 'F-C', 'CENTER-FORWARD': 'C-F' };
const posAbbr = (p) => { const u = String(p || '').trim().toUpperCase(); return POS_ABBR[u] || u; };
const P = {
  name: (id) => (PM[id] ? PM[id][0] : `Player ${id}`),
  pos: (id) => posAbbr(PM[id] && PM[id][1]),
  ht: (id) => PM[id] && PM[id][2],
  wt: (id) => PM[id] && PM[id][3],
  dob: (id) => PM[id] && PM[id][4],
  dy: (id) => PM[id] && PM[id][5],
  ds: (id) => PM[id] && PM[id][6],
  country: (id) => PM[id] && PM[id][7],
  rookie: (id) => PM[id] && PM[id][8],
};
const shortName = (id) => {
  const n = P.name(id).split(' ');
  return n.length > 1 ? `${n[0][0]}. ${n.slice(1).join(' ')}` : n[0];
};
const lastName = (id) => {
  const n = P.name(id).split(' ');
  if (n.length < 2) return n[0];
  const suffix = /^(jr\.?|sr\.?|ii|iii|iv)$/i;
  return suffix.test(n[n.length - 1]) && n.length > 2 ? `${n[n.length - 2]} ${n[n.length - 1]}` : n.slice(1).join(' ');
};
const posGroup = (pos) => {
  const p = String(pos || '').toUpperCase();
  if (p.startsWith('C')) return 'C';
  if (p.startsWith('G') || p === 'PG' || p === 'SG') return 'G';
  if (p.startsWith('F') || p === 'SF' || p === 'PF') return 'F';
  return '?';
};
const POS_NAME = { G: 'Guard', F: 'Forward', C: 'Center', '?': '—' };

/* current leaderboard (mirrors get_active_player_ratings for 2025-26) */
const CUR = RAW.cur.map((row) => {
  const c = {};
  RAW.curFields.forEach((k, j) => { c[k] = row[j]; });
  c.d = Number((c.dpm - c.o).toFixed(2));
  c.boxd = Number((c.box - c.boxo).toFixed(2));
  c.name = P.name(c.id);
  c.team = TEAMS[c.tm];
  c.pos = posAbbr(c.pos) || P.pos(c.id);
  c.pg = posGroup(c.pos);
  c.reb = c.orb + c.drb;
  c.ts = c.pts / (2 * (c.fga + 0.44 * c.fta));
  c.tovr = c.tov / Math.max(c.fga + 0.44 * c.fta + c.ast + c.tov, 1);
  c.rookieYr = P.rookie(c.id);
  return c;
});
CUR.sort((a, b) => b.dpm - a.dpm);
CUR.forEach((c, i) => { c.rank = i + 1; });
const CUR_BY_ID = new Map(CUR.map((c) => [c.id, c]));
const N_CUR = CUR.length;

/* current-season daily history: rows [dayIdx, dpm*100, o*100, minutes(-1 = projection row), oppIdx, teamIdx] */
const DAYS = RAW.days;
const LAST_DI = DAYS.length - 1;
const HIST = RAW.hist;
const hist = (id) => HIST[id] || [];
function dayIndexFor(iso) {
  if (iso < DAYS[0]) return -1;
  let lo = 0; let hi = LAST_DI;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (DAYS[mid] <= iso) lo = mid; else hi = mid - 1; }
  return lo;
}
function rowIdxAt(id, di) {
  const h = hist(id); let lo = 0; let hi = h.length - 1; let ans = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (h[mid][0] <= di) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
  return ans;
}
function valAt(id, di) {
  const k = rowIdxAt(id, di);
  if (k < 0) return null;
  const r = hist(id)[k];
  return { dpm: r[1] / 100, o: r[2] / 100, d: (r[1] - r[2]) / 100, tm: r[5], k };
}
const GAME_DAY = new Uint8Array(DAYS.length);
for (const id in HIST) for (const r of HIST[id]) if (r[3] > 0) GAME_DAY[r[0]] = 1;
function lastGameDayAtOrBefore(di) { for (let i = di; i >= 0; i--) if (GAME_DAY[i]) return i; return -1; }
const LAST_GAME_DI = lastGameDayAtOrBefore(LAST_DI);
const SEASON_OVER = DAYS[LAST_GAME_DI];

/* season-end snapshots, every player-season since 1996-97 */
const SE = RAW.se.map((r) => ({ id: r[0], season: r[1], age: r[2] / 10, tm: r[3], dpm: r[4] / 100, o: r[5] / 100, box: r[6] / 100, gp: r[7], min: r[8] }));
const SE_BY_ID = new Map();
const SE_BY_SEASON = new Map();
for (const s of SE) {
  if (!SE_BY_ID.has(s.id)) SE_BY_ID.set(s.id, []);
  SE_BY_ID.get(s.id).push(s);
  if (!SE_BY_SEASON.has(s.season)) SE_BY_SEASON.set(s.season, []);
  SE_BY_SEASON.get(s.season).push(s);
}
for (const arr of SE_BY_ID.values()) arr.sort((a, b) => a.season - b.season);
const SEASONS = [...SE_BY_SEASON.keys()].sort((a, b) => a - b);
const FIRST_SEASON = SEASONS[0];

/* weekly race frames (regular season, top 20) */
const FRAMES = RAW.race.frames;
const FRAME_TOP = RAW.race.top;
function frameIndexFor(iso) {
  let lo = 0; let hi = FRAMES.length - 1;
  if (iso <= FRAMES[0]) return 0;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (FRAMES[mid] <= iso) lo = mid; else hi = mid - 1; }
  return lo;
}
const seasonOfDate = (iso) => {
  for (const s of SEASONS) { const r = META.reg[s]; if (r && iso <= addDays(r[1], 75)) return s; }
  return SEASON;
};

/* age-bucket rarity: every player-season with 20+ games */
const AGE_BUCKETS = new Map();
for (const s of SE) {
  if (s.gp < 20) continue;
  const k = Math.floor(s.age);
  if (!AGE_BUCKETS.has(k)) AGE_BUCKETS.set(k, []);
  AGE_BUCKETS.get(k).push(s);
}
for (const arr of AGE_BUCKETS.values()) arr.sort((a, b) => b.dpm - a.dpm);
function ageRank(id, season) {
  const row = (SE_BY_ID.get(id) || []).find((s) => s.season === season);
  if (!row || row.gp < 20) return null;
  const arr = AGE_BUCKETS.get(Math.floor(row.age)) || [];
  const idx = arr.findIndex((s) => s.id === id && s.season === season);
  return { rank: idx + 1, n: arr.length, age: Math.floor(row.age), dpm: row.dpm, top: arr.slice(0, 5) };
}

/* skill fingerprint: percentile ranks among rotation players */
const SKILLS = [
  { k: 'pts', label: 'Scoring', side: 'o', f: (c) => c.pts, raw: (c) => `${c.pts.toFixed(1)} pts` },
  { k: 'ts', label: 'Efficiency', side: 'o', f: (c) => c.ts, raw: (c) => `${(c.ts * 100).toFixed(1)} TS%` },
  { k: 'ftp', label: 'Touch', side: 'o', f: (c) => c.ftp, raw: (c) => `${(c.ftp * 100).toFixed(0)} FT%` },
  { k: 'fg3a', label: '3PT volume', side: 'o', f: (c) => c.fg3a, raw: (c) => `${c.fg3a.toFixed(1)} 3PA` },
  { k: 'ast', label: 'Playmaking', side: 'o', f: (c) => c.ast, raw: (c) => `${c.ast.toFixed(1)} ast` },
  { k: 'tovr', label: 'Ball security', side: 'o', f: (c) => -c.tovr, raw: (c) => `${(c.tovr * 100).toFixed(1)} TOV%` },
  { k: 'orb', label: 'Off. boards', side: 'o', f: (c) => c.orb, raw: (c) => `${c.orb.toFixed(1)} orb` },
  { k: 'drb', label: 'Def. boards', side: 'd', f: (c) => c.drb, raw: (c) => `${c.drb.toFixed(1)} drb` },
  { k: 'blk', label: 'Rim protection', side: 'd', f: (c) => c.blk, raw: (c) => `${c.blk.toFixed(1)} blk` },
  { k: 'stl', label: 'Steals', side: 'd', f: (c) => c.stl, raw: (c) => `${c.stl.toFixed(1)} stl` },
];
const SKILL_POOL = CUR.filter((c) => c.gp >= 20 && c.mpg >= 12);
const SKILL_SORTED = Object.fromEntries(SKILLS.map((s) => [s.k, SKILL_POOL.map(s.f).sort((a, b) => a - b)]));
function skillPct(c, s) {
  const arr = SKILL_SORTED[s.k]; const v = s.f(c);
  let lo = 0; let hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < v) lo = mid + 1; else hi = mid; }
  let hi2 = lo; while (hi2 < arr.length && arr[hi2] === v) hi2++;
  return clamp(((lo + hi2) / 2) / arr.length, 0, 1);
}
const skillProfile = (c) => SKILLS.map((s) => ({ ...s, p: skillPct(c, s) }));

/* comps: {c: [[compId, season, age*10, dpmThen*100, similarity, [next five]]], fan: [[k,p10,p25,p50,p75,p90,inLeague%,n]]} */
const COMPS = RAW.comps;

/* team ratings from minutes-weighted DARKO */
const winsFor = (r) => clamp(WFIT.a + WFIT.b * r, 0, 82);
function rotationFor(ti) {
  const rows = (RAW.rot[ti] || []).filter((r) => CUR_BY_ID.has(r[0]));
  const tot = sum(rows, (r) => r[1]);
  const k = tot > 0 ? 240 / tot : 1;
  return rows.map((r) => ({ id: r[0], min: Math.min(42, r[1] * k), gp: r[2] }));
}
function rateRoster(roster) {
  let tot = 0; let s = 0; let so = 0;
  for (const r of roster) {
    const c = CUR_BY_ID.get(r.id);
    if (!c || !(r.min > 0)) continue;
    tot += r.min; s += c.dpm * r.min; so += c.o * r.min;
  }
  if (!tot) return { r: 0, o: 0, d: 0, min: 0 };
  const k = 5 / tot;
  return { r: s * k, o: so * k, d: (s - so) * k, min: tot };
}
const TEAM_BASE = TEAMS.map((t) => {
  const roster = rotationFor(t.i);
  return { t, roster, ...rateRoster(roster) };
});
/* wins fit on exactly these ratings (least squares against 2025-26 records) */
const WFIT = (() => {
  const xs = TEAM_BASE.map((b) => b.r); const ys = TEAM_BASE.map((b) => b.t.w);
  const n = xs.length; const mx = sum(xs) / n; const my = sum(ys) / n;
  let cov = 0; let vx = 0; let vy = 0;
  for (let i = 0; i < n; i++) { cov += (xs[i] - mx) * (ys[i] - my); vx += (xs[i] - mx) ** 2; vy += (ys[i] - my) ** 2; }
  const b = cov / vx;
  return { a: my - b * mx, b, r: cov / Math.sqrt(vx * vy) };
})();
const TEAM_ORDER = [...TEAM_BASE].sort((a, b) => b.r - a.r);
TEAM_ORDER.forEach((x, i) => { x.rank = i + 1; });
const LEAGUE_PACE = sum(CUR, (c) => c.pace || 0) / N_CUR;

/* rosters by last team, for team pages */
const BY_TEAM = new Map(TEAMS.map((t) => [t.i, []]));
for (const c of CUR) if (BY_TEAM.has(c.tm)) BY_TEAM.get(c.tm).push(c);

/* seismograph helpers: per-game update of DPM, split into offense and defense */
function gameUpdates(id, fromDi = 0, toDi = LAST_DI) {
  const h = hist(id); const out = [];
  for (let k = 1; k < h.length; k++) {
    const r = h[k];
    if (r[3] <= 0 || r[0] <= fromDi || r[0] > toDi) continue;
    const p = h[k - 1];
    out.push({ di: r[0], k, min: r[3], opp: r[4], dpm: r[1] / 100, prev: p[1] / 100, dd: (r[1] - p[1]) / 100, dO: (r[2] - p[2]) / 100, dD: ((r[1] - r[2]) - (p[1] - p[2])) / 100 });
  }
  return out;
}
const LEAGUE_UPDATE_MEDIAN = (() => {
  const vals = [];
  for (const c of CUR) {
    const u = gameUpdates(c.id).slice(-20);
    if (u.length >= 10) vals.push(sum(u, (x) => Math.abs(x.dd)) / u.length);
  }
  vals.sort((a, b) => a - b);
  return vals[Math.floor(vals.length / 2)] || 0.1;
})();

/* league movers & shocks for a window ending at day index di */
function windowStart(di, win) {
  if (win === 'season') return -1;
  const start = addDays(DAYS[di], -Number(win));
  return dayIndexFor(start);
}
const GD_CUM = (() => { const a = new Uint16Array(DAYS.length); let s = 0; for (let i = 0; i < DAYS.length; i++) { s += GAME_DAY[i]; a[i] = s; } return a; })();
function moversAt(di, win) {
  const d0 = windowStart(di, win);
  const minGames = win === 'season' ? clamp(Math.round(GD_CUM[di] * 0.22), 2, 20) : win === '30' ? 5 : 2;
  const out = [];
  for (const c of CUR) {
    const h = hist(c.id); if (!h.length) continue;
    const end = valAt(c.id, di); if (!end) continue;
    let start;
    if (d0 < 0) start = { dpm: h[0][1] / 100, o: h[0][2] / 100 };
    else { start = valAt(c.id, d0); if (!start) start = { dpm: h[0][1] / 100, o: h[0][2] / 100 }; }
    let g = 0; const series = [];
    for (const r of h) {
      if (r[0] > di) break;
      if (r[0] > d0 && r[3] > 0) g++;
      if (r[0] >= d0) series.push(r[1] / 100);
    }
    if (g < minGames) continue;
    out.push({ c, g, from: start.dpm, to: end.dpm, delta: end.dpm - start.dpm, dO: end.o - start.o, series });
  }
  return out;
}
function shocksAt(di, win, n = 7) {
  const d0 = windowStart(di, win);
  const out = [];
  for (const c of CUR) for (const u of gameUpdates(c.id, d0, di)) out.push({ c, ...u });
  out.sort((a, b) => Math.abs(b.dd) - Math.abs(a.dd));
  return out.slice(0, n);
}
function boardAt(di, n = 10) {
  const out = [];
  for (const c of CUR) { const v = valAt(c.id, di); if (v) out.push({ c, v }); }
  out.sort((a, b) => b.v.dpm - a.v.dpm);
  return n ? out.slice(0, n) : out;
}
function seriesUpTo(id, di) {
  const s = [];
  for (const r of hist(id)) { if (r[0] > di) break; s.push(r[1] / 100); }
  return s;
}

/* DARKOdle pool (deterministic shuffle) */
const DLE_POOL = (() => {
  const arr = RAW.pool.slice();
  const rnd = mulberry32(20260901);
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
})();
