import { redirect } from '@sveltejs/kit';

export function GET() {
	throw redirect(307, '/darko-logo-black.png');
}
