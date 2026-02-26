export function decodeTeamParam(value = '') {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export function normalizeTeamSlug(value = '') {
    return decodeTeamParam(value)
        .replace(/_/g, ' ')
        .trim();
}

