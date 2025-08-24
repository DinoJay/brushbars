<!-- runes -->
<script lang="ts">
	import TimelineSkeleton from './TimelineSkeleton.svelte';
	import * as d3 from 'd3';
	import ActivityTimeline from './ActivityTimeline.svelte';
	import type { TimelineEntry } from '$lib/types';

	const {
		entries,
		onRangeChange = null,
		groupUnit = 'hour',
		resetOn = undefined as string | number | null | undefined,
		loading = false
	} = $props<{
		entries: TimelineEntry[];
		onRangeChange?: (r: [Date, Date] | null) => void;
		groupUnit?: 'hour' | 'day' | 'month';
		resetOn?: string | number | null;
		loading?: boolean;
	}>();

	const effectiveEntries = $derived(entries);

	// Choose an adaptive bucket size (in minutes) based on total span and a target bar count
	const bucketMinutes = $derived.by(() => {
		if (!effectiveEntries || effectiveEntries.length === 0) return 5; // Minimum 5 minutes for chunkier bars
		const times = effectiveEntries.map((e) => new Date(e.timestamp).getTime());
		const minT = Math.min(...times);
		const maxT = Math.max(...times);
		const totalMinutes = Math.max(1, Math.round((maxT - minT) / 60000));
		const targetBars = 60; // Reduced to 60 for even chunkier bars
		const raw = Math.max(5, Math.ceil(totalMinutes / targetBars)); // Minimum 5 minutes
		const allowed = [5, 10, 15, 30, 60, 120, 240]; // Start with 5 minutes minimum
		for (const a of allowed) if (raw <= a) return a;
		return allowed[allowed.length - 1];
	});

	// Adaptive grouping at the chosen minute resolution
	const grouped = $derived.by(() => {
		if (!effectiveEntries || effectiveEntries.length === 0) return [];
		const minuteInterval = d3.timeMinute.every(bucketMinutes);
		const floor = (d: Date) =>
			minuteInterval && (minuteInterval as any).floor
				? (minuteInterval as any).floor(d)
				: d3.timeMinute.floor(d);
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

	// Derive a grouping threshold for close bars roughly matching the bucket size
	const timeThresholdMs = $derived.by(() =>
		Math.max(2 * 60 * 1000, bucketMinutes * 60 * 1000 * 0.8)
	);

	function handleRangeChange(range: [Date, Date] | null) {
		if (onRangeChange) onRangeChange(range);
	}
</script>

{#if loading}
	<TimelineSkeleton />
{:else}
	<ActivityTimeline
		data={grouped}
		{groupUnit}
		onRangeChange={handleRangeChange}
		{resetOn}
		timeThreshold={timeThresholdMs}
		{bucketMinutes}
	/>
{/if}
