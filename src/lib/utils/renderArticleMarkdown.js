import { marked, Renderer } from 'marked';

export function renderArticleMarkdown(articleMarkdown) {
	const renderer = new Renderer();
	renderer.heading = function ({ tokens, depth }) {
		const text = this.parser.parseInline(tokens);
		const slug = tokens
			.map((token) => token.raw)
			.join('')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
		return `<h${depth} id="${slug}">${text}</h${depth}>`;
	};

	const articleBody = articleMarkdown
		.replace(/^# .+\n+/, '')
		.replace(/^\*.+\*\n+/, '');

	return marked
		.parse(articleBody, {
			gfm: true,
			renderer
		})
		.replaceAll('<table>', '<div class="story-table-scroll"><table>')
		.replaceAll('</table>', '</table></div>');
}
