import test from 'node:test';
import assert from 'node:assert/strict';

import { handleError } from '../src/hooks.server.js';

function buildEvent({
	method = 'GET',
	path = '/player/201935',
	routeId = '/player/[nbaId]',
	vercelId = 'iad1::abc-123'
} = {}) {
	const url = new URL(`https://www.darko.app${path}?ignored=1`);
	return {
		request: new Request(url, {
			method,
			headers: { 'x-vercel-id': vercelId }
		}),
		route: { id: routeId },
		url
	};
}

test('handleError logs PostgREST-shaped errors with route context', () => {
	const calls = [];
	const original = console.error;
	console.error = (...args) => calls.push(args);

	try {
		const result = handleError({
			error: {
				code: 'PGRST205',
				message: "Could not find the table 'player_ratings'",
				details: 'Searched schema cache',
				hint: 'Reload schema cache'
			},
			event: buildEvent(),
			status: 500,
			message: 'Internal Error'
		});

		assert.deepEqual(result, { message: 'Internal Error' });
		assert.equal(calls.length, 1);
		assert.equal(calls[0][0], 'darko-site server error');

		const payload = JSON.parse(calls[0][1]);
		assert.equal(payload.status, 500);
		assert.equal(payload.message, 'Internal Error');
		assert.equal(payload.method, 'GET');
		assert.equal(payload.path, '/player/201935');
		assert.equal(payload.routeId, '/player/[nbaId]');
		assert.equal(payload.vercelId, 'iad1::abc-123');
		assert.equal(payload.error.code, 'PGRST205');
		assert.equal(payload.error.message, "Could not find the table 'player_ratings'");
		assert.equal(payload.error.details, 'Searched schema cache');
		assert.equal(payload.error.hint, 'Reload schema cache');
		assert.equal(payload.ignored, undefined);
	} finally {
		console.error = original;
	}
});

test('handleError logs stack traces for native errors without exposing them', () => {
	const calls = [];
	const original = console.error;
	console.error = (...args) => calls.push(args);

	try {
		const result = handleError({
			error: new Error('Supabase request failed'),
			event: buildEvent({ path: '/team/Boston%20Celtics', routeId: '/team/[team]' }),
			status: 500,
			message: 'Internal Error'
		});

		assert.deepEqual(result, { message: 'Internal Error' });
		const payload = JSON.parse(calls[0][1]);
		assert.equal(payload.path, '/team/Boston%20Celtics');
		assert.equal(payload.error.name, 'Error');
		assert.equal(payload.error.message, 'Supabase request failed');
		assert.match(payload.error.stack, /Supabase request failed/);
	} finally {
		console.error = original;
	}
});

test('handleError still returns the safe message when logging fails', () => {
	const original = console.error;
	console.error = () => {
		throw new Error('logger unavailable');
	};

	try {
		assert.deepEqual(
			handleError({
				error: new Error('boom'),
				event: buildEvent(),
				status: 500,
				message: 'Internal Error'
			}),
			{ message: 'Internal Error' }
		);
	} finally {
		console.error = original;
	}
});
