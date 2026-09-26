/* ---------- the floor: a global time scrubber from 1996-97 to today ---------- */
const FLOOR = { x: null, w: 0, h: 0, dragging: false };
const FLOOR_DOMAIN = [toDate('1996-10-15'), toDate('2026-08-10')];
const FLOOR_TRACE = FRAMES.map((f, i) => ({ t: toDate(f), v: FRAME_TOP[i] && FRAME_TOP[i][0] ? FRAME_TOP[i][0][1] / 100 : null }));
/* inside the current season, trace the daily league-best DPM instead of weekly frames */
const FLOOR_TRACE_ALL = (() => {
  const hi = new Float32Array(DAYS.length).fill(-99);
  for (const id in HIST) {
    const h = HIST[id]; let k = 0; let cur = null;
    for (let di = 0; di <= LAST_GAME_DI; di++) {
      while (k < h.length && h[k][0] <= di) { cur = h[k][1] / 100; k++; }
      if (cur != null && cur > hi[di]) hi[di] = cur;
    }
  }
  const daily = [];
  for (let di = 0; di <= LAST_GAME_DI; di += 2) daily.push({ t: toDate(DAYS[di]), v: hi[di] });
  return [...FLOOR_TRACE.filter((p) => p.t < toDate(DAYS[0])), ...daily];
})();

function snapIso(dt) {
  const iso = isoOf(dt);
  if (iso >= DAYS[0]) return DAYS[Math.max(0, dayIndexFor(iso))];
  let k = frameIndexFor(iso);
  const next = FRAMES[k + 1];
  if (next && next < DAYS[0] && daysBetween(iso, next) < daysBetween(FRAMES[k], iso)) k += 1;
  if (next && next >= DAYS[0] && daysBetween(iso, DAYS[0]) < daysBetween(FRAMES[k], iso)) return DAYS[0];
  return FRAMES[k];
}

function drawFloor() {
  const svg = document.getElementById('floorSvg');
  if (!svg) return;
  const w = svg.clientWidth; const h = svg.clientHeight;
  if (!w || !h) return;
  FLOOR.w = w; FLOOR.h = h;
  const brk = toDate(addDays(DAYS[0], -30));
  const split = Math.round(w * (w < 560 ? 0.62 : 0.74));
  const x = d3.scaleUtc().domain([FLOOR_DOMAIN[0], brk, FLOOR_DOMAIN[1]]).range([6, split, w - 6]);
  FLOOR.x = x;
  const y = d3.scaleLinear().domain([2, 10]).range([h - 12, 6]);
  let seasons = '';
  let labels = '';
  const narrow = w < 560;
  for (const s of SEASONS) {
    const r = META.reg[s];
    if (!r) continue;
    const x0 = x(toDate(r[0])); const x1 = x(toDate(r[1]));
    seasons += `<rect class="fl-season${s === SEASON ? ' cur' : ''}" x="${x0.toFixed(1)}" y="${h - 8}" width="${Math.max(1, x1 - x0).toFixed(1)}" height="5" rx="1"/>`;
    const every = narrow ? 10 : 5;
    if ((s - 1) % every === 0 && s < SEASON - 2 && x0 < split - 34) labels += `<text class="fl-text" x="${(x0 + 1).toFixed(1)}" y="11">${s - 1}</text>`;
  }
  labels += `<line class="fl-tick" x1="${split}" x2="${split}" y1="3" y2="${h - 3}"/>`;
  labels += `<text class="fl-text" x="${split + 4}" y="11">${seasonLabel(SEASON)}</text>`;
  const months = d3.utcMonth.range(d3.utcMonth.ceil(toDate(DAYS[0])), FLOOR_DOMAIN[1]);
  const mw = (w - 6 - split) / Math.max(months.length, 1);
  for (const mo of months) {
    const mx = x(mo);
    labels += `<line class="fl-tick" x1="${mx.toFixed(1)}" x2="${mx.toFixed(1)}" y1="${h - 13}" y2="${h - 9}"/>`;
    if (mw >= 22 && mx > split + 52) labels += `<text class="fl-text" x="${(mx + 2).toFixed(1)}" y="11">${d3.utcFormat('%b')(mo)}</text>`;
  }
  let d = ''; let prev = null;
  for (const p of FLOOR_TRACE_ALL) {
    if (p.v == null) continue;
    d += `${!prev ? 'M' : 'L'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`;
    prev = p;
  }
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.innerHTML = `<title>Time machine. The line traces the league's top DPM each week since 1996-97.</title>${seasons}${labels}<path class="fl-trace" d="${d}"/>
    <g id="flHandle"><line class="fl-handle" x1="0" x2="0" y1="2" y2="${h - 2}"/><circle class="fl-knob" cx="0" cy="${h - 5.5}" r="5.5"/></g>`;
  updateFloorHandle();
}
function updateFloorHandle() {
  const g = document.getElementById('flHandle');
  if (g && FLOOR.x) g.setAttribute('transform', `translate(${FLOOR.x(toDate(STATE.asOf)).toFixed(1)},0)`);
  const svg = document.getElementById('floorSvg');
  if (svg) {
    svg.setAttribute('aria-valuetext', dateStr(STATE.asOf));
    svg.setAttribute('aria-valuenow', String(Math.round(toDate(STATE.asOf).getTime() / 864e5)));
  }
  const lbl = document.getElementById('floorDate');
  if (lbl) lbl.innerHTML = `${esc(dateStr(STATE.asOf))}${isLatest() ? '<span class="lt"> · latest</span>' : ''}`;
  const back = document.getElementById('floorLatest');
  if (back) back.hidden = isLatest();
  document.body.classList.toggle('rewound', !isLatest());
}

let datedRaf = 0;
function setAsOf(iso) {
  if (!iso || iso === STATE.asOf) return;
  STATE.asOf = iso;
  updateFloorHandle();
  if (datedRaf) return;
  datedRaf = requestAnimationFrame(() => {
    datedRaf = 0;
    if (!CURRENT) return;
    if (CURRENT.view.onAsOf) CURRENT.view.onAsOf();
    else if (CURRENT.view.dated) render({ keepScroll: true });
  });
}
function stepDate(dir, big) {
  const iso = STATE.asOf;
  if (big) {
    const s = seasonOfDate(iso) + dir;
    if (s >= SEASON) return setAsOf(s === SEASON && dir < 0 ? DAYS[0] : LATEST);
    if (s < FIRST_SEASON) return undefined;
    return setAsOf(FRAMES[frameIndexFor(META.reg[s][1])]);
  }
  if (iso >= DAYS[0]) {
    const di = dayIndexFor(iso) + dir;
    if (di < 0) return setAsOf(FRAMES[frameIndexFor(addDays(DAYS[0], -1))]);
    if (di > LAST_DI) return undefined;
    return setAsOf(DAYS[di]);
  }
  const fi = frameIndexFor(iso) + dir;
  if (fi < 0) return undefined;
  if (fi >= FRAMES.length || FRAMES[fi] >= DAYS[0]) return setAsOf(DAYS[0]);
  return setAsOf(FRAMES[fi]);
}
function initFloor() {
  const svg = document.getElementById('floorSvg');
  const pick = (ev) => {
    if (!FLOOR.x) return;
    const r = svg.getBoundingClientRect();
    const t = FLOOR.x.invert(clamp(ev.clientX - r.left, 0, r.width));
    setAsOf(snapIso(t));
  };
  svg.addEventListener('pointerdown', (ev) => { FLOOR.dragging = true; svg.setPointerCapture(ev.pointerId); pick(ev); });
  svg.addEventListener('pointermove', (ev) => {
    if (FLOOR.dragging) { pick(ev); return; }
    if (!FLOOR.x) return;
    const r = svg.getBoundingClientRect();
    const iso = snapIso(FLOOR.x.invert(clamp(ev.clientX - r.left, 0, r.width)));
    const s = seasonOfDate(iso);
    TIP.show(`${ttHead(seasonLabel(s))}<div>${esc(dateStr(iso))}</div><div class="muted" style="font-size:11.5px;margin-top:3px">Click or drag to rewind the site</div>`, ev.clientX, ev.clientY + 18);
  });
  svg.addEventListener('pointerleave', () => TIP.hide());
  const end = () => { FLOOR.dragging = false; };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('keydown', (ev) => {
    const k = ev.key;
    if (k === 'ArrowLeft' || k === 'ArrowDown') { stepDate(-1, ev.shiftKey); ev.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'ArrowUp') { stepDate(1, ev.shiftKey); ev.preventDefault(); }
    else if (k === 'PageDown') { stepDate(-1, true); ev.preventDefault(); }
    else if (k === 'PageUp') { stepDate(1, true); ev.preventDefault(); }
    else if (k === 'Home') { setAsOf(FRAMES[0]); ev.preventDefault(); }
    else if (k === 'End') { setAsOf(LATEST); ev.preventDefault(); }
  });
  document.getElementById('floorLatest').addEventListener('click', () => setAsOf(LATEST));
  drawFloor();
}
