<!-- runes -->
<script>
	import { levelColor } from '../utils/chartUtils.js';
	import { logStore } from '../logStore.svelte.ts';

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

			// Apply opacity based on selected level filter
			const opacity = !logStore.selectedLevel || logStore.selectedLevel === level ? 1 : 0.3;

			bars.push({
				x: xScale(d.time) - barWidth / 2,
				y,
				height: height - padding, // Reduce height by padding
				color: levelColor(level),
				opacity,
				level // Add level to the bar object for click handling
			});

			// Move base up by height plus padding
			yBase = y - padding;
		}
		return bars;
	}

	function handleBarClick(level) {
		// Toggle level filter when clicking on bars
		if (logStore.selectedLevel === level) {
			logStore.setSelectedLevel(null); // Clear filter if same level clicked
		} else {
			logStore.setSelectedLevel(level); // Set filter to clicked level
		}
		console.log('Bar clicked for level:', level);
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
			opacity={bar.opacity}
			rx="2"
			ry="2"
			class="cursor-pointer transition-all duration-200 hover:opacity-80"
			onclick={() => handleBarClick(bar.level)}
		/>
	{/each}
{/each}
