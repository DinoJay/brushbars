<!-- runes -->
<script>
	import { formatTick } from '../utils/chartUtils.js';

	const { xScale, yScale, xTicks, width, height, margin, groupUnit } = $props();
</script>

<!-- Y-axis with enhanced styling -->
<g transform={`translate(${margin.left}, 0)`}>
	<!-- Y-axis line -->
	<line
		x1="0"
		x2="0"
		y1="0"
		y2={height - margin.top - margin.bottom}
		stroke="#e5e7eb"
		stroke-width="2"
		stroke-linecap="round"
	/>

	<!-- Grid lines and tick labels -->
	{#each yScale && typeof yScale.ticks === 'function' ? yScale.ticks(5) : [] as y}
		<!-- Grid line -->
		<line
			x1="0"
			x2={width - margin.left - margin.right}
			y1={yScale(y)}
			y2={yScale(y)}
			stroke="#f8fafc"
			stroke-width="1"
			stroke-dasharray="2,2"
		/>
		<!-- Y-axis tick -->
		<line x1="-6" x2="0" y1={yScale(y)} y2={yScale(y)} stroke="#d1d5db" stroke-width="1" />
		<!-- Y-axis label -->
		<text
			x="-15"
			y={yScale(y)}
			text-anchor="end"
			alignment-baseline="middle"
			font-size="11"
			font-weight="500"
			fill="#6b7280"
			font-family="system-ui, -apple-system, sans-serif"
		>
			{y}
		</text>
	{/each}
</g>

<!-- X-axis with enhanced styling -->
<g transform={`translate(0, ${height - margin.bottom})`}>
	<!-- X-axis line -->
	<line
		x1={margin.left}
		x2={width - margin.right}
		y1="0"
		y2="0"
		stroke="#e5e7eb"
		stroke-width="2"
		stroke-linecap="round"
	/>

	<!-- X-axis ticks and labels -->
	{#each xTicks as x}
		<!-- X-axis tick -->
		<line x1={xScale(x)} x2={xScale(x)} y1="0" y2="6" stroke="#d1d5db" stroke-width="1" />
		<!-- X-axis label with better positioning -->
		<text
			transform={`rotate(-45, ${xScale(x)}, 35)`}
			x={xScale(x)}
			y="35"
			text-anchor="middle"
			font-size="10"
			font-weight="500"
			fill="#6b7280"
			font-family="system-ui, -apple-system, sans-serif"
		>
			{formatTick(x, groupUnit, xScale)}
		</text>
	{/each}
</g>
