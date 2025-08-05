<!-- runes -->
<script>
	import * as d3 from 'd3';
	import { logStore } from '../../stores/logStore.svelte';
	import ChartAxis from './components/ChartAxis.svelte';
	import ChartBars from './components/ChartBars.svelte';
	import ChartBrush from './components/ChartBrush.svelte';
	import { calculateBarWidth } from './utils/chartUtils.js';

	$effect(() => {
		console.log('logStore.grouped', logStore.grouped);
	});

	let container;
	let width = $state(800);
	let height = $state(350);

	// Update margins to add more padding
	const margin = {
		top: 20,
		right: 30,
		bottom: 60,
		left: 50
	};

	// Reactive derived values
	const xScale = $derived.by(() => {
		if (logStore.grouped.length > 0 && width > 0) {
			const times = logStore.grouped.map((e) => e.time);
			const [minTime, maxTime] = d3.extent(times);

			if (minTime && maxTime) {
				const span = maxTime.getTime() - minTime.getTime();
				const buffer = span === 0 ? 1000 * 60 * 60 : span * 0.05;

				const start = new Date(minTime.getTime() - buffer);
				const end = new Date(maxTime.getTime() + buffer);

				return d3
					.scaleTime()
					.domain([start, end])
					.range([margin.left, width - margin.right]);
			}
		}
		return null;
	});

	const yScale = $derived.by(() => {
		if (logStore.grouped.length > 0) {
			const counts = logStore.grouped.map((d) => d.count);
			return d3
				.scaleLinear()
				.domain([0, d3.max(counts)])
				.nice()
				.range([height - margin.bottom, margin.top]);
		}
		return null;
	});

	const xTicks = $derived.by(() => {
		if (xScale && logStore.grouped.length > 0) {
			// Smart tick reduction based on number of bars
			const maxTicks = Math.max(5, Math.min(15, Math.floor(width / 100)));
			const tickCount = Math.min(logStore.grouped.length, maxTicks);

			if (logStore.grouped.length === 1) {
				// Generate additional ticks for single bar
				const singleTime = logStore.grouped[0].time;
				const domain = xScale.domain();
				const [start, end] = domain;
				const span = end.getTime() - start.getTime();
				const tickInterval = span / 5;

				const additionalTicks = [];
				for (let i = 0; i < 5; i++) {
					const tickTime = new Date(start.getTime() + i * tickInterval);
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
		return calculateBarWidth(logStore.grouped, width, margin);
	});

	function handleUnitChange(unit) {
		console.log('Time unit changed to:', unit);
	}
</script>

<div class="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
	<!-- Chart Container -->
	<div
		bind:this={container}
		bind:clientWidth={width}
		class="relative h-[350px] w-full rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white"
	>
		{#if xScale && yScale && logStore.grouped && logStore.grouped.length > 0}
			<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} class="overflow-visible">
				<ChartAxis
					{xScale}
					{yScale}
					{xTicks}
					{width}
					{height}
					{margin}
					groupUnit={logStore.groupUnit}
				/>

				<ChartBars grouped={logStore.grouped} {xScale} {yScale} {barWidth} />

				<ChartBrush {xScale} {yScale} {width} {height} {margin} />
			</svg>
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
