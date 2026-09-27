/**
 * The Time Machine date the reader is viewing (YYYY-MM-DD), or null for today.
 * The layout sets it from ?asof= on every navigation; Rewind moves it while playing.
 */
export const timeMachine = $state({ date: null });

import { isTimeMachineFolded } from '$lib/utils/timeMachine.js';

// Kept in sync with the pre-paint script in app.html, which reads it before the first render.
// It holds the reader's own choice, 'collapsed' or 'open'; with neither, the default applies.
export const TIME_MACHINE_COLLAPSED_KEY = 'darko-time-machine';

let choice;

function readChoice() {
	if (choice === undefined) {
		try {
			choice = localStorage.getItem(TIME_MACHINE_COLLAPSED_KEY);
		} catch {
			choice = null;
		}
	}
	return choice;
}

// CSS reads the root attribute, so the strip, its nav toggle and the sticky offsets all follow
// without a re-render.
function applyFold(folded) {
	const root = document.documentElement;
	if (folded === (root.dataset.timeMachine === 'collapsed')) return;
	if (folded) root.dataset.timeMachine = 'collapsed';
	else delete root.dataset.timeMachine;
}

/** The reader folds the strip away or brings it back; the choice persists. */
export function setTimeMachineCollapsed(collapsed) {
	choice = collapsed ? 'collapsed' : 'open';
	applyFold(collapsed);
	try {
		localStorage.setItem(TIME_MACHINE_COLLAPSED_KEY, choice);
	} catch {
		// Storage can be unavailable (private windows); the choice then lasts for this page load.
	}
}

/** Re-apply the fold rule after a navigation or a date change (see isTimeMachineFolded). */
export function syncTimeMachineFold({ rewound, pathname }) {
	applyFold(isTimeMachineFolded(readChoice(), { rewound, pathname }));
}
