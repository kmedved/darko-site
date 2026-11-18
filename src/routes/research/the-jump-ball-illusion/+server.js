import { redirect } from '@sveltejs/kit';

// The jump-ball post moved here when it was retitled; keep old links working.
export function GET({ url }) {
	redirect(308, `/research/does-winning-the-tip-matter${url.search}`);
}
