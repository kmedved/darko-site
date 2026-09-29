// Optional interface fonts (Display → Font). Each loads only when someone picks it; DM Mono, the
// number font, and Archivo, the display font, are the only web fonts app.html loads for everyone.
// app.html keeps a copy of this map for its before-paint script (tests/fonts.test.js checks the
// two agree).
export const OPTIONAL_FONT_FAMILIES = Object.freeze({
	inter: 'Inter:wght@400;500;600;700',
	roboto: 'Roboto:wght@400;500;700',
	lato: 'Lato:wght@400;700',
	opensans: 'Open+Sans:wght@400;500;600;700',
	sourcesans: 'Source+Sans+3:wght@400;500;600;700',
	nunito: 'Nunito+Sans:opsz,wght@6..12,400;6..12,500;6..12,600;6..12,700',
	worksans: 'Work+Sans:wght@400;500;600;700',
	raleway: 'Raleway:wght@400;500;600;700',
	outfit: 'Outfit:wght@400;500;600;700',
	jakarta: 'Plus+Jakarta+Sans:wght@400;500;600;700',
	spacegrotesk: 'Space+Grotesk:wght@400;500;600;700'
});

export function fontStylesheetUrl(key) {
	const family = OPTIONAL_FONT_FAMILIES[key];
	return family ? `https://fonts.googleapis.com/css2?family=${family}&display=swap` : null;
}

/** Add the chosen family's stylesheet once; the system font needs none. */
export function loadOptionalFont(key, doc = globalThis.document) {
	const href = fontStylesheetUrl(key);
	if (!href || !doc?.head || doc.head.querySelector(`link[data-font-family="${key}"]`)) return;
	const link = doc.createElement('link');
	link.rel = 'stylesheet';
	link.href = href;
	link.dataset.fontFamily = key;
	doc.head.appendChild(link);
}
