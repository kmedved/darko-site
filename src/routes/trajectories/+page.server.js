import trending from '$lib/data/trending.json';
import { newsPlayers } from '$lib/utils/trending.js';

// Checked on each request, so the page stops leading with the news once the file is stale.
export function load() {
    return { newsPlayers: newsPlayers(trending) };
}
