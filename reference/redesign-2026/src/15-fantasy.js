/* ---------- Fantasy Lab: DARKO box projections under your league's scoring ---------- */
const FX_PRESETS = {
  espn: { label: 'ESPN points', w: { pts: 1, reb: 1, ast: 2, stl: 4, blk: 4, fg3m: 1, tov: -2, fgm: 2, fga: -1, ftm: 1, fta: -1 } },
  yahoo: { label: 'Yahoo points', w: { pts: 1, reb: 1.2, ast: 1.5, stl: 3, blk: 3, fg3m: 0, tov: -1, fgm: 0, fga: 0, ftm: 0, fta: 0 } },
  dk: { label: 'DraftKings', w: { pts: 1, reb: 1.25, ast: 1.5, stl: 2, blk: 2, fg3m: 0.5, tov: -0.5, fgm: 0, fga: 0, ftm: 0, fta: 0 } },
  cat9: { label: '9-cat', cats: true },
  custom: { label: 'Custom' },
};
const FX_W_KEYS = [['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK'], ['fg3m', '3PM'], ['tov', 'TOV'], ['fgm', 'FGM'], ['fga', 'FGA'], ['ftm', 'FTM'], ['fta', 'FTA']];
const FX_CATS = [['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK'], ['fg3m', '3PM'], ['fgpI', 'FG%'], ['ftpI', 'FT%'], ['tov', 'TOV']];
const FX = Object.assign({ preset: 'espn', src: 'darko', pos: 'all', q: '', hide: false, sort: 'val', dir: -1, custom: { ...FX_PRESETS.espn.w }, mine: [], taken: [] }, store.get('fx', {}));
const fxSave = () => store.set('fx', FX);
let fxLimit = 60;
let DOWNLOADS = null;

function fxCompute() {
  const rows = [];
  for (const c of CUR) {
    const mpg = FX.src === 'actual' ? c.mpg || 0 : clamp(c.xmin || 0, 0, 40);
    if (mpg < 4) continue;
    const k = (c.pace * mpg) / 48 / 100;
    rows.push({
      c, id: c.id, mpg, pts: c.pts * k, reb: c.reb * k, ast: c.ast * k, stl: c.stl * k, blk: c.blk * k, tov: c.tov * k,
      fga: c.fga * k, fgm: c.fga * c.fgp * k, fg3m: c.fg3a * c.fg3p * k, fta: c.fta * k, ftm: c.fta * c.ftp * k, fgp: c.fgp, ftp: c.ftp,
    });
  }
  if (FX_PRESETS[FX.preset].cats) {
    let pool = rows.slice().sort((a, b) => b.mpg - a.mpg).slice(0, 200);
    for (let it = 0; it < 3; it++) {
      const lgFG = sum(pool, (r) => r.fgm) / sum(pool, (r) => r.fga);
      const lgFT = sum(pool, (r) => r.ftm) / Math.max(sum(pool, (r) => r.fta), 1);
      for (const r of rows) { r.fgpI = r.fgm - lgFG * r.fga; r.ftpI = r.ftm - lgFT * r.fta; }
      const st = {};
      for (const [k] of FX_CATS) {
        const m = sum(pool, (r) => r[k]) / pool.length;
        const sd = Math.sqrt(sum(pool, (r) => (r[k] - m) ** 2) / pool.length) || 1;
        st[k] = { m, sd };
      }
      for (const r of rows) {
        r.z = {};
        for (const [k] of FX_CATS) r.z[k] = ((r[k] - st[k].m) / st[k].sd) * (k === 'tov' ? -1 : 1);
        r.val = sum(FX_CATS, ([k]) => r.z[k]);
      }
      pool = rows.slice().sort((a, b) => b.val - a.val).slice(0, 156);
    }
  } else {
    const w = FX.preset === 'custom' ? FX.custom : FX_PRESETS[FX.preset].w;
    for (const r of rows) r.val = sum(FX_W_KEYS, ([k]) => (Number(w[k]) || 0) * r[k]);
  }
  rows.sort((a, b) => b.val - a.val);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}
function fxZCell(r, k, label) {
  const shown = k === 'fgpI' ? pct(r.fgp) : k === 'ftpI' ? pct(r.ftp) : r[k].toFixed(1);
  if (!r.z) return `<td>${shown}</td>`;
  const z = clamp(r.z[k], -3, 3);
  const w = Math.abs(z) / 3 * 20;
  return `<td><span class="zc" title="${label} z-score ${z >= 0 ? '+' : MINUS}${Math.abs(z).toFixed(2)}"><span>${shown}</span><span class="zb"><i style="${z >= 0 ? `left:20px;width:${w}px` : `left:${20 - w}px;width:${w}px`}"></i></span></span></td>`;
}
function renderFx() {
  const cats = !!FX_PRESETS[FX.preset].cats;
  let rows = fxCompute();
  const mine = new Set(FX.mine); const taken = new Set(FX.taken);
  const q = norm(FX.q);
  let view = rows.filter((r) => (FX.pos === 'all' || r.c.pg === FX.pos) && (!q || norm(r.c.name).includes(q)) && (!FX.hide || (!mine.has(r.id) && !taken.has(r.id))));
  if (FX.sort !== 'val') {
    const k = FX.sort;
    view = view.slice().sort((a, b) => ((cats && a.z && a.z[k] != null ? a.z[k] - b.z[k] : a[k] - b[k]) * FX.dir));
  } else if (FX.dir > 0) view = view.slice().reverse();
  const colDefs = [['mpg', 'MIN'], ...FX_CATS];
  const th = (k, l) => `<th${FX.sort === k ? ` aria-sort="${FX.dir < 0 ? 'descending' : 'ascending'}"` : ''}><button class="sort" type="button" data-fsort="${k}">${l}</button></th>`;
  const html = `<div class="tbl-wrap"><table class="tbl compact"><caption class="sr-only">Fantasy projections</caption><thead><tr><th class="l">#</th><th class="l">Player</th><th class="l">Team</th>${colDefs.map(([k, l]) => th(k, l)).join('')}${th('val', cats ? 'Total z' : 'FP/G')}<th class="c">Draft</th></tr></thead><tbody>
    ${view.slice(0, fxLimit).map((r) => `<tr class="${mine.has(r.id) ? 'mine' : taken.has(r.id) ? 'taken' : ''}"><td class="rk l">${r.rank}</td><td class="l">${plink(r.id, r.c.name.length > 18 ? shortName(r.id) : r.c.name)}<span class="pos">${esc(r.c.pos || '')}</span></td><td class="l">${teamChip(r.c.tm)}</td><td class="muted">${r.mpg.toFixed(1)}</td>
      ${FX_CATS.map(([k, l]) => fxZCell(r, k, l)).join('')}<td class="fp">${cats ? sgn(r.val, 2) : r.val.toFixed(1)}</td>
      <td class="c nowrap"><button class="dbtn" type="button" data-mine="${r.id}" aria-pressed="${mine.has(r.id)}">Mine</button> <button class="dbtn" type="button" data-taken="${r.id}" aria-pressed="${taken.has(r.id)}">Taken</button></td></tr>`).join('')}
  </tbody></table></div>
  <div class="row" style="justify-content:space-between;margin-top:12px"><span class="note">${view.length} players · per-game projections at ${FX.src === 'actual' ? '2025-26 minutes' : "DARKO's projected minutes"}</span>${view.length > fxLimit ? '<button class="btn" type="button" id="fxMore">Show 60 more</button>' : ''}</div>`;
  $('#fxTable').innerHTML = html;
  $$('[data-fsort]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.fsort; if (FX.sort === k) FX.dir = -FX.dir; else { FX.sort = k; FX.dir = -1; } fxSave(); renderFx(); }));
  $$('[data-mine]').forEach((b) => b.addEventListener('click', () => { const id = Number(b.dataset.mine); FX.taken = FX.taken.filter((x) => x !== id); FX.mine = FX.mine.includes(id) ? FX.mine.filter((x) => x !== id) : [...FX.mine, id]; fxSave(); renderFx(); }));
  $$('[data-taken]').forEach((b) => b.addEventListener('click', () => { const id = Number(b.dataset.taken); FX.mine = FX.mine.filter((x) => x !== id); FX.taken = FX.taken.includes(id) ? FX.taken.filter((x) => x !== id) : [...FX.taken, id]; fxSave(); renderFx(); }));
  const more = $('#fxMore'); if (more) more.addEventListener('click', () => { fxLimit += 60; renderFx(); });
  renderFxSide(rows, cats);
}
function renderFxSide(rows, cats) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const mine = FX.mine.map((id) => byId.get(id)).filter(Boolean);
  const avail = rows.filter((r) => !FX.mine.includes(r.id) && !FX.taken.includes(r.id)).slice(0, 6);
  let catTot = '';
  if (cats && mine.length) {
    catTot = `<div class="sk-list" style="margin-top:12px">${FX_CATS.map(([k, l]) => { const z = sum(mine, (r) => r.z[k]); const w = clamp(Math.abs(z) / Math.max(3, mine.length * 1.5), 0, 1) * 50; return `<div class="sk" style="grid-template-columns:40px minmax(0,1fr) 44px"><span class="n">${l}</span><span class="bar" style="background:var(--wash-2)"><i class="${z >= 0 ? 'o' : 'd'}" style="left:${z >= 0 ? 50 : 50 - w}%;width:${w}%;background:var(--ink-2)"></i><i style="left:50%;width:1px;background:var(--line-2)"></i></span><span class="p">${sgn(z, 1)}</span></div>`; }).join('')}</div>`;
  }
  $('#fxSide').innerHTML = `
    <section class="panel"><div class="ph"><div class="ph-l"><h2>My team</h2><span class="sub">${mine.length ? `${mine.length} player${mine.length > 1 ? 's' : ''} · ${cats ? `total z ${sgn(sum(mine, (r) => r.val), 1)}` : `${sum(mine, (r) => r.val).toFixed(1)} FP/G`}` : 'Mark players as Mine while you draft'}</span></div>${mine.length || FX.taken.length ? '<button class="btn ghost sm" type="button" id="fxClear">Clear draft</button>' : ''}</div>
      ${mine.map((r) => `<div class="reign"><span>${plink(r.id)} <span class="pos">${esc(r.c.pos || '')}</span></span><span class="w">${cats ? sgn(r.val, 1) : r.val.toFixed(1)}</span></div>`).join('') || '<div class="empty">No players yet.</div>'}
      ${catTot}
    </section>
    <section class="panel" style="margin-top:16px"><div class="ph"><div class="ph-l"><h2>Best available</h2><span class="sub">Skips anyone marked Mine or Taken</span></div></div>
      ${avail.map((r) => `<div class="reign"><span>${plink(r.id)} ${teamChip(r.c.tm, false)}</span><span class="w">${cats ? sgn(r.val, 1) : r.val.toFixed(1)}</span></div>`).join('')}
    </section>`;
  const clr = $('#fxClear'); if (clr) clr.addEventListener('click', () => { FX.mine = []; FX.taken = []; fxSave(); renderFx(); });
}
function fxCsv() {
  const rows = fxCompute();
  const cats = !!FX_PRESETS[FX.preset].cats;
  const head = ['rank', 'player', 'team', 'pos', 'min', 'pts', 'reb', 'ast', 'stl', 'blk', 'fg3m', 'fg_pct', 'ft_pct', 'tov', cats ? 'total_z' : 'fantasy_pts'];
  const lines = [head.join(',')].concat(rows.map((r) => [r.rank, `"${r.c.name.replace(/"/g, '""')}"`, r.c.team ? r.c.team.abbr : '', r.c.pos || '', r.mpg.toFixed(1), r.pts.toFixed(1), r.reb.toFixed(1), r.ast.toFixed(1), r.stl.toFixed(2), r.blk.toFixed(2), r.fg3m.toFixed(2), r.fgp.toFixed(3), r.ftp.toFixed(3), r.tov.toFixed(2), r.val.toFixed(2)].join(',')));
  return lines.join('\n');
}

VIEWS.fantasy = {
  title: () => 'Fantasy Lab',
  html() {
    const preset = FX_PRESETS[FX.preset];
    return `
    <section class="page-head"><div class="t">
      <span class="eyebrow">New · draft season</span>
      <h1 class="display">Fantasy Lab</h1>
      <p class="lede">DARKO projects every box-score stat per 100 possessions. Pick your league's scoring and a minutes source and it becomes a per-game draft board. The Mine and Taken marks stay in this browser.</p>
    </div><div class="controls"><button class="btn" type="button" id="fxCsv" hidden>${ICON.download} Download CSV</button></div></section>
    <div class="fx-layout">
      <div>
        <section class="panel">
          <div class="fx-controls">
            <div class="field"><span>Scoring</span><div class="seg" role="group" aria-label="Scoring">${Object.entries(FX_PRESETS).map(([k, p]) => `<button type="button" data-preset="${k}" aria-pressed="${FX.preset === k}">${p.label}</button>`).join('')}</div></div>
            <div class="field"><span>Minutes</span><div class="seg" role="group" aria-label="Minutes source"><button type="button" data-src="darko" aria-pressed="${FX.src === 'darko'}">DARKO projected</button><button type="button" data-src="actual" aria-pressed="${FX.src === 'actual'}">2025-26 actual</button></div></div>
            <label class="field"><span>Position</span><select class="select" id="fxPos">${[['all', 'All'], ['G', 'Guards'], ['F', 'Forwards'], ['C', 'Centers']].map(([v, l]) => `<option value="${v}"${FX.pos === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
            <label class="field" style="flex:1;min-width:160px"><span>Search</span><input class="input" id="fxQ" type="search" placeholder="Player" value="${esc(FX.q)}" autocomplete="off"></label>
            <label class="check" style="height:34px"><input type="checkbox" id="fxHide"${FX.hide ? ' checked' : ''}> Hide drafted</label>
          </div>
          ${FX.preset === 'custom' ? `<div class="weights">${FX_W_KEYS.map(([k, l]) => `<label>${l}<input type="number" step="0.25" data-w="${k}" value="${FX.custom[k] ?? 0}"></label>`).join('')}</div>` : ''}
          ${preset.cats ? '<p class="note" style="margin-bottom:12px">9-cat values are z-scores against the top 156 players (a 12-team, 13-deep league). FG% and FT% are weighted by attempts. Bars show each category\'s z-score.</p>' : ''}
          <div id="fxTable"></div>
        </section>
      </div>
      <aside id="fxSide"></aside>
    </div>`;
  },
  mount() {
    $$('[data-preset]').forEach((b) => b.addEventListener('click', () => { FX.preset = b.dataset.preset; FX.sort = 'val'; FX.dir = -1; fxSave(); render({ keepScroll: true }); }));
    $$('[data-src]').forEach((b) => b.addEventListener('click', () => { FX.src = b.dataset.src; fxSave(); $$('[data-src]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); renderFx(); }));
    $('#fxPos').addEventListener('change', (e) => { FX.pos = e.target.value; fxSave(); renderFx(); });
    $('#fxQ').addEventListener('input', debounce((e) => { FX.q = e.target.value; fxSave(); renderFx(); }, 120));
    $('#fxHide').addEventListener('change', (e) => { FX.hide = e.target.checked; fxSave(); renderFx(); });
    $$('[data-w]').forEach((inp) => inp.addEventListener('input', debounce(() => { FX.custom[inp.dataset.w] = Number(inp.value) || 0; fxSave(); renderFx(); }, 150)));
    const csvBtn = $('#fxCsv');
    if (DOWNLOADS) csvBtn.hidden = false;
    csvBtn.addEventListener('click', async () => {
      try { await DOWNLOADS.save({ filename: `darko-fantasy-${FX.preset}.csv`, data: fxCsv() }); toast('Saved CSV'); } catch (e) { if (e && e.code !== 'declined') toast('Download is not available here.'); }
    });
    renderFx();
  },
};
