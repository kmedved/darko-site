import { SHINY_SERIES, getShinyChartPreset } from './shinyDesign.js';

const MODERN_SERIES = Object.freeze([
	'#5b8def',
	'#ef4444',
	'#34d399',
	'#f59e0b',
	'#a78bfa',
	'#06b6d4',
	'#f97316',
	'#22c55e',
	'#ec4899',
	'#eab308'
]);

// DARKO's original five-color comparison palette from the Shiny app source.
const SHINY_COMPARISON = getShinyChartPreset('comparison');

const MODERN_THEME = Object.freeze({
		margin: null,
		pointRadius: 2,
		pointOpacity: 0.3,
		lineWidth: 2.5,
		smoothingBandwidth: null,
		zeroWidth: 1.5,
		zeroDash: '6,4',
		gridDash: '2,3',
		gridOpacity: 1,
		axisColor: 'var(--border, #555)',
		zeroColor: 'var(--text)',
		plotBorderColor: 'var(--border, #555)',
		plotBorder: false,
		titleSize: 16,
		titleWeight: 700,
		axisLabelSize: 13,
		axisLabelWeight: 600,
		tickSize: null,
		legendTextSize: 12,
		legendY: 38,
		legendLineWidth: 3,
		legendDotRadius: 3
	});

const SHINY_THEME = Object.freeze({
		margin: Object.freeze({ top: 68, right: 20, bottom: 70, left: 70 }),
		pointRadius: SHINY_COMPARISON.pointRadius,
		pointOpacity: SHINY_COMPARISON.pointOpacity,
		lineWidth: SHINY_COMPARISON.lineWidth,
		smoothingBandwidth: SHINY_COMPARISON.smoothingBandwidth,
		zeroWidth: SHINY_COMPARISON.zeroWidth,
		zeroDash: SHINY_COMPARISON.zeroDash,
		gridDash: null,
		gridOpacity: SHINY_COMPARISON.gridOpacity,
		axisColor: '#555555',
		zeroColor: '#000000',
		plotBorderColor: '#777777',
		plotBorder: SHINY_COMPARISON.plotBorder,
		titleSize: 20,
		titleWeight: 400,
		axisLabelSize: 18,
		axisLabelWeight: 400,
		tickSize: 14,
		legendTextSize: 14,
		legendY: 48,
		legendLineWidth: 4,
		legendDotRadius: 0
});

const SHINY_MOBILE_THEME = Object.freeze({
	...SHINY_THEME,
	margin: Object.freeze({ top: 88, right: 14, bottom: 72, left: 58 }),
	titleSize: 18,
	axisLabelSize: 14,
	tickSize: 10,
	legendTextSize: 11,
	legendY: 50
});

const THEMES = Object.freeze({
	modern: MODERN_THEME,
	shiny: SHINY_THEME,
	shinyMobile: SHINY_MOBILE_THEME
});

function hslToHex(h, s, l) {
	const saturation = s / 100;
	const lightness = l / 100;
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const huePrime = h / 60;
	const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
	let red = 0;
	let green = 0;
	let blue = 0;

	if (huePrime >= 0 && huePrime < 1) {
		red = chroma;
		green = x;
	} else if (huePrime < 2) {
		red = x;
		green = chroma;
	} else if (huePrime < 3) {
		green = chroma;
		blue = x;
	} else if (huePrime < 4) {
		green = x;
		blue = chroma;
	} else if (huePrime < 5) {
		red = x;
		blue = chroma;
	} else {
		red = chroma;
		blue = x;
	}

	const match = lightness - chroma / 2;
	const toHex = (value) =>
		Math.round((value + match) * 255)
			.toString(16)
			.padStart(2, '0');

	return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function getChartTheme(view, { isMobile = false } = {}) {
	if (view !== 'shiny') return THEMES.modern;
	return isMobile ? THEMES.shinyMobile : THEMES.shiny;
}

export function getSeriesColor(index, view = 'modern') {
	const palette = view === 'shiny' ? SHINY_SERIES : MODERN_SERIES;
	const presetColor = palette[index];
	if (presetColor) return presetColor;

	const hue = (index * 137.508) % 360;
	return hslToHex(hue, view === 'shiny' ? 64 : 68, view === 'shiny' ? 45 : 56);
}

export const chartSeriesPalettes = Object.freeze({
	modern: MODERN_SERIES,
	shiny: SHINY_SERIES
});
