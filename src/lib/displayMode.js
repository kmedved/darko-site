export const DISPLAY_VIEW_CONTEXT = Symbol('darko-display-view');
export const DISPLAY_VIEW_STORAGE_KEY = 'darko-view';
export const DISPLAY_VIEW_QUERY_KEY = 'display';
export const LEGACY_DISPLAY_VIEW_QUERY_KEY = 'view';
export const DISPLAY_VIEWS = Object.freeze(['modern', 'shiny']);

export function normalizeDisplayView(value) {
	return value === 'shiny' ? 'shiny' : 'modern';
}

export function isDisplayView(value) {
	return DISPLAY_VIEWS.includes(value);
}

export function getDisplayViewPreview(searchParams) {
	const displayView = searchParams?.get(DISPLAY_VIEW_QUERY_KEY);
	if (isDisplayView(displayView)) {
		return displayView;
	}

	const legacyView = searchParams?.get(LEGACY_DISPLAY_VIEW_QUERY_KEY);
	return isDisplayView(legacyView) ? legacyView : null;
}
