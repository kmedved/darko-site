/* ---------- Card Studio: shareable player cards drawn on canvas ---------- */
const CARD = Object.assign({ fmt: 'square', theme: 'dark', trace: true, glyph: true, comps: true }, store.get('card', {}));
const CARD_FMT = { square: [1080, 1080, 'Square 1:1'], story: [1080, 1920, 'Story 9:16'], wide: [1600, 900, 'Wide 16:9'] };
let cardBlob = null;

function cardColors(c) {
  const dark = { bg: '#0D1218', panel: '#151C25', ink: '#F2F5F9', ink2: '#AEB8C6', ink3: '#7F8A99', line: '#27313F', o: '#EB7A45', d: '#4A93EC', maple: '#D9A566' };
  if (CARD.theme === 'light') return { bg: '#F6F7F9', panel: '#FFFFFF', ink: '#0F1720', ink2: '#4A5566', ink3: '#667080', line: '#DDE1E7', o: '#eb6834', d: '#2a78d6', maple: '#B8812F' };
  if (CARD.theme === 'team' && c.team) return { ...dark, bg: d3.interpolateRgb(c.team.c[0], '#06080B')(0.45), panel: 'rgba(255,255,255,.06)', line: 'rgba(255,255,255,.16)', ink3: 'rgba(255,255,255,.62)', ink2: 'rgba(255,255,255,.78)' };
  return dark;
}
function cFont(ctx, weight, size, wide, family = 'Archivo') {
  ctx.font = `${weight} ${size}px "${family}", system-ui, sans-serif`;
  if ('fontStretch' in ctx) ctx.fontStretch = wide ? 'expanded' : 'normal';
}
function fitText(ctx, text, maxW, weight, size, wide, min = 28) {
  let s = size;
  cFont(ctx, weight, s, wide);
  while (ctx.measureText(text).width > maxW && s > min) { s -= 2; cFont(ctx, weight, s, wide); }
  return s;
}
function cGlyph(ctx, c, cx, cy, R, col, labels) {
  const prof = skillProfile(c); const n = prof.length; const r0 = R * 0.2; const step = (2 * Math.PI) / n;
  ctx.strokeStyle = col.line; ctx.lineWidth = Math.max(1, R / 120);
  for (const rr of [R, r0 + (R - r0) * 0.5]) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 2 * Math.PI); ctx.stroke(); }
  prof.forEach((s, i) => {
    const a0 = -Math.PI / 2 + i * step + step * 0.09; const a1 = a0 + step * 0.82;
    const r = r0 + (R - r0) * Math.max(0.05, s.p);
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.arc(cx, cy, r0, a1, a0, true); ctx.closePath();
    ctx.fillStyle = s.side === 'o' ? col.o : col.d; ctx.fill();
    if (labels) {
      const am = (a0 + a1) / 2; const lr = R + R * 0.14;
      const lx = cx + lr * Math.cos(am); const ly = cy + lr * Math.sin(am);
      cFont(ctx, 600, Math.round(R * 0.085), false);
      ctx.fillStyle = col.ink2; ctx.textAlign = Math.cos(am) > 0.25 ? 'left' : Math.cos(am) < -0.25 ? 'right' : 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${s.label} ${Math.round(s.p * 100)}`, lx, ly);
    }
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
function cTrace(ctx, c, x0, y0, w, h, col) {
  const pts = hist(c.id).map((r) => [r[0], r[1] / 100]);
  if (pts.length < 2) return;
  const d0 = pts[0][0]; const d1 = pts[pts.length - 1][0];
  const lo = Math.min(...pts.map((p) => p[1])); const hi = Math.max(...pts.map((p) => p[1]));
  const pad = Math.max(0.3, (hi - lo) * 0.12);
  const X = (di) => x0 + ((di - d0) / Math.max(1, d1 - d0)) * w;
  const Y = (v) => y0 + h - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * h;
  ctx.strokeStyle = col.line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y0 + h); ctx.lineTo(x0 + w, y0 + h); ctx.stroke();
  ctx.strokeStyle = col.ink; ctx.lineWidth = Math.max(4, w / 260); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); pts.forEach((p, i) => { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }); ctx.stroke();
  const lp = pts[pts.length - 1];
  ctx.fillStyle = col.maple; ctx.beginPath(); ctx.arc(X(lp[0]), Y(lp[1]), Math.max(8, w / 110), 0, 2 * Math.PI); ctx.fill();
  const fs = Math.round(Math.max(16, w / 46));
  cFont(ctx, 500, fs, false, 'IBM Plex Mono');
  ctx.fillStyle = col.ink3;
  ctx.fillText(`${sgn(pts[0][1])} opening night`, x0, y0 + h + fs * 1.5);
  ctx.textAlign = 'right'; ctx.fillText(`${sgn(lp[1])} now`, x0 + w, y0 + h + fs * 1.5); ctx.textAlign = 'left';
}
function cOX(ctx, x, y, size, c, col) {
  const r = size * 0.36;
  ctx.lineWidth = Math.max(3, size * 0.1);
  ctx.strokeStyle = col.o; ctx.beginPath(); ctx.arc(x + r, y - r * 0.9, r, 0, 2 * Math.PI); ctx.stroke();
  cFont(ctx, 800, size, true); ctx.fillStyle = col.ink; ctx.fillText(sgn(c.o), x + r * 2 + size * 0.3, y);
  let x2 = x + r * 2 + size * 0.3 + ctx.measureText(sgn(c.o)).width + size * 0.25;
  cFont(ctx, 500, size * 0.5, false); ctx.fillStyle = col.ink3; ctx.fillText('offense', x2, y); x2 += ctx.measureText('offense').width + size * 0.9;
  ctx.strokeStyle = col.d; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x2, y - r * 1.9); ctx.lineTo(x2 + r * 1.8, y - r * 0.1); ctx.moveTo(x2 + r * 1.8, y - r * 1.9); ctx.lineTo(x2, y - r * 0.1); ctx.stroke();
  cFont(ctx, 800, size, true); ctx.fillStyle = col.ink; ctx.fillText(sgn(c.d), x2 + r * 1.8 + size * 0.3, y);
  const x3 = x2 + r * 1.8 + size * 0.3 + ctx.measureText(sgn(c.d)).width + size * 0.25;
  cFont(ctx, 500, size * 0.5, false); ctx.fillStyle = col.ink3; ctx.fillText('defense', x3, y);
}
function drawCard(c) {
  const [W, H] = CARD_FMT[CARD.fmt];
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); const col = cardColors(c);
  ctx.fillStyle = col.bg; ctx.fillRect(0, 0, W, H);
  const pad = Math.round(Math.min(W, H) * 0.066);
  const unit = Math.min(W, H) / 1080;
  // header
  cFont(ctx, 900, 40 * unit, true); ctx.fillStyle = col.ink; ctx.fillText('DARKO', pad, pad + 34 * unit);
  const wm = ctx.measureText('DARKO').width;
  cFont(ctx, 500, 22 * unit, false, 'IBM Plex Mono'); ctx.fillStyle = col.ink3;
  ctx.fillText('DPM · 2025-26', pad + wm + 18 * unit, pad + 32 * unit);
  ctx.textAlign = 'right'; ctx.fillText(`#${c.rank} of ${N_CUR}`, W - pad, pad + 32 * unit); ctx.textAlign = 'left';
  const comp = COMPS[c.id] && COMPS[c.id].c[0];
  const sub = `${c.team ? c.team.full : 'Free agent'} · ${c.pos || ''} · Age ${Math.floor(c.age)}`;
  const footer = () => {
    cFont(ctx, 500, 20 * unit, false, 'IBM Plex Mono'); ctx.fillStyle = col.ink3;
    ctx.fillText(`darko.app · ratings through ${dateStr(LATEST)}`, pad, H - pad + 6 * unit);
    ctx.textAlign = 'right'; ctx.fillText('offense ○  defense ×', W - pad, H - pad + 6 * unit); ctx.textAlign = 'left';
  };
  const compLine = (x, y, maxW) => {
    if (!CARD.comps || !comp) return;
    cFont(ctx, 500, 22 * unit, false, 'IBM Plex Mono'); ctx.fillStyle = col.ink3; ctx.fillText('CLOSEST HISTORICAL COMP', x, y);
    const t = `${P.name(comp[0])}, ${seasonLabel(comp[1])} (${sgn(comp[3] / 100)} at ${Math.floor(comp[2] / 10)})`;
    fitText(ctx, t, maxW, 700, 34 * unit, false, 20); ctx.fillStyle = col.ink; ctx.fillText(t, x, y + 44 * unit);
  };
  const traceBlock = (x, y, w, h) => {
    if (!CARD.trace) return;
    cFont(ctx, 500, 22 * unit, false, 'IBM Plex Mono'); ctx.fillStyle = col.ink3; ctx.fillText('2025-26, GAME BY GAME', x, y - 18 * unit);
    cTrace(ctx, c, x, y, w, h, col);
  };
  const bigNumber = (x, y, size, maxRight) => {
    let fs = size; cFont(ctx, 800, fs, true);
    while (x + ctx.measureText(sgn(c.dpm)).width > maxRight && fs > size * 0.6) { fs -= 6; cFont(ctx, 800, fs, true); }
    ctx.fillStyle = col.ink; ctx.fillText(sgn(c.dpm), x, y);
    return x + ctx.measureText(sgn(c.dpm)).width;
  };
  if (CARD.fmt === 'wide') {
    const colW = W * 0.54;
    fitText(ctx, c.name, colW - pad, 800, 84 * unit, true); ctx.fillStyle = col.ink; ctx.fillText(c.name, pad, 220 * unit);
    cFont(ctx, 500, 28 * unit, false); ctx.fillStyle = col.ink2; ctx.fillText(sub, pad, 266 * unit);
    bigNumber(pad - 6 * unit, 500 * unit, 220 * unit, colW);
    cFont(ctx, 500, 22 * unit, false, 'IBM Plex Mono'); ctx.fillStyle = col.ink3; ctx.fillText('DPM · POINTS PER 100 ABOVE AVERAGE', pad, 544 * unit);
    cOX(ctx, pad, 628 * unit, 42 * unit, c, col);
    compLine(pad, 716 * unit, colW - pad);
    if (CARD.glyph) cGlyph(ctx, c, colW + (W - colW) / 2, 330 * unit, 200 * unit, col, true);
    traceBlock(colW + 40 * unit, 640 * unit, W - colW - pad - 40 * unit, 110 * unit);
  } else if (CARD.fmt === 'story') {
    fitText(ctx, c.name, W - 2 * pad, 800, 104 * unit, true); ctx.fillStyle = col.ink; ctx.fillText(c.name, pad, 330 * unit);
    cFont(ctx, 500, 30 * unit, false); ctx.fillStyle = col.ink2; ctx.fillText(sub, pad, 382 * unit);
    bigNumber(pad - 8 * unit, 680 * unit, 300 * unit, W - pad);
    cFont(ctx, 500, 22 * unit, false, 'IBM Plex Mono'); ctx.fillStyle = col.ink3; ctx.fillText('DPM · POINTS PER 100 ABOVE AVERAGE', pad, 726 * unit);
    cOX(ctx, pad, 812 * unit, 46 * unit, c, col);
    if (CARD.glyph) cGlyph(ctx, c, W / 2, 1150 * unit, 220 * unit, col, true);
    compLine(pad, 1500 * unit, W - 2 * pad);
    traceBlock(pad, 1640 * unit, W - 2 * pad, 120 * unit);
  } else {
    fitText(ctx, c.name, W - 2 * pad, 800, 84 * unit, true); ctx.fillStyle = col.ink; ctx.fillText(c.name, pad, 210 * unit);
    cFont(ctx, 500, 28 * unit, false); ctx.fillStyle = col.ink2; ctx.fillText(sub, pad, 256 * unit);
    const R = 142 * unit;
    const right = CARD.glyph ? W - pad - 2 * R - 36 * unit : W - pad;
    bigNumber(pad - 6 * unit, 500 * unit, 220 * unit, right);
    if (CARD.glyph) cGlyph(ctx, c, W - pad - R, 420 * unit, R, col, false);
    cFont(ctx, 500, 22 * unit, false, 'IBM Plex Mono'); ctx.fillStyle = col.ink3; ctx.fillText('DPM · POINTS PER 100 ABOVE AVERAGE', pad, 544 * unit);
    cOX(ctx, pad, 626 * unit, 42 * unit, c, col);
    compLine(pad, 704 * unit, W - 2 * pad);
    traceBlock(pad, 832 * unit, W - 2 * pad, 84 * unit);
  }
  footer();
  return cv;
}
async function renderCardPreview(c) {
  try { await Promise.all([document.fonts.load('800 80px "Archivo"'), document.fonts.load('500 20px "IBM Plex Mono"')]); } catch (e) { /* fonts optional */ }
  const cv = drawCard(c);
  const img = $('#cardImg');
  if (!img) return;
  img.src = cv.toDataURL('image/png');
  img.alt = `DARKO card for ${c.name}: DPM ${sgn(c.dpm)}, offense ${sgn(c.o)}, defense ${sgn(c.d)}`;
  cardBlob = await new Promise((res) => cv.toBlob(res, 'image/png'));
}

VIEWS.card = {
  title: () => 'Card Studio',
  html(r) {
    const c = CUR_BY_ID.get(r.id) || CUR[0];
    const opt = (k, v, l) => `<button type="button" data-card="${k}:${v}" aria-pressed="${CARD[k] === v}">${l}</button>`;
    return `
    <section class="page-head"><div class="t">
      <span class="eyebrow">New · share</span>
      <h1 class="display">Card Studio</h1>
      <p class="lede">Turn any player into a clean, branded image for social posts: DPM, the offense and defense split, the skill fingerprint and a game-by-game trace.</p>
    </div></section>
    <div class="studio">
      <section class="panel stack">
        <div class="addbox"><label class="field"><span>Player</span><input class="input" id="cardQ" value="${esc(c.name)}" autocomplete="off"></label><div class="suggest" id="cardSug" hidden></div></div>
        <div class="field"><span>Format</span><div class="seg" role="group" aria-label="Format">${Object.entries(CARD_FMT).map(([k, v]) => opt('fmt', k, v[2])).join('')}</div></div>
        <div class="field"><span>Theme</span><div class="seg" role="group" aria-label="Theme">${opt('theme', 'dark', 'Dark')}${opt('theme', 'light', 'Light')}${opt('theme', 'team', 'Team colors')}</div></div>
        <div class="field"><span>Show</span>
          <label class="check"><input type="checkbox" data-show="glyph"${CARD.glyph ? ' checked' : ''}> Skill fingerprint</label>
          <label class="check"><input type="checkbox" data-show="trace"${CARD.trace ? ' checked' : ''}> Season trace</label>
          <label class="check"><input type="checkbox" data-show="comps"${CARD.comps ? ' checked' : ''}> Closest comp</label></div>
        <div class="row"><button class="btn primary" type="button" id="cardSave" hidden>${ICON.download} Save PNG</button><button class="btn" type="button" id="cardCopy">${ICON.copy} Copy image</button></div>
        <p class="note">You can also right-click or long-press the preview to save it.</p>
        <a class="btn ghost sm" href="#p${c.id}" style="justify-self:start">${ICON.arrow} ${esc(c.name)}'s page</a>
      </section>
      <div class="preview"><img id="cardImg" alt="Card preview"></div>
    </div>`;
  },
  mount(r) {
    const c = CUR_BY_ID.get(r.id) || CUR[0];
    renderCardPreview(c);
    $$('[data-card]').forEach((b) => b.addEventListener('click', () => { const [k, v] = b.dataset.card.split(':'); CARD[k] = v; store.set('card', CARD); $$(`[data-card^="${k}:"]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); renderCardPreview(c); }));
    $$('[data-show]').forEach((b) => b.addEventListener('change', () => { CARD[b.dataset.show] = b.checked; store.set('card', CARD); renderCardPreview(c); }));
    const save = $('#cardSave');
    if (DOWNLOADS) save.hidden = false;
    save.addEventListener('click', async () => {
      if (!cardBlob) return;
      try { await DOWNLOADS.save({ filename: `darko-${norm(c.name).replace(/[^a-z0-9]+/g, '-')}-${CARD.fmt}.png`, data: cardBlob }); toast('Saved card'); } catch (e) { if (e && e.code !== 'declined') toast('Saving is not available here. Right-click the preview instead.'); }
    });
    $('#cardCopy').addEventListener('click', async () => {
      try {
        if (!cardBlob || !window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) throw new Error('no clipboard');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': cardBlob })]);
        toast('Copied image');
      } catch (e) { toast('Copy is not available here. Right-click the preview to save it.'); }
    });
    const inp = $('#cardQ'); const box = $('#cardSug'); let items = []; let sel = 0;
    const paint = () => {
      box.innerHTML = items.map((x, i) => `<button type="button" aria-selected="${i === sel}" data-cp="${x.id}"><b>${esc(x.name)}</b>${teamChip(x.tm, false)}<span class="r">${sgn(x.dpm)}</span></button>`).join('');
      box.hidden = !items.length;
      $$('[data-cp]', box).forEach((b) => b.addEventListener('mousedown', (ev) => { ev.preventDefault(); location.hash = `#card-${b.dataset.cp}`; }));
    };
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('input', () => { const q = norm(inp.value); items = q.length < 2 ? [] : CUR.filter((x) => norm(x.name).includes(q)).slice(0, 8); sel = 0; paint(); });
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); paint(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); paint(); ev.preventDefault(); }
      else if (ev.key === 'Enter' && items[sel]) { location.hash = `#card-${items[sel].id}`; ev.preventDefault(); }
    });
    inp.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 150));
  },
};
