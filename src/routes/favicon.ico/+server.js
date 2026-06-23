const CACHE_HEADER = 'public, max-age=31536000, immutable';

export function GET() {
	return new Response(null, {
		status: 308,
		headers: {
			Location: '/favicon.png',
			'Cache-Control': CACHE_HEADER,
			'Vercel-CDN-Cache-Control': CACHE_HEADER
		}
	});
}
