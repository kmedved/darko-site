import { redirect } from '@sveltejs/kit';

const TRACKING_PARAMS = new Set([
	's',
	't',
	'fbclid',
	'gclid',
	'msclkid',
	'yclid'
]);

function canonicalizeUrl(url) {
	const next = new URL(url.href);
	const remove = [];

	for (const [key] of next.searchParams.entries()) {
		const lower = key.toLowerCase();
		if (
			TRACKING_PARAMS.has(lower) ||
			lower.startsWith('utm_') ||
			lower.startsWith('mc_')
		) {
			remove.push(key);
		}
	}

	if (remove.length === 0) {
		return next;
	}

	for (const key of remove) {
		next.searchParams.delete(key);
	}

	return next;
}

export async function handle({ event, resolve }) {
	if (event.request.method === 'GET') {
		const canonical = canonicalizeUrl(event.url);
		const original = event.url;
		if (canonical.href !== original.href) {
			throw redirect(
				302,
				`${canonical.pathname}${canonical.search}${canonical.hash}`
			);
		}
	}

	return resolve(event);
}
