// Automatic names for career comparisons. Social cards and link previews use these instead of
// a link's custom title, so a darko.app card always says what the chart shows.

const METRIC_WORDS = Object.freeze({ dpm: 'DPM', o_dpm: 'offensive DPM', d_dpm: 'defensive DPM' });
const AXIS_WORDS = Object.freeze({ games: 'games played', age: 'age', seasons: 'season' });
const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;

function surname(name) {
  const parts = String(name).trim().split(/\s+/);
  // "Gary Payton II" and "Tim Hardaway Jr." keep their suffix, which is what tells them apart.
  return parts.length > 2 && SUFFIX.test(parts.at(-1)) ? parts.slice(-2).join(' ') : parts.at(-1);
}

function joinList(items) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

function who(names) {
  const clean = (names ?? []).map((name) => String(name ?? '').trim()).filter(Boolean);
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} vs. ${clean[1]}`;
  return joinList(clean.map(surname));
}

export function careerMetricWords(metric) {
  return METRIC_WORDS[metric] ?? 'DPM';
}

export function careerAxisWords(scale) {
  return AXIS_WORDS[scale] ?? 'games played';
}

/** "Jayson Tatum vs. Paul George · DARKO DPM by age" */
export function careerComparisonTitle(names, spec) {
  const subject = who(names) ?? 'NBA career comparison';
  return `${subject} · DARKO ${careerMetricWords(spec.metric)} by ${careerAxisWords(spec.scale)}`;
}

/** One sentence for link previews and image alt text. */
export function careerComparisonDescription(names, spec) {
  const clean = (names ?? []).filter(Boolean);
  const players = clean.length ? ` for ${joinList(clean)}` : '';
  return `DARKO ${careerMetricWords(spec.metric)} career histories${players}, aligned by ${careerAxisWords(spec.scale)}.`;
}
