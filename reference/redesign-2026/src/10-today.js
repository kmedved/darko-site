/* ---------- views registry ---------- */
const VIEWS = {};
const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const WIN_LABEL = { 7: '7 days', 30: '30 days', season: 'Season' };
const WIN_TEXT = { 7: 'over the past week', 30: 'over the past 30 days', season: 'since opening night' };

function todayRewound() {
  const fi = frameIndexFor(STATE.asOf);
  const f = FRAMES[fi]; const top = FRAME_TOP[fi] || [];
  const s = seasonOfDate(f);
  const lead = top[0];
  return `
  <section class="page-head"><div class="t">
    <span class="eyebrow">The Daily · Rewound · ${esc(dateLong(f))}</span>
    <h1 class="display">${seasonLabel(s)}: ${esc(lead ? lastName(lead[0]) : '—')} on top</h1>
    <p class="lede">The Daily covers the current season game by game. For earlier dates it shows the weekly top 20 that powers Rewind. Drag the time machine forward to return to 2025-26.</p>
  </div><div class="controls"><a class="btn primary" href="#rewind">${ICON.play} Play ${seasonLabel(s)} in Rewind</a><button class="btn" type="button" data-latest>Back to latest</button></div></section>
  <div class="grid">
    <section class="panel c7"><div class="ph"><div class="ph-l"><h2>Top of the board</h2><span class="sub">DPM on ${esc(dateStr(f))}</span></div></div>
      <div class="board">${top.slice(0, 12).map((r, i) => `<a class="board-row" href="#p${r[0]}"><span class="rk">${i + 1}</span><span class="nm">${esc(P.name(r[0]))}</span>${teamChip(r[2], false)}<span></span><span class="v">${sgn(r[1] / 100)}</span></a>`).join('')}</div>
    </section>
    <section class="panel c5"><div class="ph"><h2>That season, in DARKO</h2></div>
      ${(() => {
        const rows = (SE_BY_SEASON.get(s) || []).filter((x) => x.gp >= 20).sort((a, b) => b.dpm - a.dpm).slice(0, 8);
        return `<p class="note" style="margin-bottom:10px">Season-end DPM, 20+ games.</p>${simpleTable(['Player', 'Team', 'Age', 'DPM'], rows.map((r) => [plink(r.id), teamChip(r.tm), r.age.toFixed(0), `<b>${sgn(r.dpm)}</b>`]), [0, 1])}`;
      })()}
    </section>
  </div>`;
}

VIEWS.today = {
  title: () => 'Today',
  dated: true,
  html() {
    if (!inCurrentSeason()) return todayRewound();
    const di = asOfDi();
    const iso = DAYS[di];
    const phase = iso < META.regStart ? 'pre' : iso <= META.regEnd ? 'season' : iso <= SEASON_OVER ? 'playoffs' : 'offseason';
    const edition = { pre: 'Opening night', season: 'Game-day edition', playoffs: 'Playoff edition', offseason: 'Offseason edition' }[phase];
    const board = boardAt(di, 10);
    let win = STATE.todayWin; let fell = false;
    let mv = moversAt(di, win);
    if (win !== 'season' && mv.length < 6) { fell = true; win = 'season'; mv = moversAt(di, 'season'); }
    const risers = mv.slice().sort((a, b) => b.delta - a.delta).slice(0, 6);
    const fallers = mv.slice().sort((a, b) => a.delta - b.delta).slice(0, 6);
    const minG = win === 'season' ? clamp(Math.round(GD_CUM[di] * 0.22), 2, 20) : win === '30' ? 5 : 2;
    const shocks = shocksAt(di, win, 7);
    const top = board[0]; const r0 = risers[0]; const f0 = fallers[0];
    const winTxt = WIN_TEXT[win];
    const riserWord = win === 'season' ? "the season's biggest riser" : win === '30' ? "the month's biggest riser" : "the week's biggest riser";
    const headline = top ? `${lastName(top.c.id)} ${phase === 'offseason' ? 'finishes on top' : 'leads the league'}${r0 ? `; ${lastName(r0.c.id)} is ${riserWord}` : ''}` : 'The Daily';
    const lede = [
      top ? `${top.c.name} ${phase === 'offseason' ? 'ends 2025-26' : 'sits'} atop DARKO at ${sgn(top.v.dpm)} per 100 possessions (${sgn(top.v.o)} offense, ${sgn(top.v.d)} defense).` : '',
      r0 ? `${r0.c.name} has climbed ${sgn(r0.delta)} ${winTxt}, the biggest rise among players with ${minG}+ games.` : '',
      f0 ? `${f0.c.name} has slid ${sgn(f0.delta)}.` : '',
    ].join(' ');

    const mvRow = (m) => `<a class="mv-row" href="#p${m.c.id}"><span class="who"><b>${esc(m.c.name)}</b><span>${esc(m.c.team ? m.c.team.abbr : 'FA')} · ${m.g} games · now ${sgn(m.to)}</span></span>${spark(m.series, { w: 80, h: 24 })}${deltaHtml(m.delta)}</a>`;
    const shockRow = (u) => `<a class="shock" href="#p${u.c.id}-seismo"><span class="dt">${esc(dateShort(DAYS[u.di]))}</span><span class="who"><b>${esc(u.c.name)}</b><span>${u.opp >= 0 ? `vs ${TEAMS[u.opp].abbr} · ` : ''}${u.min} min · ${sgn(u.prev, 2)} → ${sgn(u.dpm, 2)}</span></span><span class="row" style="justify-content:flex-end;gap:10px;flex-wrap:nowrap">${oxBar(u.dO, u.dD, { w: 64, max: 2.2 })}${deltaHtml(u.dd)}</span></a>`;

    const rare = CUR.map((c) => ({ c, r: ageRank(c.id, SEASON) })).filter((x) => x.r && x.r.rank <= 5 && x.r.n >= 25)
      .sort((a, b) => a.r.rank - b.r.rank || a.r.age - b.r.age).slice(0, 5);

    const watchIds = [...STATE.watch].filter((id) => CUR_BY_ID.has(id));
    const suggested = !watchIds.length;
    const wl = suggested ? CUR.filter((c) => c.rookieYr === SEASON).slice(0, 4).map((c) => c.id) : watchIds;
    const d0 = windowStart(di, win);
    const wcard = (id) => {
      const c = CUR_BY_ID.get(id); const v = valAt(id, di);
      if (!v) return '';
      const st = d0 < 0 ? { dpm: hist(id)[0][1] / 100 } : (valAt(id, d0) || { dpm: hist(id)[0][1] / 100 });
      const series = hist(id).filter((r) => r[0] <= di && r[0] >= d0).map((r) => r[1] / 100);
      return `<div class="wcard"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><a class="plink" href="#p${id}">${esc(c.name)}</a>${starBtn(id)}</div>
        <div class="row" style="gap:8px">${teamChip(c.tm)}<span class="muted" style="font-size:12px">#${c.rank} now</span></div>
        <div class="row" style="justify-content:space-between;align-items:flex-end;flex-wrap:nowrap"><span class="big-num" style="font-size:30px">${sgn(v.dpm)}</span>${deltaHtml(v.dpm - st.dpm)}</div>
        ${spark(series, { w: 200, h: 34 })}</div>`;
    };
    const n = dlePuzzleNumber();

    return `
    <section class="page-head"><div class="t">
      <span class="eyebrow">The Daily · ${edition} · ${esc(dateLong(iso))}</span>
      <h1 class="display">${esc(headline)}</h1>
      <p class="lede">${esc(lede)}</p>
    </div></section>
    <div class="grid">
      <section class="panel c7" aria-labelledby="h-board">
        <div class="ph"><div class="ph-l"><h2 id="h-board">Top of the board</h2><span class="sub">DPM, points per 100 possessions above average · ${esc(dateStr(iso))}</span></div><a class="btn ghost sm" href="#players">Full leaderboard ${ICON.arrow}</a></div>
        ${top ? `<div class="lead">
          <div class="lead-top">
            ${glyph(top.c, 72, { titles: true })}
            <div class="lead-name"><span class="eyebrow">No. 1 · ${esc(top.c.team ? top.c.team.full : 'Free agent')}</span><h3><a class="plink" href="#p${top.c.id}">${esc(top.c.name)}</a></h3><div class="lead-split">${oxPair(top.v.o, top.v.d)}</div></div>
            <div class="big-num lead-num" style="margin-left:auto">${sgn(top.v.dpm)}</div>
          </div>
          <div class="chart" id="leadChart"></div>
          <div class="board">${board.slice(1).map((b, i) => `<a class="board-row" href="#p${b.c.id}"><span class="rk">${i + 2}</span><span class="nm">${esc(b.c.name)}</span>${teamChip(b.c.tm, false)}${spark(seriesUpTo(b.c.id, di), { w: 96, h: 22 })}<span class="v">${sgn(b.v.dpm)}</span></a>`).join('')}</div>
        </div>` : '<div class="empty">No ratings yet on this date.</div>'}
      </section>
      <section class="panel c5" aria-labelledby="h-movers">
        <div class="ph"><div class="ph-l"><h2 id="h-movers">Movers</h2><span class="sub">Change in DPM ${winTxt}</span></div>
          <div class="seg" role="group" aria-label="Window">${['7', '30', 'season'].map((k) => `<button type="button" data-win="${k}" aria-pressed="${k === STATE.todayWin}">${WIN_LABEL[k]}</button>`).join('')}</div></div>
        ${fell ? `<p class="note" style="margin-bottom:12px">No games in the last ${STATE.todayWin} days (the season ended ${esc(dateStr(SEASON_OVER))}), so this shows the full season. Drag the time machine into the season for weekly movers.</p>` : ''}
        <div class="movers-wrap"><div class="movers">
          <div><div class="mv-h"><span>Risers</span><span>Change</span></div>${risers.map(mvRow).join('') || '<div class="empty">No risers yet.</div>'}</div>
          <div><div class="mv-h"><span>Fallers</span><span>Change</span></div>${fallers.map(mvRow).join('') || '<div class="empty">No fallers yet.</div>'}</div>
        </div></div>
        <p class="note" style="margin-top:10px">Minimum ${minG} games played in the window.</p>
      </section>
      <section class="panel c7" aria-labelledby="h-shocks">
        <div class="ph"><div class="ph-l"><h2 id="h-shocks">Biggest single-game updates</h2><span class="sub">How far one game moved a rating ${winTxt}, split into offense ${gO} and defense ${gX}</span></div></div>
        ${shocks.map(shockRow).join('') || '<div class="empty">No games in this window.</div>'}
        <p class="note" style="margin-top:10px">A typical game moves a rotation player's DPM by about ${LEAGUE_UPDATE_MEDIAN.toFixed(2)} points. Open any player to see every update in the Seismograph.</p>
      </section>
      <section class="panel c5" aria-labelledby="h-rare">
        <div class="ph"><div class="ph-l"><h2 id="h-rare">Ahead of the curve</h2><span class="sub">2025-26 seasons that rank top 5 for the player's age since 1996-97</span></div></div>
        <div class="rare">${rare.map(({ c, r }) => `<a class="rare-item" href="#p${c.id}-comps"><span class="rk">#${r.rank}<small> of ${r.n}</small></span><p><b>${esc(c.name)}</b> posted ${sgn(r.dpm)} at age ${r.age}, the ${r.rank === 1 ? 'best' : ordinal(r.rank) + '-best'} age-${r.age} season in DARKO's history.</p></a>`).join('') || '<div class="empty">No age records this season.</div>'}</div>
        <p class="note" style="margin-top:6px">Season-end DPM, 20+ games. Tap a player for historical comps and futures.</p>
      </section>
      <section class="panel c12" aria-labelledby="h-watch">
        <div class="ph"><div class="ph-l"><h2 id="h-watch">${suggested ? 'Start a watchlist' : 'Your watchlist'}</h2><span class="sub">${suggested ? 'Suggested: the top rookies. Tap the star on any player to follow them here; the list stays in this browser.' : `Change ${winTxt}`}</span></div></div>
        <div class="wgrid">${wl.map(wcard).join('')}</div>
      </section>
      <div class="c12 promos">
        <a class="promo" href="#darkodle"><span class="eyebrow">Daily game</span><h3>DARKOdle #${n}</h3><p>Name the player from the shape of his career DPM curve. Six guesses.</p><span class="cta">Play today's puzzle →</span></a>
        <a class="promo" href="#lab"><span class="eyebrow">It's the offseason</span><h3>Roster Lab</h3><p>Rebuild any rotation, trade between two teams and see the rating, wins and matchup odds move instantly.</p><span class="cta">Open the lab →</span></a>
        <a class="promo" href="#fantasy"><span class="eyebrow">Draft season</span><h3>Fantasy Lab</h3><p>DARKO's per-100 projections under your league's scoring, with a live draft board.</p><span class="cta">Rank players →</span></a>
      </div>
    </div>`;
  },
  mount() {
    $$('[data-win]').forEach((b) => b.addEventListener('click', () => { STATE.todayWin = b.dataset.win; store.set('todayWin', STATE.todayWin); render({ keepScroll: true }); }));
    const el = document.getElementById('leadChart');
    if (!el || !inCurrentSeason()) return;
    const di = asOfDi();
    const top = boardAt(di, 1)[0];
    if (!top) return;
    chart(el, (node, w) => timeChart(node, w, {
      h: 150, d0: 0, d1: di, label: `${top.c.name} DPM this season`,
      series: [{ pts: histPts(top.c.id).filter((p) => p[0] <= di), cls: 'ln-2', name: 'DPM', key: KEY.ink }],
      tip: (d) => {
        const v = valAt(top.c.id, d); const h = hist(top.c.id)[v.k];
        return ttHead(dateStr(DAYS[d])) + ttRow(sgn(v.dpm, 2), 'DPM', KEY.ink) + ttRow(sgn(v.o, 2), 'Offense', KEY.o) + ttRow(sgn(v.d, 2), 'Defense', KEY.d)
          + (h[3] > 0 ? `<div class="muted" style="margin-top:4px">${h[4] >= 0 ? 'vs ' + TEAMS[h[4]].abbr + ' · ' : ''}${h[3]} min</div>` : '');
      },
    }));
  },
};
