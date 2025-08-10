<!-- runes -->
<script lang="ts">
	import * as d3 from 'd3';
	const {
		xScale,
		yScale,
		width,
		height,
		margin,
		onRangeChange = null,

		resetKey = 0,
		debounceMs = 50
	} = $props<{
		xScale: any;
		yScale: any;
		width: number;
		height: number;
		margin: { top: number; right: number; bottom: number; left: number };
		onRangeChange?: (range: [Date, Date] | null | [[Date, Date], [number, number]]) => void;
		resetKey?: number;
		debounceMs?: number;
	}>();
	let brushEl: SVGGElement | null = null;
	let brushInstance: d3.BrushBehavior<any> | null = null;
	let debounceId: ReturnType<typeof setTimeout> | null = null;
	function emitDebounced(range: [Date, Date] | null | [[Date, Date], [number, number]]) {
		// Clear any existing timeout
		if (debounceId) {
			clearTimeout(debounceId);
			debounceId = null;
		}

		// For immediate feedback during brushing, emit immediately
		// For final state, use debouncing
		if (range === null) {
			// Clearing selection - emit immediately
			onRangeChange?.(null);
		} else {
			// New selection - debounce to avoid excessive updates
			debounceId = setTimeout(() => onRangeChange?.(range), debounceMs);
		}
	}

	function setupBrush() {
		if (!brushEl || !xScale) return;
		d3.select(brushEl).selectAll('*').remove();
		brushInstance = d3
			.brushX()
			.extent([
				[margin.left, margin.top],
				[width - margin.right, height - margin.bottom]
			])
			.on('start', (event: any) => {
				// Clear any pending debounced calls when brushing starts
				if (debounceId) {
					clearTimeout(debounceId);
					debounceId = null;
				}
			})
			.on('brush', (event: any) => {
				// Handle intermediate brush states for responsive feedback
				if (!event.selection || !xScale) {
					emitDebounced(null);
					return;
				}
				const [x0, x1] = event.selection as [number, number];
				const selectedRange: [Date, Date] = [xScale.invert(x0), xScale.invert(x1)];
				// Pass both date range and pixel coordinates for immediate visual feedback
				onRangeChange?.([selectedRange, [x0, x1]]);
			});
		// .on('end', (event: any) => {
		// 	// Final brush state
		// 	if (!event.selection || !xScale) {
		// 		emitDebounced(null);
		// 		return;
		// 	}
		// 	const [x0, x1] = event.selection as [number, number];
		// 	const selectedRange: [Date, Date] = [xScale.invert(x0), xScale.invert(x1)];
		// 	emitDebounced(selectedRange);
		// });
		d3.select(brushEl)
			.call(brushInstance)
			.call(brushInstance.move as any, null);
	}
	$effect(() => {
		if (brushEl && xScale && yScale && !brushInstance) setupBrush();
	});
	$effect(() => {
		if (brushInstance && brushEl && xScale && yScale) {
			(brushInstance as any).extent([
				[margin.left, margin.top],
				[width - margin.right, height - margin.bottom]
			]);
			d3.select(brushEl).call(brushInstance as any);
		}
	});
	// Clear selection when resetKey changes
	$effect(() => {
		resetKey; // track
		if (brushInstance && brushEl) {
			d3.select(brushEl).call((brushInstance as any).move, null);
			if (debounceId) clearTimeout(debounceId);
			onRangeChange?.(null);
		}
	});
</script>

<g bind:this={brushEl} class="brush-overlay"></g>
