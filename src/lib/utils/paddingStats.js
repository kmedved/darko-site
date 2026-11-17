// Labels, units and formats for the padding tables in the stabilization-rates research post.
// A stat's padding is how much league-average performance to add to a sample before projecting.

export function paddedProjection(value, sample, padding, leagueAverage) {
	const n = Math.max(0, Number(sample) || 0);
	return (Number(value) * n + padding * leagueAverage) / (n + padding);
}

export function ownWeight(sample, padding) {
	const n = Math.max(0, Number(sample) || 0);
	return n / (n + padding);
}

// format: 'pct' shows 0.355 as 35.5%; 'num' one decimal; 'signed' one decimal with a sign; 'ratio' .264
export const PLAYER_STATS = Object.freeze({
	minutes: { label: 'Minutes per game', unit: 'games', format: 'num' },
	fg3_ar: { label: '3-point attempt rate', note: 'share of shots taken from three', unit: 'shot attempts', format: 'pct' },
	ast_pct: { label: 'Assist rate', note: "share of teammates' made shots he assisted", unit: "teammates' made shots", format: 'pct' },
	ft_pct: { label: 'Free-throw %', unit: 'free throws', format: 'pct' },
	fg3a_100: { label: '3-point attempts per 100', unit: 'possessions', format: 'num' },
	ft_ar: { label: 'Free-throw rate', note: 'free throws per shot attempt', unit: 'shot attempts', format: 'ratio' },
	ast_100: { label: 'Assists per 100', unit: 'possessions', format: 'num' },
	trb_100: { label: 'Rebounds per 100', unit: 'possessions', format: 'num' },
	fg2a_100: { label: '2-point attempts per 100', unit: 'possessions', format: 'num' },
	usg_pct: { label: 'Usage rate', unit: 'possessions', format: 'pct' },
	fga_100: { label: 'Shot attempts per 100', unit: 'possessions', format: 'num' },
	orb_pct: { label: 'Offensive rebound rate', note: "share of his team's misses he rebounds", unit: 'possessions', format: 'pct' },
	orb_100: { label: 'Offensive rebounds per 100', unit: 'possessions', format: 'num' },
	blk_pct: { label: 'Block rate', note: 'per opponent 2-point attempt', unit: 'opponent 2-point attempts', format: 'pct' },
	fg_pct: { label: 'Field-goal %', unit: 'shot attempts', format: 'pct' },
	drb_pct: { label: 'Defensive rebound rate', note: "share of opponents' misses he rebounds", unit: 'possessions', format: 'pct' },
	drb_100: { label: 'Defensive rebounds per 100', unit: 'possessions', format: 'num' },
	fg2_pct: { label: '2-point %', unit: '2-point attempts', format: 'pct' },
	blk_100: { label: 'Blocks per 100', unit: 'possessions', format: 'num' },
	fta_100: { label: 'Free-throw attempts per 100', unit: 'possessions', format: 'num' },
	pf_100: { label: 'Fouls per 100', unit: 'possessions', format: 'num' },
	fg3_pct: { label: '3-point %', unit: '3-point attempts', format: 'pct' },
	tov_100: { label: 'Turnovers per 100', unit: 'possessions', format: 'num' },
	stl_pct: { label: 'Steal rate', note: 'per opponent possession', unit: 'possessions', format: 'pct' },
	stl_100: { label: 'Steals per 100', unit: 'possessions', format: 'num' },
	tov_pct: { label: 'Turnover rate', note: 'per possession used', unit: 'possessions', format: 'pct' },
	pm_100: { label: 'Plus-minus per 100', unit: 'possessions', format: 'signed' }
});

export const TEAM_STATS = Object.freeze({
	win_pct: { label: 'Win %', unit: 'games', format: 'pct' },
	margin: { label: 'Point margin per game', unit: 'games', format: 'signed' },
	pace: { label: 'Pace', note: 'possessions per game', unit: 'games', format: 'num' },
	ortg: { label: 'Offensive rating', note: 'points per 100 possessions', unit: 'possessions', format: 'num' },
	drtg: { label: 'Defensive rating', note: 'points allowed per 100 possessions', unit: 'possessions', format: 'num' },
	net_rtg: { label: 'Net rating', unit: 'possessions', format: 'signed' },
	efg_pct: { label: 'Effective FG %', unit: 'shot attempts', format: 'pct' },
	opp_efg_pct: { label: 'Opponent effective FG %', unit: 'opponent shot attempts', format: 'pct' },
	fg3_pct: { label: '3-point %', unit: '3-point attempts', format: 'pct' },
	opp_fg3_pct: { label: 'Opponent 3-point %', unit: 'opponent 3-point attempts', format: 'pct' },
	fg2_pct: { label: '2-point %', unit: '2-point attempts', format: 'pct' },
	opp_fg2_pct: { label: 'Opponent 2-point %', unit: 'opponent 2-point attempts', format: 'pct' },
	ft_pct: { label: 'Free-throw %', unit: 'free throws', format: 'pct' },
	opp_ft_pct: { label: 'Opponent free-throw %', unit: 'opponent free throws', format: 'pct' },
	fg3_ar: { label: '3-point attempt rate', note: 'share of shots taken from three', unit: 'shot attempts', format: 'pct' },
	opp_fg3_ar: { label: 'Opponent 3-point attempt rate', unit: 'opponent shot attempts', format: 'pct' },
	ft_rate: { label: 'Free-throw rate', note: 'free throws per shot attempt', unit: 'shot attempts', format: 'ratio' },
	opp_ft_rate: { label: 'Opponent free-throw rate', unit: 'opponent shot attempts', format: 'ratio' },
	tov_pct: { label: 'Turnovers per possession', unit: 'possessions', format: 'pct' },
	opp_tov_pct: { label: 'Opponent turnovers per possession', unit: 'possessions', format: 'pct' },
	orb_pct: { label: 'Offensive rebound %', unit: 'rebound chances', format: 'pct' },
	drb_pct: { label: 'Defensive rebound %', unit: 'rebound chances', format: 'pct' }
});

export function formatStatValue(value, format) {
	if (value === null || value === undefined || Number.isNaN(value)) return '—';
	if (format === 'pct') return `${(value * 100).toFixed(1)}%`;
	if (format === 'ratio') return value.toFixed(3).replace(/^0/, '');
	if (format === 'signed') return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}`;
	return value.toFixed(1);
}

export function formatPadding(value) {
	if (value < 10) return value.toFixed(1);
	return Math.round(value).toLocaleString('en-US');
}

// What a reader types into the calculator: percentages as 35.5, everything else as shown.
export function toInputValue(value, format) {
	return format === 'pct' ? Number((value * 100).toFixed(1)) : Number(value.toFixed(format === 'ratio' ? 3 : 1));
}

export function fromInputValue(input, format) {
	const value = Number(input);
	return format === 'pct' ? value / 100 : value;
}
