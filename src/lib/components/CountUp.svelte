<script>
	// A figure that runs to its new value instead of jumping, for readouts that change with a
	// filter. `format` turns the number into text; a missing value shows as `format(null)`.
	// Reduced motion shows the new value at once.
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	let { value = null, format = (number) => String(number), duration = 550 } = $props();

	const finite = $derived(Number.isFinite(value));
	const tween = Tween.of(() => (finite ? value : 0), {
		duration: () => (prefersReducedMotion.current ? 0 : duration),
		easing: cubicOut
	});
</script>

{finite ? format(tween.current) : format(null)}
