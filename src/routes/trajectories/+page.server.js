import { careerShareMetadata } from '$lib/server/charts/share.js';
import { getPlayerNames } from '$lib/server/supabase.js';
import trending from '$lib/data/trending.json';
import { newsPlayers } from '$lib/utils/trending.js';

// Checked on each request, so the page stops leading with the news once the file is stale.
export async function load({ url }) {
    return { newsPlayers: newsPlayers(trending), social: await careerShareMetadata(url, { lookupNames: getPlayerNames }) };
}
