const COMPARE_PLAYER_COLORS = ['var(--accent)', 'var(--negative)', 'var(--positive)', 'var(--text)'];

export function getComparePlayerColors() {
    return COMPARE_PLAYER_COLORS;
}

export function buildComparePlayer({ currentRow = {}, rows = [], color = 'var(--text)' }) {
    return {
        ...currentRow,
        rows,
        color
    };
}
