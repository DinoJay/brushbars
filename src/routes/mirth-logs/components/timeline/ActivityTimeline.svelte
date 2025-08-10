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
		resetOn = undefined as string | number | null | undefined
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
				const buffer = span === 0 ? 1000 * 60 * 60 : Math.max(span * 0.2, 1000 * 60 * 60);

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
						const hits = groupedBars.filter((g) => {
							const t = g.time.getTime();
							return t >= start.getTime() && t <= end.getTime();
						});
						if (hits.length === 0) {
							const invalid = new Date(NaN);
							onRangeChange?.([invalid, invalid]);
						} else {
							const first = hits[0].time.getTime();
							const last = hits[hits.length - 1].time.getTime();
							// Expand to the end of the last bucket (1 minute buckets)
							const endEdge = new Date(last + 60 * 1000);
							onRangeChange?.([new Date(first), endEdge]);
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
