import { getSeriesColor } from '../../utils/chartTheme.js';

export const CAREER_WIDGET_URI = 'ui://darko/career-chart/v3.html';

// Only image URLs, specs and compact summaries cross the bridge; histories stay on the server.
export function careerWidgetHtml(origin, themeTokens = '') {
  const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
  const palettes = Object.fromEntries(['modern', 'shiny'].map((display) => [display, Array.from({ length: 12 }, (_, i) => getSeriesColor(i, display))]));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{${themeTokens}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px system-ui;line-height:1.45}button,input,select{font:inherit;color:inherit}button,a,input,select{touch-action:manipulation}button{cursor:pointer;border:1px solid var(--border);background:var(--bg);border-radius:6px;padding:7px 11px}button:hover{background:var(--bg-hover)}button:disabled{cursor:wait;opacity:.55}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.btn-primary{background:var(--accent);border-color:var(--accent);color:var(--bg)}.btn-primary:hover{background:var(--accent-hover)}input,select{border:1px solid var(--border);background:var(--bg);border-radius:6px;padding:7px 9px;min-width:0;width:100%}input[type=checkbox]{width:auto;accent-color:var(--accent)}label{display:grid;gap:4px;font-size:12px;color:var(--text-muted)}label>input,label>select{font-size:14px;color:var(--text)}[hidden]{display:none!important}fieldset{border:0;padding:0;margin:0;min-width:0}figure{margin:0}img{display:block;width:100%;height:auto;background:var(--bg)}.controls{padding:12px;border-bottom:1px solid var(--border-subtle)}.players,.presets,.search-row,.links,.checks{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.players{margin-bottom:10px}.player-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--border-subtle);border-radius:20px;padding:3px 5px 3px 10px;font-size:13px}.swatch{width:9px;height:9px;border-radius:50%;background:var(--player-color);flex:none}.remove-player{border:0;border-radius:50%;padding:1px 7px;font-size:17px;line-height:1.4}.search-row input{flex:1;min-width:140px}.fields{display:grid;grid-template-columns:1.2fr 1fr .7fr .7fr auto;gap:8px;align-items:end;margin:12px 0 9px}.presets button{font-size:12px;padding:5px 8px}.candidates{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.candidates:empty{display:none}details{margin-top:12px}summary{cursor:pointer;color:var(--text-muted);font-size:12px}.options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.span-two{grid-column:span 2}.checks{grid-column:1/-1;gap:14px}.checks label{display:flex;gap:5px;align-items:center}.cohort-row{display:flex;gap:8px;align-items:end;grid-column:1/-1}.cohort-row label{flex:1}.help{font-size:12px;color:var(--text-muted);margin:6px 0 0}.status{font-size:12px;color:var(--text-muted);padding:8px 12px;margin:0}.status.error{color:var(--negative)}.links{padding:8px 12px 12px;border-bottom:1px solid var(--border-subtle);gap:16px}a{color:var(--accent);font-size:13px}.comparison{padding:12px}.comparison-heading{font-size:13px;font-weight:600;margin:0 0 8px}.comparison-list{list-style:none;margin:0;padding:0}.comparison-list li{display:grid;grid-template-columns:minmax(125px,1.2fr) 3fr;gap:10px;padding:8px 0;border-top:1px solid var(--border-subtle);align-items:start}.comparison-name{display:flex;gap:7px;align-items:center;font-size:13px;font-weight:500;overflow-wrap:anywhere}.comparison-list dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0}.comparison-list dt{font-size:11px;color:var(--text-muted)}.comparison-list dd{margin:2px 0 0;font-variant-numeric:tabular-nums;font-size:15px}.comparison-list small{display:block;font-size:11px;color:var(--text-muted)}.import-row{display:flex;gap:8px;margin-top:10px}.import-row input{flex:1}.import-panel{padding:0 12px 12px} @media(max-width:500px){.fields{grid-template-columns:repeat(2,minmax(0,1fr))}.fields .btn-primary{grid-column:1/-1}.options{grid-template-columns:repeat(2,minmax(0,1fr))}.cohort-row{align-items:stretch;flex-direction:column}.comparison-list li{grid-template-columns:1fr;gap:5px}.comparison-list dl{gap:6px}.controls,.comparison{padding:10px}.links{gap:10px}.search-row button{white-space:nowrap}}
</style></head><body>
<section class="controls" id="controls" hidden aria-label="Edit career chart"><fieldset id="edit-fields">
<div id="players" class="players" aria-label="Selected players"></div>
<form id="search-form" class="search-row"><input id="player-query" aria-label="Player name" placeholder="Add a player by name" maxlength="80" minlength="2" required><button type="submit">Add player</button></form><div id="candidates" class="candidates" aria-label="Choose a player"></div>
<form id="chart-form"><div class="fields">
<label>Metric<select id="metric"><option value="dpm">DPM</option><option value="o_dpm">Offensive DPM</option><option value="d_dpm">Defensive DPM</option></select></label>
<label>Compare by<select id="scale"><option value="games">Games played</option><option value="age">Age</option><option value="seasons">Season</option></select></label>
<label><span id="min-label">From game</span><input id="min" type="number" step="any" placeholder="First"></label>
<label><span id="max-label">To game</span><input id="max" type="number" step="any" placeholder="Last"></label><button class="btn-primary" type="submit">Update chart</button></div>
<div class="presets" aria-label="Range presets"><button type="button" data-preset="full">Full career</button><button type="button" data-preset="200">First 200 games</button><button type="button" data-preset="ages">Ages 19–25</button><button type="button" data-preset="recent">Last 3 seasons</button></div>
<details><summary>Title, export, annotations &amp; DARKO comps</summary><div class="options">
<label class="span-two">Chart title<input id="title" maxlength="100" placeholder="Automatic title"></label>
<label>Export shape<select id="format"><option value="wide">Wide · 1200 × 650</option><option value="square">Square · 1200 × 1200</option></select></label>
<label>Selected axis value<input id="at" type="number" step="any" placeholder="Age or game number"></label>
<label>Since date<input id="from" type="date"></label><label>Through date<input id="to" type="date"></label>
<label>Minimum DPM<input id="ymin" type="number" step="any" placeholder="Automatic"></label><label>Maximum DPM<input id="ymax" type="number" step="any" placeholder="Automatic"></label>
<label>Style<select id="display"><option value="modern">Modern · white</option><option value="shiny">Shiny · white</option></select></label>
<div class="checks"><label><input id="points" type="checkbox">Raw points</label><label><input id="smooth" type="checkbox">Smoothed curve</label><label><input id="annotate-peak" type="checkbox">Mark peaks</label><label><input id="annotate-latest" type="checkbox">Mark last in range</label><label><input id="annotate-selected" type="checkbox">Mark selected value</label></div>
<div class="cohort-row"><label>Compare a player with published DARKO comps<select id="anchor"></select></label><button id="cohort" type="button">Use DARKO comps</button></div>
<p class="help checks" id="cohort-note">Replaces this comparison with the anchor and up to five distinct historical comps at their matching age.</p>
</div></details></form></fieldset></section>
<figure><img id="chart" hidden alt="DARKO career trajectories"><figcaption id="status" class="status" role="status">Preparing career chart…</figcaption></figure>
<nav class="links"><a id="download" hidden target="_blank" rel="noopener">Download 2x PNG</a><a id="source" hidden target="_blank" rel="noopener">Open on darko.app</a></nav>
<section id="comparison" class="comparison" hidden aria-label="Comparison summary"><h2 class="comparison-heading" id="comparison-heading">Compare ratings</h2><ul id="comparison-list" class="comparison-list"></ul><p class="help">Latest available can be outside the range. Peaks use raw observations in the range. Selected values use the nearest observation inside coverage, never a projection.</p></section>
<details class="import-panel"><summary>Reopen an existing DARKO chart</summary><form id="import-form" class="import-row"><input id="import-url" type="url" maxlength="4096" aria-label="DARKO chart URL" placeholder="Paste a DARKO chart link" required><button type="submit">Reopen</button></form></details>
<script>(${careerWidgetClient.toString()})(${safeJson(origin)},${safeJson(palettes)});</script></body></html>`;
}

function careerWidgetClient(allowedOrigin, palettes) {
  const el = (id) => document.getElementById(id);
  const pending = new Map(); let nextId = 1, data = null, cohortContext = null, busy = false, lastHeight = 0;
  const defaultCohortNote = el('cohort-note').textContent;
  function notify(method, params) { window.parent.postMessage({ jsonrpc: '2.0', method, params }, '*'); }
  function request(method, params) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('The assistant did not respond. Please retry.')); }, method === 'tools/call' ? 90000 : 5000);
      pending.set(id, { resolve, reject, timer });
      window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
    });
  }
  function size() { const height = Math.ceil(document.body.getBoundingClientRect().height); if (height !== lastHeight) { lastHeight = height; notify('ui/notifications/size-changed', { height }); } }
  function status(message, error = false) { el('status').textContent = message; el('status').classList.toggle('error', error); size(); }
  function safeUrl(value) { try { const url = new URL(value); return url.origin === allowedOrigin ? url.href : null; } catch { return null; } }
  function setBusy(value) { busy = value; el('edit-fields').disabled = value; for (const node of el('import-form').elements) node.disabled = value; el('controls').setAttribute('aria-busy', String(value)); }
  async function call(name, args) {
    const result = await request('tools/call', { name, arguments: args });
    if (result?.isError) throw new Error(result.content?.find((part) => part.type === 'text')?.text || 'DARKO data unavailable.');
    return result;
  }
  function number(id) { const value = el(id).value; return value === '' ? null : Number(value); }
  function formSpec() {
    if (!data) throw new Error('Open a chart before editing.');
    const spec = { ...data.specification };
    for (const id of ['metric', 'scale', 'display', 'format', 'title']) spec[id] = el(id).value;
    for (const id of ['min', 'max', 'ymin', 'ymax', 'at']) spec[id] = number(id);
    for (const id of ['from', 'to']) spec[id] = el(id).value || null;
    for (const id of ['points', 'smooth']) spec[id] = el(id).checked;
    spec.annotations = ['peak', 'latest', 'selected'].filter((kind) => el('annotate-' + kind).checked);
    return spec;
  }
  function withPlayers(spec, ids) {
    const oldColors = new Map(spec.ids.map((id, i) => [id, spec.colors[i]]));
    const used = new Set(ids.map((id) => oldColors.get(id)).filter(Boolean));
    const colors = ids.map((id) => {
      if (oldColors.get(id)) return oldColors.get(id);
      const color = palettes[spec.display].find((candidate) => !used.has(candidate)); used.add(color); return color;
    });
    return { ...spec, ids, colors };
  }
  async function operation(work) {
    if (busy) return;
    setBusy(true); status('Updating DARKO…');
    try { await work(); } catch (error) { status(error.message || 'Unable to update this chart.', true); }
    finally { setBusy(false); size(); }
  }
  async function update(spec) {
    const result = await call('create_career_chart', spec); render(result);
    request('ui/update-model-context', { content: [{ type: 'text', text: 'DARKO chart edited in the widget. For every conversational edit, call create_career_chart to render a fresh widget using this current specification plus the requested changes. Do not construct chart URLs manually or reply with links alone; that leaves the displayed widget unchanged. Current specification: ' + JSON.stringify(data.specification) + '\nComparison: ' + JSON.stringify(data.comparison) + (cohortContext ? '\nPublished cohort basis: ' + JSON.stringify(cohortContext) : '') }] }).catch(() => {});
  }
  function node(tag, text, className) { const n = document.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n; }
  function axisLabels() { const unit = el('scale').value === 'age' ? 'age' : el('scale').value === 'seasons' ? 'season' : 'game'; el('min-label').textContent = 'From ' + unit; el('max-label').textContent = 'To ' + unit; }
  function render(result) {
    if (result?.isError) { status(result.content?.[0]?.text || 'Chart unavailable.', true); return; }
    const next = result?.structuredContent, image = safeUrl(next?.image_url);
    if (!image || !next?.specification) return;
    data = next;
    const spec = data.specification;
    if (cohortContext && (!spec.ids.includes(cohortContext.anchor_id) || !spec.ids.every((id) => cohortContext.ids.includes(id)))) cohortContext = null;
    el('cohort-note').textContent = cohortContext ? cohortContext.basis + ' Matched age: ' + (cohortContext.matched_age?.toFixed(1) ?? 'unavailable') + ' · Comps as of ' + (cohortContext.as_of || 'unavailable') + '.' : defaultCohortNote;
    for (const id of ['metric', 'scale', 'display', 'format', 'title', 'min', 'max', 'ymin', 'ymax', 'at', 'from', 'to']) el(id).value = spec[id] ?? '';
    for (const id of ['points', 'smooth']) el(id).checked = spec[id];
    for (const kind of ['peak', 'latest', 'selected']) el('annotate-' + kind).checked = spec.annotations?.includes(kind) || false;
    axisLabels(); el('controls').hidden = false;
    el('players').replaceChildren(); el('anchor').replaceChildren();
    for (const player of data.coverage || []) {
      const chip = node('span', null, 'player-chip'); chip.style.setProperty('--player-color', player.color);
      chip.append(node('span', null, 'swatch'), node('span', player.player_name));
      const remove = node('button', '×', 'remove-player'); remove.type = 'button'; remove.setAttribute('aria-label', 'Remove ' + player.player_name); remove.disabled = spec.ids.length <= 1;
      remove.addEventListener('click', () => operation(async () => { const current = formSpec(); await update(withPlayers(current, current.ids.filter((id) => id !== player.nba_id))); }));
      chip.append(remove); el('players').append(chip);
      const option = node('option', player.player_name); option.value = player.nba_id; el('anchor').append(option);
    }
    const img = el('chart'); img.src = image; img.alt = (data.coverage || []).map((p) => p.player_name).join(', ') + ' · DARKO career chart'; img.hidden = false;
    status('Pregame estimates · Games incorporated through ' + (data.dataset_as_of || 'unavailable') + (data.limitations?.length ? ' · ' + data.limitations.join(' ') : ''));
    for (const [id, key] of [['download', 'download_url'], ['source', 'source_url']]) { const link = el(id), url = safeUrl(data[key]); link.hidden = !url; if (url) link.href = url; }
    el('comparison-list').replaceChildren(); el('comparison').hidden = !data.comparison?.length;
    el('comparison-heading').textContent = 'Compare ' + ({ dpm: 'DPM', o_dpm: 'offensive DPM', d_dpm: 'defensive DPM' }[spec.metric]) + ' · points / 100 possessions';
    for (const player of data.comparison || []) {
      const row = node('li'), name = node('div', null, 'comparison-name'); name.style.setProperty('--player-color', player.color); name.append(node('span', null, 'swatch'), node('span', player.player_name));
      const dl = node('dl');
      const selected = spec.at == null ? ['Last in range', player.latest_in_range] : ['At ' + spec.at + ' · nearest', player.selected.observed];
      for (const [label, point] of [['Latest available', player.latest_available], ['Peak in range', player.peak_in_range], selected]) {
        const item = node('div'); item.append(node('dt', label));
        const dd = node('dd', point ? (point.value >= 0 ? '+' : '') + point.value.toFixed(2) : 'Unavailable');
        if (point) dd.append(node('small', point.date + (point.x == null ? '' : ' · ' + Number(point.x.toFixed(2)))));
        item.append(dd); dl.append(item);
      }
      row.append(name, dl); el('comparison-list').append(row);
    }
    size();
  }
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const msg = event.data; if (!msg || msg.jsonrpc !== '2.0') return;
    if (msg.id !== undefined && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); clearTimeout(p.timer); msg.error ? p.reject(new Error(msg.error.message || 'Assistant unavailable.')) : p.resolve(msg.result); }
    else if (msg.method === 'ui/notifications/tool-result') render(msg.params);
  });
  el('chart-form').addEventListener('submit', (event) => { event.preventDefault(); operation(() => update(formSpec())); });
  el('scale').addEventListener('change', () => { el('min').value = ''; el('max').value = ''; el('at').value = ''; el('annotate-selected').checked = false; axisLabels(); });
  for (const button of document.querySelectorAll('[data-preset]')) button.addEventListener('click', () => operation(async () => {
    const spec = { ...formSpec(), min: null, max: null, from: null, to: null, at: null }; spec.annotations = spec.annotations.filter((kind) => kind !== 'selected');
    if (button.dataset.preset === '200') { spec.scale = 'games'; spec.max = 200; }
    if (button.dataset.preset === 'ages') { spec.scale = 'age'; spec.min = 19; spec.max = 25; }
    if (button.dataset.preset === 'recent') { const date = data.dataset_as_of; if (!date) throw new Error('The dataset date is unavailable.'); const year = Number(date.slice(0, 4)) - (Number(date.slice(5, 7)) < 7 ? 1 : 0); spec.scale = 'seasons'; spec.min = year - 2; spec.max = year; }
    await update(spec);
  }));
  async function addPlayer(player) {
    const spec = formSpec(); if (spec.ids.includes(player.nba_id)) throw new Error(player.player_name + ' is already selected.');
    if (spec.ids.length >= 6) throw new Error('Remove a player first; charts support up to six.');
    await update(withPlayers(spec, [...spec.ids, player.nba_id])); el('candidates').replaceChildren(); el('player-query').value = '';
  }
  el('search-form').addEventListener('submit', (event) => { event.preventDefault(); operation(async () => {
    if (data.specification.ids.length >= 6) throw new Error('Remove a player first; charts support up to six.');
    const result = await call('search_players', { queries: [el('player-query').value.trim()] });
    const candidates = result.structuredContent?.matches?.[0]?.candidates || []; el('candidates').replaceChildren();
    if (candidates.length === 1) return addPlayer(candidates[0]);
    if (!candidates.length) throw new Error('No player matched that name. Try a fuller name.');
    for (const player of candidates) { const button = node('button', player.player_name + ' · ' + player.nba_id); button.type = 'button'; button.addEventListener('click', () => operation(() => addPlayer(player))); el('candidates').append(button); }
    status('Choose the intended player below the search box.');
  }); });
  el('cohort').addEventListener('click', () => operation(async () => {
    const result = await call('get_comparison_cohort', { id: Number(el('anchor').value) }); const cohort = result.structuredContent;
    if (!cohort.available) throw new Error(cohort.limitation);
    cohortContext = cohort;
    const spec = formSpec(); await update(withPlayers({ ...spec, scale: 'age', min: null, max: null, from: null, to: null, at: null, annotations: spec.annotations.filter((kind) => kind !== 'selected') }, cohort.ids));
    el('cohort-note').textContent = cohort.basis + ' Matched age: ' + (cohort.matched_age?.toFixed(1) ?? 'unavailable') + ' · Comps as of ' + (cohort.as_of || 'unavailable') + '.';
  }));
  el('import-form').addEventListener('submit', (event) => { event.preventDefault(); operation(async () => { const result = await call('import_career_chart', { url: el('import-url').value }); cohortContext = null; render(result); request('ui/update-model-context', { content: [{ type: 'text', text: 'Reopened DARKO chart. For every conversational edit, call create_career_chart with this specification plus the requested changes to render a fresh widget. Do not construct chart URLs manually or reply with links alone. Current specification: ' + JSON.stringify(data.specification) }] }).catch(() => {}); }); });
  for (const id of ['download', 'source']) el(id).addEventListener('click', (event) => { event.preventDefault(); request('ui/open-link', { url: event.currentTarget.href }).catch(() => status('Use the image or download link in the assistant response.', true)); });
  el('chart').addEventListener('load', size); el('chart').addEventListener('error', () => status('Image unavailable. Use the link in the assistant response.', true));
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(size).observe(document.body);
  request('ui/initialize', { appInfo: { name: 'DARKO career chart', version: '1.1.0' }, appCapabilities: {}, protocolVersion: '2026-01-26' }).then(() => notify('ui/notifications/initialized', {})).catch(() => {});
}
