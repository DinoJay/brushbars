<!-- runes -->
<script>
	import * as d3 from 'd3';
	import { grouped, groupUnit, selectedRange, filteredEntries } from './logStore.js';
	import TimeUnitSelector from './components/TimeUnitSelector.svelte';
	import ChartAxis from './components/ChartAxis.svelte';
	import ChartBars from './components/ChartBars.svelte';
	import ChartBrush from './components/ChartBrush.svelte';
	import { calculateBarWidth } from './utils/chartUtils.js';

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
		if ($grouped.length > 0 && width > 0) {
			const times = $grouped.map((e) => e.time);
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
		if ($grouped.length > 0) {
			const counts = $grouped.map((d) => d.count);
			return d3
				.scaleLinear()
				.domain([0, d3.max(counts)])
				.nice()
				.range([height - margin.bottom, margin.top]);
		}
		return null;
	});

	const xTicks = $derived.by(() => {
		if (xScale && $grouped.length > 0) {
			// Smart tick reduction based on number of bars
			const maxTicks = Math.max(5, Math.min(15, Math.floor(width / 100)));
			const tickCount = Math.min($grouped.length, maxTicks);

			if ($grouped.length === 1) {
				// Generate additional ticks for single bar
				const singleTime = $grouped[0].time;
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
		return calculateBarWidth($grouped, width, margin);
	});

	const filteredGrouped = $derived.by(() => {
		if (!$selectedRange || $selectedRange.length !== 2) return $grouped;

		const [start, end] = $selectedRange.map((d) => d.getTime());

		return $grouped.filter((group) => {
			const t = group.time.getTime();
			return t >= start && t <= end;
		});
	});

	function handleUnitChange(unit) {
		console.log('Time unit changed to:', unit);
	}
</script>

<div class="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
	<div class="mb-4">
		<h2 class="mb-2 text-xl font-bold text-gray-800">📊 Activity Timeline</h2>
		<p class="text-sm text-gray-600">
			Showing {$filteredEntries.length} logs
			{#if $selectedRange}
				<span class="text-blue-600">(filtered)</span>
			{/if}
		</p>
	</div>

	<TimeUnitSelector onUnitChange={handleUnitChange} />

	<!-- Chart Container -->
	<div
		bind:this={container}
		bind:clientWidth={width}
		class="relative h-[350px] w-full rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white"
	>
		{#if xScale && yScale && $grouped && $grouped.length > 0}
			<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} class="overflow-visible">
				<ChartAxis {xScale} {yScale} {xTicks} {width} {height} {margin} {groupUnit} />

				<ChartBars grouped={$grouped} {xScale} {yScale} {barWidth} />

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
