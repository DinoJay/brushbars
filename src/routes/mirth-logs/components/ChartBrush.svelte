<!-- runes -->
<script>
	import * as d3 from 'd3';

	const { xScale, yScale, width, height, margin, onRangeChange = null } = $props();

	let brushEl;
	let brushInstance = null;

	function setupBrush() {
		if (!brushEl || !xScale) return;

		// Clear any existing brush
		d3.select(brushEl).selectAll('*').remove();

		// Create new brush instance
		brushInstance = d3
			.brushX()
			.extent([
				[margin.left, margin.top],
				[width - margin.right, height - margin.bottom]
			])
			.on('end', (event) => {
				if (!event.selection || !xScale) {
					if (onRangeChange) {
						onRangeChange(null);
					}
					return;
				}
				const [x0, x1] = event.selection;
				console.log('x0', x0, 'x1', x1);
				const selectedRange = [xScale.invert(x0), xScale.invert(x1)];
				console.log('selected', selectedRange);
				if (onRangeChange) {
					onRangeChange(selectedRange);
				}
			});

		d3.select(brushEl).call(brushInstance).call(brushInstance.move, null);
	}

	// Initial brush setup - only runs once when brushEl and scales are ready
	$effect(() => {
		if (brushEl && xScale && yScale && !brushInstance) {
			console.log('Initial brush setup');
			setupBrush();
		}
	});

	// Update brush extent when width changes - preserves brush state
	$effect(() => {
		if (brushInstance && brushEl && xScale && yScale) {
			console.log('Updating brush extent for width change:', width);
			// Update the brush extent without re-initializing
			brushInstance.extent([
				[margin.left, margin.top],
				[width - margin.right, height - margin.bottom]
			]);
			// Re-apply the brush to update its extent
			d3.select(brushEl).call(brushInstance);
		}
	});
</script>

<!-- Brush overlay - must be last so it appears on top -->
<g bind:this={brushEl} class="brush-overlay"></g>
