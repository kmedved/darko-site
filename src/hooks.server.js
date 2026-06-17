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

function readErrorField(error, key) {
	if (!error || (typeof error !== 'object' && typeof error !== 'function')) {
		return undefined;
	}

	try {
		const value = error[key];
		if (value === undefined || value === null || value === '') {
			return undefined;
		}
		return String(value);
	} catch {
		return '[unreadable]';
	}
}

function serializeError(error) {
	if (!error || (typeof error !== 'object' && typeof error !== 'function')) {
		return {
			type: typeof error,
			value: String(error)
		};
	}

	return {
		name: readErrorField(error, 'name'),
		code: readErrorField(error, 'code'),
		message: readErrorField(error, 'message'),
		details: readErrorField(error, 'details'),
		hint: readErrorField(error, 'hint'),
		stack: readErrorField(error, 'stack')
	};
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

/** @type {import('@sveltejs/kit').HandleServerError} */
export function handleError({ error, event, status, message }) {
	try {
		console.error(
			'darko-site server error',
			JSON.stringify({
				status,
				message,
				method: event.request.method,
				path: event.url.pathname,
				routeId: event.route?.id,
				vercelId: event.request.headers.get('x-vercel-id') || undefined,
				error: serializeError(error)
			})
		);
	} catch (logError) {
		try {
			console.error('darko-site server error logging failed', logError);
		} catch {
			// SvelteKit requires handleError itself to never throw.
		}
	}

	return { message };
}
