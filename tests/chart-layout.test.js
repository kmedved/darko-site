import test from 'node:test';
import assert from 'node:assert/strict';

import {
	getChartLayout,
	getSeasonTickStep,
	getAgeTickCount,
	getSeasonAgeAxis
} from '../src/lib/utils/chartLayout.js';

// --- getChartLayout ---

test('getChartLayout returns mobile layout for width < 500', () => {
	const layout = getChartLayout(375);
	assert.equal(layout.isMobile, true);
	assert.equal(layout.margin.left, 56);
	assert.equal(layout.margin.right, 15);
	assert.equal(layout.xTicks, 5);
	assert.equal(layout.yTicks, 6);
	assert.equal(layout.tickFontSize, '11px');
});

test('getChartLayout returns desktop layout for width >= 500', () => {
	const layout = getChartLayout(800);
	assert.equal(layout.isMobile, false);
	assert.equal(layout.margin.left, 60);
	assert.equal(layout.margin.right, 30);
	assert.equal(layout.xTicks, 8);
	assert.equal(layout.yTicks, 8);
	assert.equal(layout.tickFontSize, '11px');
});

test('getChartLayout boundary: width exactly 500 is desktop', () => {
	const layout = getChartLayout(500);
	assert.equal(layout.isMobile, false);
});

test('getChartLayout boundary: width 499 is mobile', () => {
	const layout = getChartLayout(499);
	assert.equal(layout.isMobile, true);
});

test('getChartLayout mobile has smaller margins than desktop', () => {
	const mobile = getChartLayout(375);
	const desktop = getChartLayout(1280);
	assert.ok(mobile.margin.left < desktop.margin.left);
	assert.ok(mobile.margin.right < desktop.margin.right);
});

test('getChartLayout mobile has fewer ticks than desktop', () => {
	const mobile = getChartLayout(375);
	const desktop = getChartLayout(1280);
	assert.ok(mobile.xTicks < desktop.xTicks);
	assert.ok(mobile.yTicks < desktop.yTicks);
});

test('getChartLayout preserves consistent top/bottom margins', () => {
	const mobile = getChartLayout(375);
	const desktop = getChartLayout(1280);
	assert.equal(mobile.margin.top, desktop.margin.top);
	assert.equal(mobile.margin.bottom, desktop.margin.bottom);
});

test('getChartLayout plotWidth accounts for left+right margins', () => {
	const layout = getChartLayout(800);
	assert.equal(layout.plotWidth, 800 - layout.margin.left - layout.margin.right);
});

// --- getSeasonTickStep ---

test('getSeasonTickStep desktop: large span (>15) uses step 5', () => {
	assert.equal(getSeasonTickStep(20, false), 5);
});

test('getSeasonTickStep desktop: medium span (9-15) uses step 2', () => {
	assert.equal(getSeasonTickStep(10, false), 2);
});

test('getSeasonTickStep desktop: small span (<=8) uses step 1', () => {
	assert.equal(getSeasonTickStep(5, false), 1);
});

test('getSeasonTickStep mobile: large span (>8) uses step 5', () => {
	assert.equal(getSeasonTickStep(12, true), 5);
});

test('getSeasonTickStep mobile: medium span (5-8) uses step 3', () => {
	assert.equal(getSeasonTickStep(6, true), 3);
});

test('getSeasonTickStep mobile: small span (<=4) uses step 1', () => {
	assert.equal(getSeasonTickStep(3, true), 1);
});

// --- getAgeTickCount ---

test('getAgeTickCount returns 6 for mobile', () => {
	assert.equal(getAgeTickCount(true), 6);
});

test('getAgeTickCount returns 12 for desktop', () => {
	assert.equal(getAgeTickCount(false), 12);
});

// --- getSeasonAgeAxis ---

test('season-age axis spans whole columns and ticks their middles', () => {
	// LeBron's career: first game in the age-19 column, the latest in the age-42 column.
	const axis = getSeasonAgeAxis(18.506, 41.66);
	assert.deepEqual(axis.domain, [18.5, 42.5]);
	assert.deepEqual(axis.ticks, [20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42]);
	assert.deepEqual(getSeasonAgeAxis(18.506, 41.66, true).ticks, [20, 24, 28, 32, 36, 40]);
	// A short range labels every season; one season still gets a whole column.
	assert.deepEqual(getSeasonAgeAxis(24.6, 26.4), { domain: [24.5, 26.5], ticks: [25, 26] });
	assert.deepEqual(getSeasonAgeAxis(29.75, 30.25).domain, [29.5, 30.5]);
});
