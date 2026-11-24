const POSITION_ALIASES = Object.freeze({
    G: 'G',
    PG: 'G',
    SG: 'G',
    GUARD: 'G',
    F: 'F',
    SF: 'F',
    PF: 'F',
    FORWARD: 'F',
    C: 'C',
    CENTER: 'C',
    'G-F': 'G-F',
    'F-G': 'G-F',
    'GUARD-FORWARD': 'G-F',
    'FORWARD-GUARD': 'G-F',
    'F-C': 'F-C',
    'C-F': 'F-C',
    'FORWARD-CENTER': 'F-C',
    'CENTER-FORWARD': 'F-C'
});

const POSITION_PALETTE_INDEX = Object.freeze({
    G: 0,
    F: 1,
    C: 2,
    'G-F': 3,
    'F-C': 4
});

export function getPositionCategory(position) {
    if (position === null || position === undefined) return null;
    const normalized = String(position).trim().toUpperCase();
    if (!normalized) return null;
    if (POSITION_ALIASES[normalized]) return POSITION_ALIASES[normalized];

    if (!/^[1-5](?:\.0|\.5)?$/.test(normalized)) return null;
    const numericPosition = Number.parseFloat(normalized);
    if (numericPosition <= 2) return 'G';
    if (numericPosition < 3) return 'G-F';
    if (numericPosition < 3.5) return 'F';
    if (numericPosition < 4.5) return 'F-C';
    return 'C';
}

// Three peer groups, shared by the scatterplot's colours and the player page's percentiles: swing
// positions join the larger side (G-F the wings, F-C the bigs), so no group is a handful of players.
const POSITION_GROUPS = Object.freeze({ G: 'guard', 'G-F': 'wing', F: 'wing', 'F-C': 'big', C: 'big' });

export const POSITION_GROUP_LABELS = Object.freeze({
    guard: 'Guards',
    wing: 'Wings & forwards',
    big: 'Bigs'
});

export function getPositionGroup(position) {
    const category = getPositionCategory(position);
    return category ? POSITION_GROUPS[category] : null;
}

export function getPositionPaletteIndex(position) {
    const category = getPositionCategory(position);
    return category ? POSITION_PALETTE_INDEX[category] : null;
}
