<!-- runes -->
<script>
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
	let windowWidth = 0;
	let containerWidth = 0;
	let tick = 0;

	// const width = $derived.by(() => {
	// 	// Use bound containerWidth directly
	// 	console.log('windowWidth:', windowWidth, 'containerWidth:', containerWidth);
	// 	return containerWidth > 0 ? containerWidth : 1900;
	// });
	let width = $state(800);

	// Force a recalculation after mount
	$effect(() => {
		if (container) {
			setTimeout(() => {
				tick = Date.now(); // Force width recalculation
			}, 0);
		}
	});

	const height = 350; // Increase height to accommodate labels
	// Reduce margins to minimal values for maximum space usage
	const margin = { top: 15, right: 15, bottom: 60, left: 45 };

	function formatTick(date) {
		// Get the time span to determine appropriate format
		const domain = xScale?.domain();
		const timeSpan = domain ? domain[1].getTime() - domain[0].getTime() : 0;
		const oneDay = 24 * 60 * 60 * 1000;
		const oneWeek = 7 * oneDay;
		const oneMonth = 30 * oneDay;

		switch ($groupUnit) {
			case 'hour':
				// For hourly view, show more detail
				if (timeSpan <= oneDay) {
					return d3.timeFormat('%H:%M')(date); // e.g. 13:30
				} else if (timeSpan <= oneWeek) {
					return d3.timeFormat('%a %Hh')(date); // e.g. Mon 13h
				} else {
					return d3.timeFormat('%b %d %Hh')(date); // e.g. Aug 02 13h
				}
			case 'day':
				// For daily view
				if (timeSpan <= oneWeek) {
					return d3.timeFormat('%a %d')(date); // e.g. Mon 15
				} else if (timeSpan <= oneMonth) {
					return d3.timeFormat('%b %d')(date); // e.g. Aug 15
				} else {
					return d3.timeFormat('%b %Y')(date); // e.g. Aug 2024
				}
			case 'week':
				// For weekly view
				if (timeSpan <= oneMonth) {
					return `W${d3.timeFormat('%U')(date)}\n${d3.timeFormat('%b %d')(date)}`; // e.g. W32\nAug 05
				} else {
					return `W${d3.timeFormat('%U')(date)}\n${d3.timeFormat('%b %Y')(date)}`; // e.g. W32\nAug 2024
				}
			case 'month':
				// For monthly view
				if (timeSpan <= 12 * oneMonth) {
					return d3.timeFormat('%b')(date); // e.g. Aug
				} else {
					return d3.timeFormat('%b %Y')(date); // e.g. Aug 2024
				}
			default:
				// Default format based on time span
				if (timeSpan <= oneDay) {
					return d3.timeFormat('%H:%M')(date);
				} else if (timeSpan <= oneWeek) {
					return d3.timeFormat('%a %d')(date);
				} else if (timeSpan <= oneMonth) {
					return d3.timeFormat('%b %d')(date);
				} else {
					return d3.timeFormat('%b %Y')(date);
				}
		}
	}

	// Define grouping intervals

	const filteredGrouped = $derived.by(() => {
		if (!$selectedRange || $selectedRange.length !== 2) return $grouped;

		const [start, end] = $selectedRange.map((d) => d.getTime());

		return $grouped.filter((group) => {
			const t = group.time.getTime();
			return t >= start && t <= end;
		});
	});

	// $:console.log('grouped', $grouped)
	// $:console.log('filteredGrouped', $filteredGrouped)

	let brushEl;

	// Add debugging to see what's happening

	// Remove the scale effect entirely and replace with derived values:

	const xScale = $derived.by(() => {
		// console.log('xScale', width);
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
			// If there's only one bar, generate additional ticks around it
			if ($grouped.length === 1) {
				const singleTime = $grouped[0].time;
				const domain = xScale.domain();
				const [start, end] = domain;

				// Generate ticks based on the group unit
				const tickEvery = {
					hour: d3.timeHour.every(1),
					day: d3.timeDay.every(1),
					week: d3.timeWeek.every(1),
					month: d3.timeMonth.every(1)
				};
				const tickGenerator = tickEvery[$groupUnit] || d3.timeHour.every(1);

				// Get standard ticks
				let ticks = xScale.ticks(tickGenerator);

				// If we have very few ticks, add more context
				if (ticks.length < 3) {
					// Add ticks before and after the single data point
					const timeSpan = end.getTime() - start.getTime();
					const halfSpan = timeSpan / 2;

					// Add ticks at regular intervals around the data point
					const additionalTicks = [];
					const numAdditional = 5; // Number of additional ticks to add

					for (let i = 0; i < numAdditional; i++) {
						const offset = (i - Math.floor(numAdditional / 2)) * (halfSpan / (numAdditional - 1));
						const tickTime = new Date(singleTime.getTime() + offset);
						if (tickTime >= start && tickTime <= end) {
							additionalTicks.push(tickTime);
						}
					}

					// Combine and sort ticks
					ticks = [...new Set([...ticks, ...additionalTicks])].sort((a, b) => a - b);
				}

				return ticks;
			} else {
				// Normal case - multiple bars with smart tick reduction
				const availableWidth = width - margin.left - margin.right;
				const maxTicks = Math.floor(availableWidth / 80); // Minimum 80px per tick label

				// Calculate appropriate tick interval based on number of bars and available space
				let tickInterval = 1;
				if ($grouped.length > maxTicks) {
					// If we have more bars than we can display ticks for, increase interval
					tickInterval = Math.ceil($grouped.length / maxTicks);
				}

				// Generate ticks based on the group unit and interval
				const tickEvery = {
					hour: d3.timeHour.every(tickInterval),
					day: d3.timeDay.every(tickInterval),
					week: d3.timeWeek.every(tickInterval),
					month: d3.timeMonth.every(tickInterval)
				};
				const tickGenerator = tickEvery[$groupUnit] || d3.timeHour.every(tickInterval);

				let ticks = xScale.ticks(tickGenerator);

				// If we still have too many ticks, reduce further
				if (ticks.length > maxTicks) {
					// Take every nth tick to get down to maxTicks
					const step = Math.ceil(ticks.length / maxTicks);
					ticks = ticks.filter((_, index) => index % step === 0);
				}

				return ticks;
			}
		}
		return [];
	});

	const barWidth = $derived.by(() => {
		if (xScale && $grouped.length > 0) {
			// Calculate the actual spacing between consecutive data points
			let minSpacing = Infinity;

			if ($grouped.length > 1) {
				// Find the minimum spacing between any two consecutive bars
				for (let i = 1; i < $grouped.length; i++) {
					const spacing = xScale($grouped[i].time) - xScale($grouped[i - 1].time);
					if (spacing > 0 && spacing < minSpacing) {
						minSpacing = spacing;
					}
				}
			}

			// If we couldn't calculate spacing, use a fallback
			if (minSpacing === Infinity) {
				const availableWidth = width - margin.left - margin.right;
				minSpacing = availableWidth / $grouped.length;
			}

			// Define minimum width based on data density
			const minimumWidth = $grouped.length > 100 ? 3 : $grouped.length > 10 ? 4 : 6;

			// Use a conservative approach - bars should never exceed 80% of minimum spacing
			const maxBarWidth = minSpacing * 0.8;

			// Ensure bars meet minimum width and don't overlap
			const calculatedWidth = Math.max(minimumWidth, Math.min(maxBarWidth, 15));

			return calculatedWidth;
		}
		return 10;
	});

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

	// onMount(() => {
	//   if (brushEl && $grouped.length > 0) setupBrush();
	// });

	$effect(() => {
		if (brushEl && xScale && yScale) setupBrush();
	});

	function getStackedLevels(d) {
		const priority = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
		const levels = Object.entries(d.levels).sort(
			(a, b) => (priority[a[0]] ?? 99) - (priority[b[0]] ?? 99)
		);
		const bars = [];
		let yBase = yScale(0);
		for (const [level, count] of levels) {
			const height = Math.max(1, yScale(0) - yScale(count));
			const y = yBase - height;
			// console.log('xScale(d.time)', xScale(d.time));
			bars.push({ x: xScale(d.time) - barWidth / 2, y, height, color: levelColor(level) });
			yBase = y;
		}
		return bars;
	}
</script>

<h2 class="mb-2 text-lg font-semibold">Activity Timeline (Hourly)</h2>
<p class="text-xs text-gray-500">
	Showing {$filteredEntries.length} logs
	{#if $selectedRange}
		(filtered)
	{/if}
</p>
<div class="flex gap-1">
	{#each Object.keys(rounders) as unit}
		<button
			class="rounded border px-3 py-1
             {$groupUnit === unit
				? 'border-blue-600 bg-blue-600 text-white'
				: 'border-gray-300 bg-white text-gray-700 hover:bg-blue-100'}"
			onclick={() => groupUnit.set(unit)}
		>
			{unit}
		</button>
	{/each}
</div>
<div
	bind:this={container}
	bind:clientWidth={width}
	class="h-full min-h-[150px] sm:min-w-full lg:h-[350px]"
>
	{#if xScale && yScale && $grouped && $grouped.length > 0}
		<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} class="overflow-visible">
			<g transform={`translate(${margin.left}, 0)`}>
				{#each yScale && typeof yScale.ticks === 'function' ? yScale.ticks(5) : [] as y}
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
