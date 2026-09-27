/**
 * Scroll-edge cues for wide tables. While `scroller` hides content past its left or right edge,
 * `host` (a non-scrolling wrapper around it) carries data-overflow-left / data-overflow-right,
 * and app.css fades that edge so a cut-off column reads as "more this way".
 *
 * Returns a cleanup function that removes the listeners and the attributes.
 */
export function trackScrollEdges(host, scroller) {
	if (!host || !scroller) return () => {};

	let frame = 0;

	const update = () => {
		frame = 0;
		const hiddenRight = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;
		setFlag(host, 'overflowLeft', scroller.scrollLeft > 1);
		setFlag(host, 'overflowRight', hiddenRight > 1);
	};

	const schedule = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};

	const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
	observer?.observe(scroller);
	if (scroller.firstElementChild) observer?.observe(scroller.firstElementChild);
	scroller.addEventListener('scroll', schedule, { passive: true });
	window.addEventListener('resize', schedule);
	update();

	return () => {
		if (frame) cancelAnimationFrame(frame);
		observer?.disconnect();
		scroller.removeEventListener('scroll', schedule);
		window.removeEventListener('resize', schedule);
		setFlag(host, 'overflowLeft', false);
		setFlag(host, 'overflowRight', false);
	};
}

function setFlag(element, key, on) {
	if (on) element.dataset[key] = '';
	else delete element.dataset[key];
}

/**
 * Svelte action: `use:scrollEdges={'.table-scroll-region'}` on the wrapper that should show the
 * fades, naming the scrolling element inside it.
 */
export function scrollEdges(node, selector) {
	let cleanup = trackScrollEdges(node, node.querySelector(selector));
	return {
		update(nextSelector) {
			cleanup();
			cleanup = trackScrollEdges(node, node.querySelector(nextSelector));
		},
		destroy() {
			cleanup();
		}
	};
}
