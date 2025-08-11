<!-- runes -->
<script lang="ts">
	import * as d3 from 'd3';
	import ChartAxis from '$components/timeline/ChartAxis.svelte';
	import ChartBars from '$components/timeline/ChartBars.svelte';
	import ChartBrush from '$components/timeline/ChartBrush.svelte';
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
		onRangeChange = null as null | ((range: [Date, Date]) => void),
		height = 350,
		timeThreshold = 2 * 60 * 1000 // 2 minutes default
	} = $props();

	// Chart dimensions and margins
	let container = $state<HTMLDivElement | null>(null);
	let width = $state(0);
	const margin = { top: 20, right: 20, bottom: 40, left: 60 };

	// Group bars that are close together
	const groupedBars = $derived.by(() => {
		return groupCloseBars(data as any, timeThreshold) as GroupedBar[];
	});

	// Reactive derived values
	const xScale = $derived.by(() => {
		if (groupedBars.length > 0 && width > 0) {
			const times = groupedBars.map((e: GroupedBar) => e.time);
			const [minTime, maxTime] = d3.extent(times) as [Date | undefined, Date | undefined];

			if (minTime && maxTime) {
				const span = (maxTime as Date).getTime() - (minTime as Date).getTime();
				// Add more buffer for better bar spacing
				const buffer = span === 0 ? 1000 * 60 * 60 : Math.max(span * 0.2, 1000 * 60 * 60); // At least 1 hour buffer

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

	const yScale = $derived.by(() => {
		if (groupedBars.length > 0) {
			const counts = groupedBars.map((d: GroupedBar) => d.count);
			const maxCount = (d3.max(counts) ?? 0) as number;

			console.log('🔍 Y-axis debug - counts:', counts);
			console.log('🔍 Y-axis debug - maxCount:', maxCount);

			// Use a simple, reliable approach
			const yMax = Math.max(Number(maxCount), 1);

			console.log('🔍 Y-axis debug - final yMax:', yMax);

			return d3
				.scaleLinear()
				.domain([0, yMax])
				.range([height - margin.bottom, margin.top]);
		}
		return null;
	});

	const xTicks = $derived.by(() => {
		if (xScale && groupedBars.length > 0) {
			// Smart tick reduction based on number of bars
			const maxTicks = Math.max(5, Math.min(15, Math.floor(width / 100)));
			const tickCount = Math.min(groupedBars.length, maxTicks);

			if (groupedBars.length === 1) {
				// Generate additional ticks for single bar
				const singleTime = groupedBars[0].time as Date;
				const domain = xScale.domain() as [Date, Date];
				const [start, end] = domain;
				const span = (end as Date).getTime() - (start as Date).getTime();
				const tickInterval = span / 5;

				const additionalTicks = [];
				for (let i = 0; i < 5; i++) {
					const tickTime = new Date((start as Date).getTime() + i * tickInterval);
					additionalTicks.push(tickTime);
				}
				return additionalTicks;
			} else {
				// Use D3's smart tick generation with reduced count
				return xScale.ticks(tickCount);
			}
		}
		return [];
	});

	const barWidth = $derived.by(() => {
		return calculateBarWidth(groupedBars, width, margin);
	});

	function handleUnitChange(unit: 'hour' | 'day' | 'month') {
		console.log('Time unit changed to:', unit);
	}
</script>

<div class="bg-white p-6 dark:bg-gray-800">
	<!-- Chart Container -->
	<div bind:this={container} bind:clientWidth={width} class="relative h-[350px] w-full">
		{#if xScale && yScale && groupedBars && groupedBars.length > 0}
			<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} class="overflow-visible">
				<ChartAxis {xScale} {yScale} {xTicks} {width} {height} {margin} {groupUnit} />

				<ChartBars grouped={groupedBars} {xScale} {yScale} {barWidth} />

				<ChartBrush {xScale} {yScale} {width} {height} {margin} {onRangeChange} />
			</svg>
		{:else}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<div class="mb-2 text-4xl">📊</div>
					<div class="text-gray-500 dark:text-gray-400">No data to display</div>
				</div>
			</div>
		{/if}
	</div>
</div>
