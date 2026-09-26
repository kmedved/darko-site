/* ---------- router & boot ---------- */
let CURRENT = null;
const SIMPLE_ROUTES = new Set(['players', 'teams', 'fantasy', 'rewind', 'darkodle', 'new']);
function parseRoute() {
  const h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  let m;
  if (!h || h === 'today') return { name: 'today' };
  if ((m = h.match(/^p(\d+)(?:-vs-(\d+))?(?:-(seismo|comps|skills|contract|career))?$/))) return { name: 'player', id: Number(m[1]), vs: m[2] ? Number(m[2]) : null, section: m[3] || null };
  if ((m = h.match(/^t-([A-Za-z]{3})$/))) return { name: 'team', abbr: m[1].toUpperCase() };
  if ((m = h.match(/^card(?:-(\d+))?$/))) return { name: 'card', id: m[1] ? Number(m[1]) : null };
  if ((m = h.match(/^lab(?:-([A-Za-z]{3}))?$/))) return { name: 'lab', abbr: m[1] ? m[1].toUpperCase() : null };
  if (SIMPLE_ROUTES.has(h)) return { name: h };
  return { name: 'today' };
}
const NAV_FOR = { today: 'today', players: 'players', player: 'players', teams: 'teams', team: 'teams', lab: 'lab', fantasy: 'fantasy', rewind: 'rewind', darkodle: 'darkodle', new: 'new', card: 'new' };
function render(opts = {}) {
  const route = parseRoute();
  const view = VIEWS[route.name] || VIEWS.today;
  if (CURRENT && CURRENT.view.unmount) CURRENT.view.unmount();
  CHARTS = [];
  TIP.hide();
  const main = document.getElementById('main');
  main.innerHTML = view.html(route);
  CURRENT = { route, view };
  if (view.mount) view.mount(route);
  drawCharts();
  const navKey = NAV_FOR[route.name];
  $$('#nav a').forEach((a) => { if (a.getAttribute('href') === `#${navKey}`) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.title = `${view.title(route)} · DARKO`;
  if (!opts.keepScroll && !route.section) window.scrollTo(0, 0);
}

/* theme: system → light → dark */
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
  const b = document.getElementById('themeBtn');
  if (b) { b.innerHTML = t === 'light' ? ICON.sun : t === 'dark' ? ICON.moon : ICON.auto; b.setAttribute('aria-label', `Theme: ${t}. Click to change.`); b.title = `Theme: ${t}`; }
}

function boot() {
  let theme = store.get('theme', 'system');
  applyTheme(theme);
  document.getElementById('themeBtn').addEventListener('click', () => {
    theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    store.set('theme', theme); applyTheme(theme);
  });
  initFloor();
  initAsk();
  document.addEventListener('click', (ev) => {
    const star = ev.target.closest('[data-star]');
    if (star) { ev.preventDefault(); ev.stopPropagation(); toggleWatch(star.dataset.star); return; }
    if (ev.target.closest('[data-latest]')) { setAsOf(LATEST); return; }
    const cmp = ev.target.closest('[data-compare]');
    if (cmp) { openAsk(`${P.name(Number(cmp.dataset.compare))} vs `); return; }
    const tt = ev.target.closest('[data-tt]');
    if (tt) {
      const el = document.getElementById(tt.dataset.tt);
      if (el) { el.hidden = !el.hidden; tt.setAttribute('aria-expanded', String(!el.hidden)); tt.textContent = el.hidden ? tt.textContent.replace('Hide', 'Show') : tt.textContent.replace('Show', 'Hide'); }
      return;
    }
    const sc = ev.target.closest('[data-scroll]');
    if (sc) { const s = document.getElementById(`sec-${sc.dataset.scroll}`); if (s) s.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); return; }
    const row = ev.target.closest('[data-href]');
    if (row && !ev.target.closest('a,button,input,select,label')) { location.hash = row.dataset.href; }
  });
  window.addEventListener('hashchange', () => render());
  const ro = new ResizeObserver(debounce(() => drawCharts(), 90));
  ro.observe(document.getElementById('main'));
  window.addEventListener('resize', debounce(drawFloor, 90));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawFloor(); drawCharts(); });
  render();
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('downloads').then((d) => {
      DOWNLOADS = d || null;
      if (DOWNLOADS) ['fxCsv', 'cardSave'].forEach((id) => { const b = document.getElementById(id); if (b) b.hidden = false; });
    }).catch(() => {});
  }
}
boot();
