import { error } from '@sveltejs/kit';

const UPSTREAM = {
	headshot: (id) => `https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png`,
	logo: (id) => `https://cdn.nba.com/logos/nba/${id}/global/L/logo.svg`
};

const CONTENT_TYPE = {
	headshot: 'image/png',
	logo: 'image/svg+xml'
};

/** Edge-cache for 7 days, allow stale for 30 days while revalidating. */
const CACHE_HEADER = 'public, s-maxage=604800, stale-while-revalidate=2592000';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	const { type, id } = params;

	const urlBuilder = UPSTREAM[type];
	if (!urlBuilder) {
		throw error(400, `Unknown image type: ${type}`);
	}

	// Sanitise id: allow digits only (NBA player/team IDs are numeric)
	if (!/^\d+$/.test(id)) {
		throw error(400, 'Invalid id');
	}

	const upstream = await fetch(urlBuilder(id));

	if (!upstream.ok) {
		throw error(upstream.status === 404 ? 404 : 502, 'Upstream fetch failed');
	}

	const body = await upstream.arrayBuffer();

	return new Response(body, {
		headers: {
			'Content-Type': CONTENT_TYPE[type],
			'Cache-Control': CACHE_HEADER
		}
	});
}
