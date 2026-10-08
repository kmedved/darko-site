import { extent, scaleLinear, line, curveMonotoneX } from 'd3';
import { getChartTheme } from '../../utils/chartTheme.js';

export function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
}

export function chartPalette(css) {
  const root = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] || '';
  // PNG exports use the site's white theme independently of the chart style.
  const light = css.match(/:root\[data-theme='white'\]\s*\{([\s\S]*?)\}/)?.[1] || '';
  const values = {};
  for (const match of (root + '\n' + light).matchAll(/(--[\w-]+)\s*:\s*(#[\da-fA-F]{3,8})\s*;/g)) values[match[1]] = match[2];
  return { bg: values['--bg'], text: values['--text'], muted: values['--text-muted'], grid: values['--border-subtle'], border: values['--border'] };
}

const METRIC_LABELS = { dpm: 'DARKO DPM', o_dpm: 'Offensive DPM', d_dpm: 'Defensive DPM' };

/** DOM-free rendition of the site's raw-point/LOESS comparison chart. */
export function renderCareerSvg(spec, series, metadata, palette) {
  const theme = getChartTheme(spec.display);
  const width = 1200, height = spec.format === 'square' ? 1200 : 650;
  const legend = [];
  let legendX = 0, legendRow = 0;
  for (const player of series) {
    const itemWidth = player.player_name.length * 8 + 45;
    if (legendX + itemWidth > width - 100) { legendRow += 1; legendX = 0; }
    legend.push({ player, x: legendX + 60, y: 80 + legendRow * 25 });
    legendX += itemWidth;
  }
  const margin = { top: 108 + legendRow * 25, right: spec.annotations?.length ? 255 : 30, bottom: 108, left: 85 };
  const w = width - margin.left - margin.right, h = height - margin.top - margin.bottom;
  const points = series.flatMap((player) => player.points);
  let [xLow, xHigh] = extent(points, (point) => point.x);
  if (xLow === xHigh) { xLow -= 0.5; xHigh += 0.5; }
  const yPoints = [...points, ...series.flatMap((player) => player.smoothed?.points || [])];
  const [minY, maxY] = extent(yPoints, (point) => point.y);
  const pad = Math.max((maxY - minY) * 0.1, 0.5);
  const yLow = spec.ymin ?? minY - pad, yHigh = spec.ymax ?? maxY + pad;
  const x = scaleLinear().domain([xLow, xHigh]).range([0, w]);
  const y = scaleLinear().domain([yLow, yHigh]).range([h, 0]);
  const text = (xx, yy, value, size = 14, anchor = 'middle', fill = palette.text) =>
    `<text x="${xx}" y="${yy}" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${escapeXml(value)}</text>`;
  const path = line().x((point) => x(point.x)).y((point) => y(point.y)).curve(curveMonotoneX);
  const title = spec.title || `${METRIC_LABELS[spec.metric]} · Career trajectories`;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-desc" font-family="Archivo">`,
    `<title id="chart-title">${escapeXml(title)}</title>`,
    `<desc id="chart-desc">${escapeXml(series.map((player) => player.player_name).join(', '))}. ${escapeXml(metadata.history_note)}</desc>`,
    `<rect width="${width}" height="${height}" fill="${palette.bg}"/>`,
    text(width / 2, 38, title, Math.min(25, (width - 120) / Math.max(1, title.length * 0.58)))
  ];
  for (const { player, x: xx, y: yy } of legend) {
    out.push(`<line x1="${xx}" y1="${yy - 5}" x2="${xx + 22}" y2="${yy - 5}" stroke="${player.color}" stroke-width="3"/>`);
    out.push(text(xx + 30, yy, player.player_name, 14, 'start'));
  }
  out.push(`<g transform="translate(${margin.left},${margin.top})">`);
  for (const tick of y.ticks(8)) {
    out.push(`<line x2="${w}" y1="${y(tick)}" y2="${y(tick)}" stroke="${palette.grid}"/>`);
    out.push(text(-12, y(tick) + 5, tick.toFixed(1), 14, 'end', palette.muted));
  }
  const axisColor = theme.axisColor.startsWith('var(') ? palette.border : theme.axisColor;
  out.push(`<path d="M0,0V${h}H${w}" fill="none" stroke="${axisColor}"/>`);
  if (theme.plotBorder) out.push(`<rect width="${w}" height="${h}" fill="none" stroke="${theme.plotBorderColor}"/>`);
  if (yLow <= 0 && yHigh >= 0) out.push(`<line x2="${w}" y1="${y(0)}" y2="${y(0)}" stroke="${palette.text}" stroke-width="${theme.zeroWidth}" stroke-dasharray="${theme.zeroDash || ''}"/>`);
  for (const tick of x.ticks(spec.scale === 'age' ? 12 : 8)) {
    if (spec.scale !== 'age' && !Number.isInteger(tick)) continue;
    out.push(`<line x1="${x(tick)}" x2="${x(tick)}" y1="${h}" y2="${h + 6}" stroke="${axisColor}"/>`);
    out.push(text(x(tick), h + 25, spec.scale === 'seasons' ? String(tick) : String(+tick.toFixed(1)), 14, 'middle', palette.muted));
  }
  out.push(`<defs><clipPath id="plot-clip"><rect width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#plot-clip)">`);
  for (const player of series) {
    if (spec.points) for (const point of player.points) out.push(`<circle cx="${x(point.x).toFixed(2)}" cy="${y(point.y).toFixed(2)}" r="${theme.pointRadius}" fill="${player.color}" opacity="${theme.pointOpacity}"/>`);
    const curve = player.smoothed?.points || player.points;
    if (curve.length > 1) out.push(`<path d="${path(curve)}" fill="none" stroke="${player.color}" stroke-width="${theme.lineWidth}" stroke-linecap="round"/>`);
  }
  out.push('</g>');
  // Annotation labels occupy their own column; their leaders point to raw observations.
  const labels = [];
  for (const summary of metadata.comparison || []) {
    for (const kind of spec.annotations || []) {
      const point = kind === 'peak' ? summary.peak_in_range : kind === 'latest' ? summary.latest_in_range : summary.selected.observed;
      if (!point || point.value < yLow || point.value > yHigh) continue;
      const kindLabel = kind === 'peak' ? 'Peak' : kind === 'latest' ? 'Last' : '@ ' + Number(point.x.toFixed(2));
      labels.push({ point, color: summary.color, label: summary.player_name + ' · ' + kindLabel + ' ' + point.value.toFixed(2), desired: y(point.value) });
    }
  }
  labels.sort((a, b) => a.desired - b.desired);
  let previous = -12;
  for (const item of labels) { item.yy = Math.max(12, item.desired, previous + 21); previous = item.yy; }
  for (let i = labels.length - 1; i >= 0; i--) labels[i].yy = Math.min(labels[i].yy, h - 8 - (labels.length - 1 - i) * 21);
  for (const item of labels) {
    out.push(`<path d="M${x(item.point.x)},${y(item.point.value)}L${w + 9},${item.yy}H${w + 17}" fill="none" stroke="${item.color}" opacity="0.55"/>`);
    out.push(`<circle cx="${x(item.point.x)}" cy="${y(item.point.value)}" r="4" fill="${palette.bg}" stroke="${item.color}" stroke-width="2"/>`);
    out.push(text(w + 22, item.yy + 4, item.label, 12, 'start'));
  }
  const partial = series.some((player) => player.partial_career === true);
  const unverified = series.some((player) => player.partial_career === null);
  const axisLabel = spec.scale === 'age' ? 'Age' : spec.scale === 'seasons' ? 'Season (starting year)' : partial || unverified ? 'Games played in available history (since 1996–97)' : 'Career games played';
  out.push(text(w / 2, h + 53, axisLabel, 17));
  out.push(`<text transform="translate(-58,${h / 2}) rotate(-90)" text-anchor="middle" font-size="16" fill="${palette.text}">${escapeXml(METRIC_LABELS[spec.metric])} · points / 100 possessions</text>`);
  out.push('</g>');
  out.push(text(width / 2, height - 42, `DARKO · darko.app · Games incorporated through ${metadata.dataset_as_of || 'unavailable'} · Pregame ratings`, 12, 'middle', palette.muted));
  const note = partial ? 'Partial careers: pre-1996–97 history unavailable. Retrospective series; LOESS is presentation, not a forecast.' : unverified ? 'Debut coverage unverified; game counts start within available history · Retrospective pregame estimates' : 'Retrospective pregame series · LOESS is presentation, not a forecast · Each player retains their available span';
  out.push(text(width / 2, height - 20, note, 12, 'middle', palette.muted), '</svg>');
  return out.join('');
}
