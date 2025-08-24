<!-- ChartSkeleton.svelte (Svelte 5 + TypeScript) -->
<script lang="ts">
	import * as d3 from 'd3';
	// Props
	export let className: string = '';
	export let bars: number = 8; // fewer placeholder bars
	export let maxBar: number = 220; // taller bars for stronger presence
	export let gridSteps: number = 6; // horizontal grid lines

	// Create varied bar heights to feel realistic
	const baseCycle = [0.75, 1, 0.5, 0.85, 0.3, 0.78, 0.52, 0.78, 0.52, 0.26, 0.78, 0.26];

	const heights: number[] = Array.from({ length: bars }, (_, i) => {
		const h = Math.max(0.15, baseCycle[i % baseCycle.length]);
		return h * maxBar;
	});

	// Geometry helpers for the bars layout
	const plotWidth = 1200; // match viewBox width to avoid side padding
	const plotHeight = 290; // match viewBox height

	const leftPad = 50;
	const topPad = 20;

	// d3 scales
	const xDomain: number[] = Array.from({ length: bars }, (_, i) => i);
	const chartInnerWidth = plotWidth - 50;
	const visibleFraction = 0.6; // occupy 60% of the width and center
	const innerWidth = chartInnerWidth * visibleFraction;
	const leftOffset = (chartInnerWidth - innerWidth) / 2;
	const xScale = d3
		.scaleBand()
		.domain(xDomain)
		.range([leftOffset, leftOffset + innerWidth])
		.paddingInner(0.6)
		.paddingOuter(0.4);
	const bandwidth = xScale.bandwidth();

	const yScale = d3.scaleLinear().domain([0, maxBar]).range([plotHeight, 0]);

	const xAt = (i: number) => xScale(i) ?? 0;
	const yAt = (h: number) => yScale(h);

	// grid ticks
	const yTicks = yScale.ticks(gridSteps);
	const xGridScale = d3.scaleLinear().domain([0, 12]).range([0, plotWidth]);
</script>

<div
	class={`relative w-full rounded-2xl p-4 md:p-6 ${className}`}
	style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border); box-shadow: var(--shadow-sm);"
	aria-hidden="true"
>
	<!-- "Clear brush" pill -->
	<div class="absolute top-3 right-3">
		<div
			class="h-7 w-28 rounded-lg"
			style="background-color: var(--color-bg-tertiary); border: 1px solid var(--color-border);"
		></div>
	</div>

	<div class="h-[350px] w-full">
		<svg viewBox="0 0 1200 350" preserveAspectRatio="none" class="h-full w-full">
			<!-- defs: shimmer gradient & mask -->
			<defs>
				<linearGradient id="shimmer" x1="0" x2="1">
					<stop offset="0%" stop-color="white" stop-opacity="0.05" />
					<stop offset="50%" stop-color="white" stop-opacity="0.35" />
					<stop offset="100%" stop-color="white" stop-opacity="0.05" />
					<animate attributeName="x1" values="-1;1" dur="1.6s" repeatCount="indefinite" />
					<animate attributeName="x2" values="0;2" dur="1.6s" repeatCount="indefinite" />
				</linearGradient>
				<mask id="shimmer-mask">
					<rect width="1200" height="350" fill="url(#shimmer)" />
				</mask>
			</defs>

			<!-- chart group -->
			<g transform={`translate(${leftPad},${topPad})`}>
				<!-- horizontal dotted grid from yScale ticks -->
				{#each yTicks as t}
					<line
						x1="0"
						x2={plotWidth}
						y1={yScale(t)}
						y2={yScale(t)}
						stroke="#93a3b933"
						stroke-dasharray="3 6"
						stroke-width="2"
					/>
				{/each}

				<!-- vertical dotted grid (13 ticks) evenly across width -->
				{#each Array.from({ length: 13 }) as _, i}
					<line
						x1={xGridScale(i)}
						x2={xGridScale(i)}
						y1="0"
						y2={plotHeight}
						stroke="#93a3b933"
						stroke-dasharray="3 6"
						stroke-width="2"
					/>
				{/each}

				<!-- Y axis -->
				<line
					x1="0"
					x2="0"
					y1="0"
					y2={plotHeight}
					stroke="#e5edf7"
					stroke-width="3"
					stroke-linecap="round"
				/>

				<!-- X axis baseline -->
				<line
					x1="0"
					x2={plotWidth}
					y1={plotHeight}
					y2={plotHeight}
					stroke="#e5edf7"
					stroke-width="3"
					stroke-linecap="round"
				/>

				<!-- placeholder bars -->
				{#each heights as h, i}
					<rect
						x={xAt(i)}
						y={yAt(h)}
						width={bandwidth - 20}
						height={Math.max(1, plotHeight - yAt(h))}
						rx="3"
						fill="#76a9ff"
						opacity="0.7"
					/>
				{/each}

				<!-- shimmer overlay -->
				<rect
					width={plotWidth}
					height={plotHeight}
					fill="#ffffff"
					mask="url(#shimmer-mask)"
					opacity="0.25"
				/>
			</g>
		</svg>
	</div>
</div>
