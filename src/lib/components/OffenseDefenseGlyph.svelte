<script>
	// Offense is always a ring and defense a cross, so color is never the only cue.
	let { side = 'offense' } = $props();
</script>

<span class="od-glyph od-glyph--{side === 'defense' ? 'defense' : 'offense'}" aria-hidden="true"></span>

<style>
	.od-glyph {
		position: relative;
		display: inline-block;
		flex: none;
		width: 10px;
		height: 10px;
		transform: translateY(1px);
	}

	.od-glyph--offense {
		border: 2px solid var(--offense);
		border-radius: 50%;
	}

	.od-glyph--defense::before,
	.od-glyph--defense::after {
		content: '';
		position: absolute;
		left: 4px;
		top: -1px;
		width: 2px;
		height: 12px;
		border-radius: 1px;
		background: var(--defense);
	}

	.od-glyph--defense::before {
		transform: rotate(45deg);
	}

	.od-glyph--defense::after {
		transform: rotate(-45deg);
	}
</style>
