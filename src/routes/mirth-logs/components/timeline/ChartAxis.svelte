<!-- runes -->
<script>
	import { formatTick } from './utils/chartUtils.js';
	const { xScale, yScale, xTicks, width, height, margin, groupUnit } = $props();
</script>

<g transform={`translate(${margin.left}, 0)`}>
	<line
		x1="0"
		x2="0"
		y1="0"
		y2={height - margin.top - margin.bottom}
		stroke="#e5e7eb"
		stroke-width="2"
		stroke-linecap="round"
	/>
	{#each yScale && typeof yScale.ticks === 'function' ? yScale.ticks(5) : [] as y (y)}
		<line
			x1="0"
			x2={width - margin.left - margin.right}
			y1={yScale(y)}
			y2={yScale(y)}
			stroke="#f8fafc"
			stroke-width="1"
			stroke-dasharray="2,2"
			style="transition: y1 200ms ease, y2 200ms ease"
		/>
		<line
			x1="-6"
			x2="0"
			y1={yScale(y)}
			y2={yScale(y)}
			stroke="#d1d5db"
			stroke-width="1"
			style="transition: y1 200ms ease, y2 200ms ease"
		/>
		<text
			x="-15"
			y={yScale(y)}
			text-anchor="end"
			alignment-baseline="middle"
			font-size="11"
			font-weight="500"
			fill="#6b7280"
			font-family="system-ui, -apple-system, sans-serif"
			style="transition: transform 200ms ease"
			transform={`translate(0, ${yScale(y) - yScale(y)})`}>{y}</text
		>
	{/each}
</g>

<g transform={`translate(0, ${height - margin.bottom})`}>
	<line
		x1={margin.left}
		x2={width - margin.right}
		y1="0"
		y2="0"
		stroke="#e5e7eb"
		stroke-width="2"
		stroke-linecap="round"
	/>
	{#each xTicks as x (x)}
		<!-- Vertical grid line across plot area -->
		<line
			x1={xScale(x)}
			x2={xScale(x)}
			y1={-(height - margin.bottom - margin.top)}
			y2="0"
			stroke="#f1f5f9"
			stroke-width="1"
			stroke-dasharray="2,2"
			style="transition: x1 200ms ease, x2 200ms ease"
		/>
		<line
			x1={xScale(x)}
			x2={xScale(x)}
			y1="0"
			y2="6"
			stroke="#d1d5db"
			stroke-width="1"
			style="transition: x1 200ms ease, x2 200ms ease"
		/>
		<text
			transform={`rotate(-45, ${xScale(x)}, 35)`}
			x={xScale(x)}
			y="35"
			text-anchor="middle"
			font-size="10"
			font-weight="500"
			fill="#6b7280"
			font-family="system-ui, -apple-system, sans-serif"
			style="transition: transform 200ms ease">{formatTick(x, groupUnit, xScale)}</text
		>
	{/each}
</g>
