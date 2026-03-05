import { redirect } from '@sveltejs/kit';

export function GET() {
	throw redirect(307, '/logo-light.png');
}
