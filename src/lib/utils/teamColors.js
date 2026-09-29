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
