<!-- runes -->
<script>
	import * as d3 from 'd3';
	const { xScale, yScale, width, height, margin, onRangeChange = null } = $props();
	let brushEl;
	let brushInstance = null;
	function setupBrush() {
		if (!brushEl || !xScale) return;
		d3.select(brushEl).selectAll('*').remove();
		brushInstance = d3
			.brushX()
			.extent([
				[margin.left, margin.top],
				[width - margin.right, height - margin.bottom]
			])
			.on('end', (event) => {
				if (!event.selection || !xScale) {
					if (onRangeChange) onRangeChange(null);
					return;
				}
				const [x0, x1] = event.selection;
				const selectedRange = [xScale.invert(x0), xScale.invert(x1)];
				if (onRangeChange) onRangeChange(selectedRange);
			});
		d3.select(brushEl).call(brushInstance).call(brushInstance.move, null);
	}
	$effect(() => {
		if (brushEl && xScale && yScale && !brushInstance) setupBrush();
	});
	$effect(() => {
		if (brushInstance && brushEl && xScale && yScale) {
			brushInstance.extent([
				[margin.left, margin.top],
				[width - margin.right, height - margin.bottom]
			]);
			d3.select(brushEl).call(brushInstance);
		}
	});
</script>

<g bind:this={brushEl} class="brush-overlay"></g>
