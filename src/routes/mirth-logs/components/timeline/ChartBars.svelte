<!-- runes -->
<script>
	import { levelColor, calculateBarPositions } from './utils/chartUtils.js';
	import { logStore } from '$stores/logStore.svelte';
	const { grouped, xScale, yScale, barWidth } = $props();

	const barPositions = $derived.by(() => calculateBarPositions(grouped, xScale, barWidth, 1));

	function getStackedLevels(barData, barPosition) {
		if (!barData || !barData.logs) return [];
		const levels = {};
		barData.logs.forEach((entry) => {
			levels[entry.level] = (levels[entry.level] || 0) + 1;
		});
		const stackedLevels = [];
		let yBase = yScale(0);
		const totalCount = barData.count;
		Object.entries(levels).forEach(([level, count]) => {
			const levelProportion = count / totalCount;
			const totalHeight = yScale(0) - yScale(totalCount);
			const height = totalHeight * levelProportion;
			const y = yBase - height;
			stackedLevels.push({ level, count, y, height, x: barPosition.x, width: barPosition.width });
			yBase = y;
		});
		return stackedLevels;
	}

	function handleBarClick(level) {
		if (logStore.selectedLevel === level) {
			logStore.setSelectedLevel(null);
		} else {
			logStore.setSelectedLevel(level);
		}
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
