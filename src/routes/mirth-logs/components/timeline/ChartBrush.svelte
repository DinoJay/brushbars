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
	let brushTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
				// Clear any pending timeouts when brushing starts
				if (debounceId) {
					clearTimeout(debounceId);
					debounceId = null;
				}
				if (brushTimeoutId) {
					clearTimeout(brushTimeoutId);
					brushTimeoutId = null;
				}
			})
			.on('brush', (event: any) => {
				// Handle brush states for both visual feedback and final selection
				if (!event.selection || !xScale) {
					onRangeChange?.(null);
					return;
				}
				const [x0, x1] = event.selection as [number, number];
				if (Math.abs(x1 - x0) < 1) {
					// Treat degenerate (zero-width) as clear
					onRangeChange?.(null);
					return;
				}
				const selectedRange: [Date, Date] = [xScale.invert(x0), xScale.invert(x1)];

				// Clear any existing brush timeout
				if (brushTimeoutId) {
					clearTimeout(brushTimeoutId);
				}

				// During brushing - emit pixel coordinates for visual feedback
				onRangeChange?.([selectedRange, [x0, x1]]);

				// Set a timeout to emit final selection after brushing stops
				brushTimeoutId = setTimeout(() => {
					console.log('🎯 Brush timeout - emitting final selection:', selectedRange);
					onRangeChange?.(selectedRange);
					brushTimeoutId = null;
				}, 100); // 100ms delay to detect when brushing stops
			})
			.on('end', (event: any) => {
				// Clear the brush timeout since we're handling the end event
				if (brushTimeoutId) {
					clearTimeout(brushTimeoutId);
					brushTimeoutId = null;
				}

				// Handle final brush state
				if (!event.selection || !xScale) {
					console.log('🗑️ Brush end - clearing selection');
					onRangeChange?.(null);
					return;
				}

				const [x0, x1] = event.selection as [number, number];
				if (Math.abs(x1 - x0) < 1) {
					console.log('🗑️ Brush end - degenerate selection, clearing');
					onRangeChange?.(null);
					return;
				}

				const selectedRange: [Date, Date] = [xScale.invert(x0), xScale.invert(x1)];
				console.log('✅ Brush end - emitting final selection:', selectedRange);
				onRangeChange?.(selectedRange);
			});
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
