/**
 * Source-derived design primitives for Shiny View.
 *
 * Keep visual constants here instead of inventing page-local palettes. New
 * charts and tables can consume these presets while sharing the same DOM and
 * behavior with Modern View.
 */

export const SHINY_COLORS = Object.freeze({
    seriesBlue: '#385bbb',
    seriesCrimson: '#ef2d56',
    seriesGreen: '#0cce6b',
    seriesOrange: '#ed7d3a',
    seriesChartreuse: '#dced31',
    singlePlayerPoint: '#006bb6',
    singlePlayerBand: '#ed174c',
    seasonRule: '#636166',
    scatterBase: '#0c39ce',
    scatterTrend: '#363537',
    text: '#333333',
    mutedText: '#777777',
    plotBorder: '#777777'
});

export const SHINY_SERIES = Object.freeze([
    SHINY_COLORS.seriesBlue,
    SHINY_COLORS.seriesCrimson,
    SHINY_COLORS.seriesGreen,
    SHINY_COLORS.seriesOrange,
    SHINY_COLORS.seriesChartreuse
]);

// Set1 was used only for profile percentile bars and positional densities.
export const SHINY_SET1 = Object.freeze([
    '#e41a1c',
    '#377eb8',
    '#4daf4a',
    '#984ea3',
    '#ff7f00',
    '#ffff33',
    '#a65628',
    '#f781bf',
    '#999999'
]);

export const SHINY_HEAT_RAMP = Object.freeze([
    '#e2e6bd',
    '#e7e180',
    '#ead357',
    '#ebc438',
    '#ebb428',
    '#eaa428',
    '#e89331',
    '#e6833d',
    '#e27449',
    '#de6355',
    '#d95260',
    '#d33f6a'
]);

export const SHINY_CHART_PRESETS = Object.freeze({
    comparison: Object.freeze({
        pointRadius: 3,
        pointOpacity: 0.25,
        lineWidth: 4,
        smoothingBandwidth: 0.5,
        zeroWidth: 2,
        zeroDash: '14,10',
        gridOpacity: 0,
        plotBorder: true
    }),
    singlePlayer: Object.freeze({
        pointRadius: 2,
        pointOpacity: 0.65,
        smoothingBandwidth: 0.75,
        showSmootherLine: false,
        showConfidenceBand: true,
        zeroWidth: 1,
        seasonRuleWidth: 0.5,
        plotBorder: true
    }),
    scatter: Object.freeze({
        pointRadius: 3,
        pointOpacity: 0.65,
        gridOpacity: 0,
        plotBorder: true
    }),
    probability: Object.freeze({
        lineWidth: 3.5,
        pointRadius: 4.2,
        keepMajorGrid: true
    })
});

export const SHINY_HEAT_PRESETS = Object.freeze({
    talent: Object.freeze({
        accessors: Object.freeze({ dpm: 'dpm', box_dpm: 'box_dpm', dpm_improvement: 'dpm_improvement' }),
        quantileStep: 0.05
    }),
    lineup: Object.freeze({
        accessors: Object.freeze({ net_pm: 'net_pm', off_pm: 'off_pm', def_pm: 'def_pm' }),
        quantileStep: 0.05
    }),
    wowy: Object.freeze({
        accessors: Object.freeze({ dpm: 'wowy_rapm', o_dpm: 'wowy_orapm', d_dpm: 'wowy_drapm' }),
        quantileStep: 0.05
    }),
    longevity: Object.freeze({
        accessors: Object.freeze(Object.fromEntries(
            Array.from({ length: 12 }, (_, index) => [`p${index + 1}`, `p${index + 1}`])
        )),
        quantileStep: 0.1
    }),
    daily: Object.freeze({
        accessors: Object.freeze(Object.fromEntries([
            'minutes', 'pace', 'pts', 'ast', 'dreb', 'oreb', 'blk', 'stl',
            'tov', 'fga', 'fta', 'fg3a', 'rim_fga', 'pf'
        ].map((key) => [key, key]))),
        quantileStep: 0.1
    })
});

export function getShinyChartPreset(name = 'comparison') {
    return SHINY_CHART_PRESETS[name] ?? SHINY_CHART_PRESETS.comparison;
}

export function getShinyHeatPreset(name) {
    return SHINY_HEAT_PRESETS[name] ?? null;
}
