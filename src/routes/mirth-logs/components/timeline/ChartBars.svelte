<!-- runes -->
<script lang="ts">
	import { levelColor, calculateBarPositions } from './utils/chartUtils.js';
	import { logStore, type LogLevel } from '$stores/logStore.svelte';
	import type { TimelineEntry } from '$lib/types';
	const { grouped, xScale, yScale, barWidth } = $props();

	const barPositions = $derived.by(() => calculateBarPositions(grouped, xScale, barWidth, 1));

	type BarData = { count: number; logs?: TimelineEntry[] };
	type BarPosition = { x: number; width: number; bar?: BarData };

	function getStackedLevels(barData: BarData, barPosition: BarPosition) {
		if (!barData || !barData.logs)
			return [] as Array<{
				level: string;
				count: number;
				y: number;
				height: number;
				x: number;
				width: number;
			}>;
		const levels: Record<string, number> = {};
		barData.logs.forEach((entry: TimelineEntry) => {
			const level = (entry as any).level as string;
			levels[level] = (levels[level] || 0) + 1;
		});
		const stackedLevels: Array<{
			level: string;
			count: number;
			y: number;
			height: number;
			x: number;
			width: number;
		}> = [];
		let yBase = yScale(0);
		const totalCount = barData.count;
		Object.entries(levels).forEach(([level, count]) => {
			const levelProportion = (count as number) / totalCount;
			const totalHeight = yScale(0) - yScale(totalCount);
			const height = totalHeight * levelProportion;
			const y = yBase - height;
			stackedLevels.push({
				level,
				count: count as number,
				y,
				height,
				x: barPosition.x,
				width: barPosition.width
			});
			yBase = y;
		});
		return stackedLevels;
	}

	function handleBarClick(level: LogLevel | string) {
		if (logStore.selectedLevel === level) {
			logStore.setSelectedLevel(null);
		} else {
			logStore.setSelectedLevel(level as LogLevel);
		}
	}

	function barOpacity(level: LogLevel | string, x: number) {
		// Level-based dimming
		const selected = logStore.selectedLevel;
		let opacity = 1;
		if (selected && selected !== level) opacity = 0.25;

		// Brush-based dimming (if a range is selected, reduce opacity for bars outside it)
		const range = logStore.selectedRange as [Date, Date] | null;
		if (range && xScale) {
			const [start, end] = range;
			const startX = (xScale as any)(start);
			const endX = (xScale as any)(end);
			if (x < Math.min(startX, endX) || x > Math.max(startX, endX)) {
				opacity = Math.min(opacity, 0.2);
			}
		}
		return opacity;
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
			opacity={barOpacity(bar.level, bar.x)}
			rx="2"
			ry="2"
			class="cursor-pointer transition-all duration-200 hover:opacity-80"
			role="button"
			tabindex="0"
			aria-label={`Filter level ${bar.level}`}
			onclick={() => handleBarClick(bar.level)}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleBarClick(bar.level)}
		/>
	{/each}
{/each}
