<!-- runes -->
<script lang="ts">
	import { levelColor, calculateBarPositions } from './utils/chartUtils.js';
	import { logStore, type LogLevel } from '$stores/logStore.svelte';
	import type { TimelineEntry } from '$lib/types';
	const { grouped, xScale, yScale, barWidth, visualRange = null } = $props();

	// visualRange can be either date range or pixel coordinates
	type VisualRange = [Date, Date] | [number, number] | null;

	// Recompute bar positions when inputs change
	const barPositions = $derived.by(() => calculateBarPositions(grouped, xScale, barWidth, 1));

	// Key signature to remount bars on dataset change (no state writes)
	const rerenderKey = $derived.by(() => {
		const g = Array.isArray(grouped) ? grouped : [];
		const len = g.length;
		const firstTs = len > 0 ? ((g[0] as any)?.time?.getTime?.() ?? 0) : 0;
		const lastTs = len > 0 ? ((g[len - 1] as any)?.time?.getTime?.() ?? 0) : 0;
		return `${len}|${firstTs}|${lastTs}`;
	});

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
		const totalHeight = yScale(0) - yScale(totalCount);

		// Add padding between stacked levels (2px gap)
		const padding = 2;
		const totalPadding = (Object.keys(levels).length - 1) * padding;
		const availableHeight = totalHeight - totalPadding;

		Object.entries(levels).forEach(([level, count]) => {
			const levelProportion = (count as number) / totalCount;
			const height = availableHeight * levelProportion;
			const y = yBase - height;
			stackedLevels.push({
				level,
				count: count as number,
				y,
				height,
				x: barPosition.x,
				width: barPosition.width
			});
			yBase = y - padding; // Add padding between levels
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

	function barOpacity(level: LogLevel | string, x: number, width: number) {
		// Level-based dimming
		const selected = logStore.selectedLevel;
		let opacity = 1;
		if (selected && selected !== level) opacity = 0.25;

		// Brush-based filtering: highlight bars within the selected time range
		// Only use visualRange for immediate feedback (pixel coordinates)
		if (visualRange && Array.isArray(visualRange) && typeof visualRange[0] === 'number') {
			const [x0, x1] = visualRange as [number, number];
			const minX = Math.min(x0, x1);
			const maxX = Math.max(x0, x1);

			// Check if bar center is within the selected pixel range
			const barCenter = x + width / 2;
			const isInRange = barCenter >= minX && barCenter <= maxX;

			if (isInRange) {
				// Highlight bars in range (full opacity)
				opacity = Math.max(opacity, 0.9);
			} else {
				// Dim bars outside range
				opacity = Math.min(opacity, 0.2);
			}
		}
		return opacity;
	}
</script>

{#key rerenderKey}
	{#each barPositions as barPosition}
		{#each getStackedLevels(barPosition.bar, barPosition) as bar}
			<rect
				x={bar.x}
				y={bar.y}
				width={bar.width}
				height={bar.height}
				fill={levelColor(bar.level)}
				fill-opacity={barOpacity(bar.level, bar.x, bar.width)}
				rx="2"
				ry="2"
				class="animate-timeline-enter cursor-pointer transition-all duration-300 ease-out hover:opacity-80"
				role="button"
				tabindex="0"
				aria-label={`Filter level ${bar.level}`}
				onclick={() => handleBarClick(bar.level)}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleBarClick(bar.level)}
			/>
		{/each}
	{/each}
{/key}
