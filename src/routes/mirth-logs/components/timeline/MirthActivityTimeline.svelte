<!-- runes -->
<script lang="ts">
	import * as d3 from 'd3';
	import ActivityTimeline from './ActivityTimeline.svelte';
	import type { TimelineEntry } from '$lib/types';

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

	const grouped = $derived.by(() => {
		if (!effectiveEntries || effectiveEntries.length === 0) return [];
		const floor = d3.timeMinute.floor;
		const groups = new Map<
			number,
			{ time: Date; count: number; levels: Record<string, number>; logs: TimelineEntry[] }
		>();
		const entriesArray = Array.isArray(effectiveEntries) ? effectiveEntries : [];
		for (let i = 0; i < entriesArray.length; i++) {
			const log = entriesArray[i];
			const bucketTime = floor(new Date(log.timestamp));
			const key = bucketTime.getTime();
			let group = groups.get(key);
			if (!group) {
				group = { time: bucketTime, count: 0, levels: {}, logs: [] };
				groups.set(key, group);
			}
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
