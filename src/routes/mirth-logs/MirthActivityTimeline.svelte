<!-- runes -->
<script lang="ts">
	import * as d3 from 'd3';
	import ActivityTimeline from './ActivityTimeline.svelte';
	import type { TimelineEntry } from '$lib/types';

	// Props: strictly use provided entries; no store fallback
	const {
		entries,
		onRangeChange = null,
		groupUnit = 'hour'
	} = $props<{
		entries: TimelineEntry[];
		onRangeChange?: (r: [Date, Date]) => void;
		groupUnit?: 'hour' | 'day' | 'month';
	}>();

	const effectiveEntries = $derived(entries);

	// Compute grouped timeline data locally from provided entries
	const grouped = $derived.by(() => {
		const floor = d3.timeMinute.floor;
		const groups = new Map<
			number,
			{ time: Date; count: number; levels: Record<string, number>; logs: TimelineEntry[] }
		>();

		for (const log of effectiveEntries) {
			const bucketTime = floor(new Date(log.timestamp));
			const key = bucketTime.getTime();
			if (!groups.has(key)) {
				groups.set(key, { time: bucketTime, count: 0, levels: {}, logs: [] });
			}
			const group = groups.get(key)!;
			const level = (log.level as string) || 'UNKNOWN';
			group.count += 1;
			group.levels[level] = (group.levels[level] || 0) + 1;
			group.logs.push(log);
		}

		return Array.from(groups.values()).sort((a, b) => a.time.getTime() - b.time.getTime());
	});

	function handleRangeChange(range: [Date, Date]) {
		if (onRangeChange) onRangeChange(range);
	}
</script>

<ActivityTimeline data={grouped} {groupUnit} onRangeChange={handleRangeChange} />
