<!-- runes -->
<script>
	import { levelColor, calculateBarPositions } from '../utils/chartUtils.js';
	import { logStore } from '../../../stores/logStore.svelte';

	const { grouped, xScale, yScale, barWidth } = $props();

	// Calculate bar positions with proper spacing
	const barPositions = $derived.by(() => {
		return calculateBarPositions(grouped, xScale, barWidth, 8); // Increased gap from 4 to 8 pixels
	});

	function getStackedLevels(barData, barPosition) {
		const priority = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
		const levels = Object.entries(barData.levels).sort(
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
				x: barPosition.x,
				y,
				height: height - padding, // Reduce height by padding
				color: levelColor(level),
				opacity,
				level, // Add level to the bar object for click handling
				width: barPosition.width // Use the positioned width
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

{#each barPositions as barPosition}
	{#each getStackedLevels(barPosition.bar, barPosition) as bar}
		<rect
			x={bar.x}
			y={bar.y}
			width={bar.width}
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
