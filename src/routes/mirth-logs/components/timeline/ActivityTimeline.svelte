<!-- runes -->
<script lang="ts">
	import * as d3 from 'd3';
	import ChartAxis from './ChartAxis.svelte';
	import ChartBars from './ChartBars.svelte';
	import ChartBrush from './ChartBrush.svelte';
	import { calculateBarWidth, groupCloseBars } from './utils/chartUtils.js';

	// Props for reusability
	import type { TimelineEntry } from '$lib/types';
	type GroupedBar = {
		time: Date;
		count: number;
		levels: Record<string, number>;
		logs: TimelineEntry[];
	};
	const {
		data = [] as GroupedBar[],
		groupUnit = 'hour',
		onRangeChange = undefined as undefined | ((range: [Date, Date] | null) => void),
		height = 350,
		timeThreshold = 2 * 60 * 1000, // 2 minutes default
		resetOn = undefined as string | number | null | undefined,
		bucketMinutes = 5 // Default to 5 minutes for chunkier bars
	} = $props();

	// Chart dimensions and margins
	let container = $state<HTMLDivElement | null>(null);
	let width = $state(0);
	const margin = { top: 20, right: 20, bottom: 40, left: 60 };

	// Group bars that are close together (temporal grouping only)
	const temporallyGroupedBars = $derived.by(() => {
		return groupCloseBars(data as any, timeThreshold) as GroupedBar[];
	});

	// Calculate xScale based on temporally grouped bars (no pixel merging yet)
	const xScale = $derived.by(() => {
		if (temporallyGroupedBars.length > 0 && width > 0) {
			const times = temporallyGroupedBars.map((e: GroupedBar) => e.time);
			const [minTime, maxTime] = d3.extent(times) as [Date | undefined, Date | undefined];

			if (minTime && maxTime) {
				const span = (maxTime as Date).getTime() - (minTime as Date).getTime();

				const innerWidth = width - margin.left - margin.right;
				const msPerPx = innerWidth > 0 ? span / innerWidth : 0;

				// Base buffer: widen domain so bars have room without aggressive shrinking
				let buffer =
					span === 0
						? 1000 * 60 * 60 * 6 // 6 hours when single point
						: Math.max(span * 0.5, 1000 * 60 * 60 * 3); // 50% of span or at least 3 hours

				// Ensure enough room for desired bar+gap total width in pixels
				const desiredBarPx = 16; // target bar width
				const desiredGapPx = 4; // target gap
				const requiredPx =
					temporallyGroupedBars.length * desiredBarPx +
					Math.max(0, temporallyGroupedBars.length - 1) * desiredGapPx;
				const shortagePx = Math.max(0, requiredPx - innerWidth);
				if (msPerPx > 0 && shortagePx > 0) {
					buffer = Math.max(buffer, (shortagePx / 2) * msPerPx);
				}

				const start = new Date((minTime as Date).getTime() - buffer);
				const end = new Date((maxTime as Date).getTime() + buffer);

				return d3
					.scaleTime()
					.domain([start, end])
					.range([margin.left, width - margin.right]);
			}
		}
		return null;
	});

	// Now merge bars by pixel proximity using the calculated xScale
	const groupedBars = $derived.by(() => {
		if (!xScale || !temporallyGroupedBars || temporallyGroupedBars.length === 0) {
			return temporallyGroupedBars;
		}
		// Use current barWidth guess to merge neighbors in the same pixel column for chunkier bars
		const estimatedBarWidth = calculateBarWidth(temporallyGroupedBars, width, margin);
		const mergedByPixel = awaitJoinBarsByPixel(temporallyGroupedBars, xScale, estimatedBarWidth);
		return mergedByPixel as GroupedBar[];
	});

	function awaitJoinBarsByPixel(bars: any[], scale: any, bw: number) {
		try {
			// dynamic import to avoid circular refs; chartUtils already exported this function
			const { joinBarsByPixelDistance } = require('../utils/chartUtils.js');
			return joinBarsByPixelDistance(bars, scale, bw, 4);
		} catch {
			// fallback: return original bars if require not available
			return bars;
		}
	}

	const yScale = $derived.by(() => {
		if (groupedBars.length > 0) {
			const counts = groupedBars.map((d: GroupedBar) => d.count);
			const maxCount = (d3.max(counts) ?? 0) as number;

			const yMax = Math.max(Number(maxCount), 1);

			return d3
				.scaleLinear()
				.domain([0, yMax])
				.range([height - margin.bottom, margin.top]);
		}
		return null;
	});

	const xTicks = $derived.by(() => {
		if (xScale && groupedBars.length > 0) {
			const maxTicks = Math.max(5, Math.min(15, Math.floor(width / 100)));
			const tickCount = Math.min(groupedBars.length, maxTicks);

			if (groupedBars.length === 1) {
				const domain = (xScale as any).domain() as [Date, Date];
				const [start, end] = domain;
				const span = (end as Date).getTime() - (start as Date).getTime();
				const tickInterval = span / 5;

				const additionalTicks: Date[] = [];
				for (let i = 0; i < 5; i++) {
					const tickTime = new Date((start as Date).getTime() + i * tickInterval);
					additionalTicks.push(tickTime);
				}
				return additionalTicks;
			} else {
				return (xScale as any).ticks(tickCount);
			}
		}
		return [] as Date[];
	});

	const barWidth = $derived.by(() => {
		return calculateBarWidth(groupedBars, width, margin);
	});

	function handleUnitChange(unit: 'hour' | 'day' | 'month') {
		console.log('Time unit changed to:', unit);
	}

	let resetKey = $state(0);
	let storeUpdateDebounceId: ReturnType<typeof setTimeout> | null = null;

	function clearBrush() {
		resetKey += 1;
		// Clear any pending debounced updates
		if (storeUpdateDebounceId) {
			clearTimeout(storeUpdateDebounceId);
			storeUpdateDebounceId = null;
		}
		// Reset visual range immediately
		visualRange = null;
		onRangeChange?.(null);
	}

	// Separate state for immediate visual feedback vs store updates
	// visualRange can be either date range or pixel coordinates for immediate feedback
	let visualRange = $state<[Date, Date] | null | [number, number] | null>(null);

	function debouncedStoreUpdate(range: [Date, Date] | null) {
		// Clear any existing timeout
		if (storeUpdateDebounceId) {
			clearTimeout(storeUpdateDebounceId);
			storeUpdateDebounceId = null;
		}

		// Debounce store updates to avoid excessive filtering during rapid brush movements
		storeUpdateDebounceId = setTimeout(() => {
			onRangeChange?.(range);
		}, 300); // 300ms debounce for store updates - longer delay for better UX
	}

	// Reset brush when resetOn changes (e.g., selected day)
	$effect(() => {
		if (resetOn === undefined) return;
		// only act when the value truly changed
		if (typeof clearBrush_last === 'undefined') clearBrush_last = resetOn;
		if (resetOn === clearBrush_last) return;
		clearBrush_last = resetOn;
		resetKey += 1;
		// Clear any pending debounced updates
		if (storeUpdateDebounceId) {
			clearTimeout(storeUpdateDebounceId);
			storeUpdateDebounceId = null;
		}
		// Reset visual range immediately
		visualRange = null;
		onRangeChange?.(null);
	});

	// Track last seen resetOn value (outside effect writes)
	let clearBrush_last: string | number | null | undefined = undefined;
</script>

<div class="bg-white p-6">
	<div bind:this={container} bind:clientWidth={width} class="relative h-[350px] w-full">
		{#if xScale && yScale && groupedBars && groupedBars.length > 0}
			<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} class="overflow-visible">
				<ChartAxis {xScale} {yScale} {xTicks} {width} {height} {margin} {groupUnit} />
				<ChartBars grouped={groupedBars} {xScale} {yScale} {barWidth} {visualRange} />
				<ChartBrush
					{xScale}
					{yScale}
					{width}
					{height}
					{margin}
					onRangeChange={(r) => {
						if (!r) {
							// Clear visual range immediately
							visualRange = null;
							onRangeChange?.(null);
							return;
						}

						// Handle new format: [dates, pixels] or just dates
						if (Array.isArray(r[0]) && Array.isArray(r[1])) {
							// During brushing: r = [[startDate, endDate], [startPixel, endPixel]]
							const [dates, pixels] = r;
							const [start, end] = dates as [Date, Date];
							const [x0, x1] = pixels as [number, number];

							// Use pixel coordinates for immediate visual feedback
							const selMinX = Math.min(x0, x1);
							const selMaxX = Math.max(x0, x1);

							// For immediate visual feedback, use the exact pixel selection
							// This ensures the brush visual matches the actual selection
							const hits = groupedBars.filter((g) => {
								const bx = (xScale as any)(g.time);
								const br = bx + (barWidth as any);
								return br >= selMinX && bx <= selMaxX;
							});

							if (hits.length === 0) {
								const invalid = new Date(NaN);
								// Set visual range immediately for instant feedback using pixel coordinates
								visualRange = [x0, x1];
								// Debounce the store update
								debouncedStoreUpdate([invalid, invalid]);
							} else {
								// For immediate feedback, use the exact pixel selection without expansion
								// This keeps the visual brush size accurate
								const [start, end] = dates;
								// Set visual range immediately for instant feedback using pixel coordinates
								visualRange = [x0, x1];
								// Debounce the store update
								debouncedStoreUpdate([start, end]);
							}
						} else {
							// After brushing: r = [startDate, endDate] (debounced)
							const [start, end] = r as [Date, Date];
							// Work in pixel space using grouped bar x + width
							const selMinX = Math.min((xScale as any)(start), (xScale as any)(end));
							const selMaxX = Math.max((xScale as any)(start), (xScale as any)(end));

							const hits = groupedBars.filter((g) => {
								const bx = (xScale as any)(g.time);
								const br = bx + (barWidth as any);
								return br >= selMinX && bx <= selMaxX;
							});

							if (hits.length === 0) {
								const invalid = new Date(NaN);
								// Set visual range immediately for instant feedback
								visualRange = [invalid, invalid];
								// Debounce the store update
								debouncedStoreUpdate([invalid, invalid]);
							} else {
								// Use a smaller expansion factor for more precise selection
								// This prevents the brush from appearing much larger than selected
								const bucketTimes = hits
									.map((g) => g.time)
									.sort((a, b) => a.getTime() - b.getTime());
								const firstBucket = bucketTimes[0];
								const lastBucket = bucketTimes[bucketTimes.length - 1];

								// Calculate bucket size in milliseconds for minimal expansion
								const bucketSizeMs = bucketMinutes * 60 * 1000; // Convert bucketMinutes to ms
								// Use smaller expansion factor (1/4 instead of 1/2) for tighter selection
								const expandedStart = new Date(firstBucket.getTime() - bucketSizeMs / 4);
								const expandedEnd = new Date(lastBucket.getTime() + bucketSizeMs / 4);

								// Snap to the minimally expanded bucket boundaries
								// Set visual range immediately for instant feedback
								visualRange = [expandedStart, expandedEnd];
								// Debounce the store update
								debouncedStoreUpdate([expandedStart, expandedEnd]);
							}
						}
					}}
					{resetKey}
				/>
			</svg>
			<div class="pointer-events-auto absolute top-2 right-2">
				<button
					onclick={clearBrush}
					class="rounded-md border border-gray-200 bg-white/90 px-3 py-1 text-xs shadow-sm hover:bg-white"
				>
					Clear brush
				</button>
			</div>
		{:else}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<div class="mb-2 text-4xl">📊</div>
					<div class="text-gray-500">No data to display</div>
				</div>
			</div>
		{/if}
	</div>
</div>
