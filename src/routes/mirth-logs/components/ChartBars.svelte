<!-- runes -->
<script>
	import { levelColor, calculateBarPositions } from '../utils/chartUtils.js';
	import { logStore } from '../../../stores/logStore.svelte';

	const { grouped, xScale, yScale, barWidth } = $props();

	// Calculate bar positions with proper spacing
	const barPositions = $derived.by(() => {
		return calculateBarPositions(grouped, xScale, barWidth, 1); // Reduced gap to 1 pixel for minimal impact on brushing
	});

	// Get stacked levels for a bar with proper positioning
	function getStackedLevels(barData, barPosition) {
		if (!barData || !barData.logs) {
			return [];
		}

		const levels = {};
		barData.logs.forEach((entry) => {
			const level = entry.level;
			levels[level] = (levels[level] || 0) + 1;
		});

		const stackedLevels = [];
		let yBase = yScale(0); // Start from the bottom of the chart
		const totalCount = barData.count; // Use the total count for proper scaling

		console.log('🔍 Bar debug - barData.count:', totalCount);
		console.log('🔍 Bar debug - yScale(0):', yScale(0));
		console.log('🔍 Bar debug - yScale(totalCount):', yScale(totalCount));

		Object.entries(levels).forEach(([level, count]) => {
			// Calculate the height based on the proportion of this level to total
			const levelProportion = count / totalCount;
			const totalHeight = yScale(0) - yScale(totalCount);
			const height = totalHeight * levelProportion;
			const y = yBase - height;

			console.log('🔍 Bar debug - level:', level, 'count:', count, 'height:', height, 'y:', y);

			stackedLevels.push({
				level,
				count,
				y: y,
				height: height,
				x: barPosition.x,
				width: barPosition.width
			});

			// Move base up by height for next level
			yBase = y;
		});

		return stackedLevels;
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
			fill={levelColor(bar.level)}
			opacity={1}
			rx="2"
			ry="2"
			class="cursor-pointer transition-all duration-200 hover:opacity-80"
			onclick={() => handleBarClick(bar.level)}
		/>
	{/each}
{/each}
