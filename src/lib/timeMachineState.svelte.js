/**
 * The Time Machine date the reader is viewing (YYYY-MM-DD), or null for today.
 * The layout sets it from ?asof= on every navigation; Rewind moves it while playing.
 */
export const timeMachine = $state({ date: null });

// Kept in sync with the pre-paint script in app.html, which reads it before the first render.
export const TIME_MACHINE_COLLAPSED_KEY = 'darko-time-machine';

/**
 * Fold the Time Machine strip away or bring it back. CSS reads the root attribute, so the strip,
 * its nav toggle and the sticky offsets all follow without a re-render; the choice persists.
 */
export function setTimeMachineCollapsed(collapsed) {
	const root = document.documentElement;
	if (collapsed) root.dataset.timeMachine = 'collapsed';
	else delete root.dataset.timeMachine;
	try {
		if (collapsed) localStorage.setItem(TIME_MACHINE_COLLAPSED_KEY, 'collapsed');
		else localStorage.removeItem(TIME_MACHINE_COLLAPSED_KEY);
	} catch {
		// Storage can be unavailable (private windows); the choice then lasts for this page load.
	}
}
