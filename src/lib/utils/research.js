// Research posts listed on /research, newest first. Each post has its own route under
// src/routes/research/<slug>/ and its Markdown in src/lib/content/research/<slug>.md.
export const RESEARCH_POSTS = [
	{
		slug: 'on-descriptive-metrics',
		title: 'On Descriptive Metrics',
		date: '2026-11-20',
		dateLabel: 'November 20, 2026 · Work in progress',
		summary:
			'Stray thoughts and ruminations (a work in progress) on why there is no single-season DARKO, and why every attempt to build a purely descriptive MVP stat quietly turns into a predictive model.'
	},
	{
		slug: 'practice-vs-game-free-throws',
		title: 'Why are NBA players so much worse at free throws in games?',
		date: '2026-11-20',
		dateLabel: 'November 20, 2026',
		summary:
			"The 2013 Lakers made 89% of their free throws in practice and 69% in games. I went through about 1.76 million game free throws to see what explains the gap – whether it's fatigue, pressure, the crowd, or rhythm."
	},
	{
		slug: 'does-winning-the-tip-matter',
		title: 'Does winning the tip matter?',
		date: '2026-11-17',
		dateLabel: 'November 17, 2026',
		summary:
			'Teams that win the opening tip win 52.8% of their games. The rules give the possession back, most of the edge is who is playing, and the closing spread plus who is jumping leaves about a fifth of a point. The overtime tip is the one that matters.'
	},
	{
		slug: 'early-season-strength-of-schedule',
		title: 'In November, strength of schedule has stopped helping',
		date: '2026-11-17',
		dateLabel: 'November 17, 2026',
		summary:
			'Ten games in, a point of schedule strength used to be worth about 0.7 of a point of margin. Since 2019-20 it has been worth about nothing. What changed, what did not, and how to adjust early-season ratings.'
	},
	{
		slug: 'stabilization-rates-and-the-padding-approach',
		title: 'NBA Stabilization Rates and the Padding Approach',
		date: '2020-08-06',
		dateLabel: 'August 6, 2020',
		summary:
			'When is a hot start real? Pad each stat with a fixed amount of league-average performance. Updated November 17, 2026 with every season through 2025-26, a new section on teams, and a calculator.'
	}
];
