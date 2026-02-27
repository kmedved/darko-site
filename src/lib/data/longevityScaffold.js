const CURRENT_SEASON_START_YEAR = 2024;

const BASE_PLAYERS = [
    { nba_id: 1628369, player_name: 'Jayson Tatum', rookie_season: 2018, career_games: 759, age: 27.2, est_retirement_age: 38.1, durability: 0.12 },
    { nba_id: 1628378, player_name: 'Donovan Mitchell', rookie_season: 2018, career_games: 741, age: 29.3, est_retirement_age: 37.3, durability: 0.28 },
    { nba_id: 1629029, player_name: 'Luka Doncic', rookie_season: 2019, career_games: 652, age: 26.9, est_retirement_age: 36.3, durability: 0.22 },
    { nba_id: 1628983, player_name: 'Shai Gilgeous-Alexander', rookie_season: 2019, career_games: 641, age: 27.5, est_retirement_age: 38.9, durability: 0.08 },
    { nba_id: 1629630, player_name: 'Ja Morant', rookie_season: 2020, career_games: 436, age: 26.0, est_retirement_age: 35.8, durability: 0.35 },
    { nba_id: 203507, player_name: 'Giannis Antetokounmpo', rookie_season: 2014, career_games: 858, age: 31.2, est_retirement_age: 38.4, durability: 0.2 },
    { nba_id: 203954, player_name: 'Joel Embiid', rookie_season: 2017, career_games: 514, age: 32.1, est_retirement_age: 36.5, durability: 0.5 },
    { nba_id: 2544, player_name: 'LeBron James', rookie_season: 2004, career_games: 1510, age: 41.2, est_retirement_age: 43.1, durability: 0.42 },
    { nba_id: 201939, player_name: 'Stephen Curry', rookie_season: 2010, career_games: 1044, age: 38.0, est_retirement_age: 41.2, durability: 0.3 },
    { nba_id: 201142, player_name: 'Kevin Durant', rookie_season: 2008, career_games: 1121, age: 37.8, est_retirement_age: 41.0, durability: 0.38 },
    { nba_id: 203076, player_name: 'Anthony Davis', rookie_season: 2013, career_games: 835, age: 33.1, est_retirement_age: 37.5, durability: 0.45 },
    { nba_id: 1627759, player_name: 'Jaylen Brown', rookie_season: 2017, career_games: 712, age: 29.1, est_retirement_age: 36.9, durability: 0.24 },
    { nba_id: 1630162, player_name: 'Tyrese Haliburton', rookie_season: 2021, career_games: 387, age: 25.7, est_retirement_age: 36.1, durability: 0.2 },
    { nba_id: 1630169, player_name: 'Tyrese Maxey', rookie_season: 2021, career_games: 365, age: 25.3, est_retirement_age: 35.9, durability: 0.24 },
    { nba_id: 1631094, player_name: 'Victor Wembanyama', rookie_season: 2024, career_games: 79, age: 21.7, est_retirement_age: 37.8, durability: 0.16 },
    { nba_id: 1630178, player_name: 'Desmond Bane', rookie_season: 2021, career_games: 331, age: 27.4, est_retirement_age: 35.7, durability: 0.32 },
    { nba_id: 1628381, player_name: 'John Collins', rookie_season: 2018, career_games: 527, age: 28.2, est_retirement_age: 34.6, durability: 0.34 },
    { nba_id: 1628973, player_name: 'Jaren Jackson Jr.', rookie_season: 2019, career_games: 443, age: 27.1, est_retirement_age: 36.5, durability: 0.29 },
    { nba_id: 1627732, player_name: 'Pascal Siakam', rookie_season: 2017, career_games: 691, age: 31.8, est_retirement_age: 36.8, durability: 0.27 },
    { nba_id: 1628386, player_name: 'Jarrett Allen', rookie_season: 2018, career_games: 632, age: 28.9, est_retirement_age: 35.8, durability: 0.31 },
    { nba_id: 203081, player_name: 'Damian Lillard', rookie_season: 2013, career_games: 907, age: 36.0, est_retirement_age: 39.6, durability: 0.33 },
    { nba_id: 1626157, player_name: 'Karl-Anthony Towns', rookie_season: 2016, career_games: 651, age: 31.0, est_retirement_age: 36.4, durability: 0.3 }
];

const HORIZON_COUNT = 12;

function roundToSingle(value) {
    return Math.round(value * 10) / 10;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function toSeasonLabel(startYear) {
    const endSuffix = String((startYear + 1) % 100).padStart(2, '0');
    return `${startYear}-${endSuffix}`;
}

function buildProbabilities(yearsRemaining, durability) {
    const probabilities = {};
    const decayScale = Math.max(3.2, yearsRemaining * 1.7);
    const lateCareerPenalty = 4 + durability * 8;

    for (let horizon = 1; horizon <= HORIZON_COUNT; horizon += 1) {
        const survivorship = 100 * Math.exp(-(horizon - 1) / decayScale);
        const overhang = Math.max(0, horizon - Math.ceil(yearsRemaining + 1));
        const penalty = overhang * lateCareerPenalty;
        const value = roundToSingle(clamp(survivorship - penalty, 1, 100));
        probabilities[`p${horizon}`] = value;
    }

    return probabilities;
}

function buildTrajectory({ rookie_season, est_retirement_age, age, durability, nba_id }) {
    const firstSeasonStartYear = Math.max(2017, rookie_season - 1);
    const seasonStartYears = [];

    for (let year = firstSeasonStartYear; year <= CURRENT_SEASON_START_YEAR; year += 1) {
        seasonStartYears.push(year);
    }

    const span = Math.max(1, seasonStartYears.length - 1);
    const baseStartProjection = Math.max(age + 1.1, est_retirement_age - span * 0.9 - 0.5);

    return seasonStartYears.map((seasonStartYear, index) => {
        const wave = Math.sin((index + 1) * 1.2 + (nba_id % 11)) * (0.18 + durability * 0.16);
        const drift = index * (0.9 + (1 - durability) * 0.1);
        const projectedRetirementAge = roundToSingle(baseStartProjection + drift + wave);

        return {
            season_start: toSeasonLabel(seasonStartYear),
            season_start_year: seasonStartYear,
            projected_retirement_age: projectedRetirementAge
        };
    });
}

const LONGEVITY_SCAFFOLD_ROWS = BASE_PLAYERS.map((player) => {
    const yearsRemaining = roundToSingle(player.est_retirement_age - player.age);
    const trajectory = buildTrajectory(player);
    const probabilities = buildProbabilities(yearsRemaining, player.durability);

    return {
        nba_id: player.nba_id,
        player_name: player.player_name,
        rookie_season: player.rookie_season,
        career_games: player.career_games,
        age: player.age,
        est_retirement_age: player.est_retirement_age,
        years_remaining: yearsRemaining,
        ...probabilities,
        trajectory
    };
});

export async function getLongevityScaffoldData() {
    return LONGEVITY_SCAFFOLD_ROWS.map((row) => ({
        ...row,
        trajectory: row.trajectory.map((point) => ({ ...point }))
    }));
}
