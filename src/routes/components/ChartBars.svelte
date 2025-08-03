<!-- runes -->
<script>
	import { levelColor } from '../utils/chartUtils.js';

	const { grouped, xScale, yScale, barWidth } = $props();

	function getStackedLevels(d) {
		const priority = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
		const levels = Object.entries(d.levels).sort(
			(a, b) => (priority[a[0]] ?? 99) - (priority[b[0]] ?? 99)
		);
		const bars = [];
		let yBase = yScale(0);
		const padding = 1; // 1px padding between stacked bars

		for (const [level, count] of levels) {
			const height = Math.max(1, yScale(0) - yScale(count));
			const y = yBase - height;

			bars.push({
				x: xScale(d.time) - barWidth / 2,
				y,
				height: height - padding, // Reduce height by padding
				color: levelColor(level)
			});

			// Move base up by height plus padding
			yBase = y - padding;
		}
		return bars;
	}
</script>

{#each grouped as d}
	{#each getStackedLevels(d) as bar}
		<rect
			x={bar.x}
			y={bar.y}
			width={barWidth}
			height={bar.height}
			fill={bar.color}
			rx="2"
			ry="2"
			class="transition-all duration-200 hover:opacity-80"
		/>
	{/each}
{/each}
