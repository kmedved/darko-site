/**
 * One recognisable colour per team, for accents such as the leaderboard's leader cards: each
 * club's brightest brand colour, so a tint of it shows on light and dark surfaces alike. It
 * never carries meaning on its own; the team is always named in text beside it.
 */

import { teamAbbr } from './teamAbbreviations.js';

const TEAM_COLORS = Object.freeze({
	ATL: '#e03a3e',
	BKN: '#777d84',
	BOS: '#007a33',
	CHA: '#00788c',
	CHI: '#ce1141',
	CLE: '#860038',
	DAL: '#00538c',
	DEN: '#fec524',
	DET: '#c8102e',
	GSW: '#ffc72c',
	HOU: '#ce1141',
	IND: '#fdbb30',
	LAC: '#c8102e',
	LAL: '#552583',
	MEM: '#5d76a9',
	MIA: '#98002e',
	MIL: '#00471b',
	MIN: '#236192',
	NOP: '#85714d',
	NYK: '#f58426',
	OKC: '#007ac1',
	ORL: '#0077c0',
	PHI: '#006bb6',
	PHX: '#e56020',
	POR: '#e03a3e',
	SAC: '#5a2d81',
	SAS: '#8a8d8f',
	TOR: '#ce1141',
	UTA: '#753bbd',
	WAS: '#e31837'
});

/** The team's accent colour, or null for a player without a current team. */
export function teamColor(teamName) {
	return TEAM_COLORS[teamAbbr(teamName)] ?? null;
}

// Relative luminance, as WCAG measures contrast.
function luminance(hex) {
	const [r, g, b] = [1, 3, 5].map((start) => {
		const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
}

const INK_LIGHT = '#ffffff';
const INK_DARK = '#0a0b0d';

/** Text set on the team's colour: white or near-black, whichever reads better; null without a team. */
export function teamInk(teamName) {
	const color = teamColor(teamName);
	if (!color) return null;
	return contrastRatio(color, INK_LIGHT) >= contrastRatio(color, INK_DARK) ? INK_LIGHT : INK_DARK;
}
