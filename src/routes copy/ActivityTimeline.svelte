<script>
	import { onMount } from 'svelte';
	import { derived, writable } from 'svelte/store';
	import * as d3 from 'd3';
	import {
		grouped,
		groupUnit,
		rounders,
		selectedRange,
		entries,
		filteredEntries
	} from './logStore.js';

	let container;
	let width = 1000;
	const height = 300;
	const margin = { top: 10, right: 20, bottom: 60, left: 40 };

	function formatTick(date) {
		switch (groupUnit) {
			case 'hour':
				return d3.timeFormat('%b %d %Hh')(date); // e.g. Aug 02 13h
			case 'day':
				return d3.timeFormat('%b %d')(date); // e.g. Aug 02
			case 'week':
				return `W${d3.timeFormat('%U')(date)}\n${d3.timeFormat('%b %d')(date)}`; // e.g. W32\nAug 05
			case 'month':
				return d3.timeFormat('%B')(date); // e.g. August
			default:
				return d3.timeFormat('%b %d %H:%M')(date);
		}
	}

	$: console.log('grouped', $grouped);

	// Define grouping intervals

	export const filteredGrouped = derived([grouped, selectedRange], ([$grouped, $range]) => {
		if (!$range || $range.length !== 2) return $grouped;

		const [start, end] = $range.map((d) => d.getTime());

		return $grouped.filter((group) => {
			const t = group.time.getTime();
			return t >= start && t <= end;
		});
	});

	$: console.log('grouped', $grouped);
	$: console.log('filteredGrouped', $filteredGrouped);

	let xScale,
		yScale,
		xTicks,
		brushEl,
		barWidth = 4;

	$: if (container) {
		const bounds = container.getBoundingClientRect();
		width = bounds.width;
	}

	$: if ($grouped.length > 0) {
		const times = $grouped.map((e) => e.time);

		const counts = $grouped.map((d) => d.count);

		const [minTime, maxTime] = d3.extent(times);

		const span = maxTime - minTime;
		const buffer = span === 0 ? 1000 * 60 * 60 : span * 0.05; // 1h if single point

		const start = new Date(minTime.getTime() - buffer);
		const end = new Date(maxTime.getTime() + buffer);

		xScale = d3
			.scaleTime()
			.domain([start, end])
			.range([margin.left, width - margin.right]);

		yScale = d3
			.scaleLinear()
			.domain([0, d3.max(counts)])
			.nice()
			.range([height - margin.bottom, margin.top]);

		if ($grouped.length > 1) {
			const spacing = xScale($grouped[1].time) - xScale($grouped[0].time);
			barWidth = Math.max(4, Math.min(12, spacing * 0.9));
		} else {
			barWidth = 10;
		}

		const tickEvery = {
			hour: d3.timeHour.every(1),
			day: d3.timeDay.every(1),
			week: d3.timeWeek.every(1),
			month: d3.timeMonth.every(1)
		};

		const tickGenerator = tickEvery[$groupUnit] || d3.timeHour.every(1);
		xTicks = xScale.ticks(tickGenerator);
	}

	function levelColor(level) {
		switch (level) {
			case 'ERROR':
				return '#dc2626';
			case 'WARN':
				return '#facc15';
			case 'INFO':
				return '#16a34a';
			case 'DEBUG':
				return '#64748b';
			default:
				return '#3b82f6';
		}
	}

	function setupBrush() {
		const brush = d3
			.brushX()
			.extent([
				[margin.left, margin.top],
				[width - margin.right, height - margin.bottom]
			])
			.on('end', (event) => {
				if (!event.selection || !xScale) {
					selectedRange.set(null);
					return;
				}
				const [x0, x1] = event.selection;
				console.log('x0', x0, 'x1', x1);
				console.log('selected', [xScale.invert(x0), xScale.invert(x1)]);
				selectedRange.set([xScale.invert(x0), xScale.invert(x1)]);
			});
		d3.select(brushEl).call(brush).call(brush.move, null);
	}

	onMount(() => {
		if (brushEl && $grouped.length > 0) setupBrush();
	});

	$: if (brushEl && xScale && yScale) setupBrush();

	$: getStackedLevels = (d) => {
		const priority = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
		const levels = Object.entries(d.levels).sort(
			(a, b) => (priority[a[0]] ?? 99) - (priority[b[0]] ?? 99)
		);
		const bars = [];
		let yBase = yScale(0);
		for (const [level, count] of levels) {
			const height = Math.max(1, yScale(0) - yScale(count));
			const y = yBase - height;
			bars.push({ x: xScale(d.time) - barWidth / 2, y, height, color: levelColor(level) });
			yBase = y;
		}
		return bars;
	};
</script>

<h2 class="mb-2 text-lg font-semibold">Activity Timeline (Hourly)</h2>
<p class="text-xs text-gray-500">
	Showing {$filteredEntries.length} logs
	{#if $selectedRange}
		(filtered)
	{/if}
</p>
{#each Object.keys(rounders) as unit}
	<button
		class="rounded border px-3 py-1
             {$groupUnit === unit
			? 'border-blue-600 bg-blue-600 text-white'
			: 'border-gray-300 bg-white text-gray-700 hover:bg-blue-100'}"
		on:click={() => groupUnit.set(unit)}
	>
		{unit}
	</button>
{/each}
<div bind:this={container}>
	{#if xScale && yScale && $grouped.length}
		<svg width="100%" {height} viewBox={`0 0 ${width} ${height}`}>
			<g transform={`translate(${margin.left}, 0)`}>
				{#each yScale.ticks(5) as y}
					<line
						x1="0"
						x2={width - margin.left - margin.right}
						y1={yScale(y)}
						y2={yScale(y)}
						stroke="#eee"
					/>
					<text x="-6" y={yScale(y)} text-anchor="end" alignment-baseline="middle" font-size="10"
						>{y}</text
					>
				{/each}
			</g>
			<g transform={`translate(0, ${height - margin.bottom})`}>
				{#each xTicks as x}
					<line x1={xScale(x)} x2={xScale(x)} y1="0" y2="-6" stroke="#999" />
					<text
						transform={`rotate(-45, ${xScale(x)}, 20)`}
						x={xScale(x)}
						y="20"
						text-anchor="middle"
						font-size="10"
					>
						{formatTick(x)}
					</text>
				{/each}
			</g>
			{#each $grouped as d}
				{#each getStackedLevels(d) as bar}
					<rect x={bar.x} y={bar.y} width={barWidth} height={bar.height} fill={bar.color} />
				{/each}
			{/each}
			<g bind:this={brushEl}></g>
		</svg>
	{:else}
		<div>No data to display</div>
	{/if}
</div>
