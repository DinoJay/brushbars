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
	function clearBrush() {
		resetKey += 1;
		onRangeChange?.(null);
	}

	// Reset brush when resetOn changes (e.g., selected day)
	$effect(() => {
		if (resetOn === undefined) return;
		// only act when the value truly changed
		if (typeof clearBrush_last === 'undefined') clearBrush_last = resetOn;
		if (resetOn === clearBrush_last) return;
		clearBrush_last = resetOn;
		resetKey += 1;
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
				<ChartBars grouped={groupedBars} {xScale} {yScale} {barWidth} />
				<ChartBrush
					{xScale}
					{yScale}
					{width}
					{height}
					{margin}
					onRangeChange={(r) => {
						if (!r) {
							onRangeChange?.(null);
							return;
						}
						const [start, end] = r;
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
							onRangeChange?.([invalid, invalid]);
						} else {
							// For chunkier bars, expand the selection to include full bucket boundaries
							// This ensures we capture all data within the selected time buckets
							const bucketTimes = hits.map((g) => g.time).sort((a, b) => a.getTime() - b.getTime());
							const firstBucket = bucketTimes[0];
							const lastBucket = bucketTimes[bucketTimes.length - 1];

							// Calculate bucket size in milliseconds to expand selection
							const bucketSizeMs = bucketMinutes * 60 * 1000; // Convert bucketMinutes to ms
							const expandedStart = new Date(firstBucket.getTime() - bucketSizeMs / 2);
							const expandedEnd = new Date(lastBucket.getTime() + bucketSizeMs / 2);

							// Snap to the expanded bucket boundaries for better data coverage
							onRangeChange?.([expandedStart, expandedEnd]);

							// Log selection info for debugging
							console.log(
								`Brush selection: ${hits.length} buckets (${bucketMinutes}min each), time range: ${expandedStart.toISOString()} to ${expandedEnd.toISOString()}`
							);
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
