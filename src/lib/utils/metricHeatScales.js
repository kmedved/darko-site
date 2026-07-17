import { SHINY_HEAT_PRESETS, SHINY_HEAT_RAMP, getShinyHeatPreset } from './shinyDesign.js';

// Approximation of rev(colorspace::heat_hcl()) sampled from the archived app.
// Every heat-formatted metric uses this same low-to-high family; only its
// dataset-derived quantile thresholds differ.
const HEAT_RAMP_ANCHORS = SHINY_HEAT_RAMP;

const HEAT_METRIC_KEYS = new Set([
    'dpm',
    'o_dpm',
    'd_dpm',
    'box_dpm',
    'on_off_dpm',
    'dpm_improvement',
    'x_minutes',
    'x_pace',
    'x_pts_100',
    'x_ast_100',
    'x_fg_pct',
    'x_fg3_pct',
    'x_ft_pct',
    'sal_market_fixed',
    'actual_salary',
    'surplus_value',
    'net_pm',
    'off_pm',
    'def_pm',
    'off_synergy',
    'def_synergy',
    'p1',
    'p2',
    'p3',
    'p4',
    'p5',
    'p6',
    'p7',
    'p8',
    'p9',
    'p10',
    'p11',
    'p12'
]);

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function parseHex(hex) {
    const value = hex.replace('#', '');
    return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function interpolateHex(start, end, amount) {
    const from = parseHex(start);
    const to = parseHex(end);
    const channels = from.map((channel, index) =>
        Math.round(channel + (to[index] - channel) * amount)
            .toString(16)
            .padStart(2, '0')
    );
    return `#${channels.join('')}`;
}

function sampleHeatRamp(size) {
    if (size <= 1) return [HEAT_RAMP_ANCHORS[0]];

    return Array.from({ length: size }, (_, index) => {
        if (index === 0) return HEAT_RAMP_ANCHORS[0];
        if (index === size - 1) return HEAT_RAMP_ANCHORS.at(-1);

        const position = (index / (size - 1)) * (HEAT_RAMP_ANCHORS.length - 1);
        const lowerIndex = Math.floor(position);
        const upperIndex = Math.min(lowerIndex + 1, HEAT_RAMP_ANCHORS.length - 1);
        return interpolateHex(
            HEAT_RAMP_ANCHORS[lowerIndex],
            HEAT_RAMP_ANCHORS[upperIndex],
            position - lowerIndex
        );
    });
}

// R's default quantile type (type = 7), matching the archived load_data.R.
function quantile(sortedValues, probability) {
    if (sortedValues.length === 0) return null;
    if (sortedValues.length === 1) return sortedValues[0];

    const position = clamp(probability, 0, 1) * (sortedValues.length - 1);
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);
    if (lowerIndex === upperIndex) return sortedValues[lowerIndex];

    const amount = position - lowerIndex;
    return sortedValues[lowerIndex]
        + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * amount;
}

function quantileProbabilities({ lowerQuantile, upperQuantile, quantileStep }) {
    const count = Math.floor((upperQuantile - lowerQuantile) / quantileStep + 0.5) + 1;
    return Array.from({ length: count }, (_, index) =>
        Math.min(upperQuantile, lowerQuantile + index * quantileStep)
    );
}

/**
 * Build one stepped heat scale from the values currently represented by a table.
 * The legacy talent table used 5%–95% thresholds in 5% steps (20 color bins).
 */
export function buildQuantileHeatScale(values, options = {}) {
    const lowerQuantile = options.lowerQuantile ?? 0.05;
    const upperQuantile = options.upperQuantile ?? 0.95;
    const quantileStep = options.quantileStep ?? 0.05;
    const numericValues = (values || [])
        .map((value) => Number.parseFloat(value))
        .filter(Number.isFinite)
        .sort((left, right) => left - right);

    if (numericValues.length === 0 || quantileStep <= 0 || lowerQuantile > upperQuantile) {
        return null;
    }

    const probabilities = quantileProbabilities({
        lowerQuantile,
        upperQuantile,
        quantileStep
    });
    const thresholds = probabilities.map((probability) => quantile(numericValues, probability));

    return Object.freeze({
        thresholds: Object.freeze(thresholds),
        colors: Object.freeze(sampleHeatRamp(thresholds.length + 1))
    });
}

/**
 * Build a per-metric scale registry from one displayed dataset.
 * Accessors may be property names or functions, allowing WOWY fields to reuse
 * the DPM/O-DPM/D-DPM visual roles without inventing separate color domains.
 */
export function buildMetricHeatScales(rows, accessors, options = {}) {
    const entries = Array.isArray(accessors)
        ? accessors.map((key) => [key, key])
        : Object.entries(accessors || {});
    const scales = {};

    for (const [metricKey, accessor] of entries) {
        const values = (rows || []).map((row) =>
            typeof accessor === 'function' ? accessor(row) : row?.[accessor]
        );
        const scale = buildQuantileHeatScale(values, options);
        if (scale) scales[metricKey] = scale;
    }

    return Object.freeze(scales);
}

/**
 * Build a source-derived table preset. Optional accessors let a new dataset
 * map its field names onto the preset's semantic roles without changing the
 * shared color mechanism.
 */
export function buildPresetHeatScales(rows, presetName, accessors = null) {
    const preset = getShinyHeatPreset(presetName);
    if (!preset) return Object.freeze({});
    return buildMetricHeatScales(
        rows,
        accessors ?? preset.accessors,
        { quantileStep: preset.quantileStep }
    );
}

function colorForScale(value, scale) {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric) || !scale) return null;

    const binIndex = scale.thresholds.findIndex((threshold) => numeric <= threshold);
    return scale.colors[binIndex === -1 ? scale.colors.length - 1 : binIndex];
}

export function getMetricHeatVariables(metricKey, value, scales) {
    const background = colorForScale(value, scales?.[metricKey]);
    if (!background) return '';
    return `--shiny-cell-bg: ${background}; --shiny-cell-color: #222222;`;
}

export function hasMetricHeatScale(metricKey) {
    return HEAT_METRIC_KEYS.has(metricKey);
}

export const metricHeatRamp = HEAT_RAMP_ANCHORS;
export const metricHeatPresets = SHINY_HEAT_PRESETS;
