<!-- runes -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import DayButtons from './DayButtons.svelte';
	import LogFilters from './LogFilters.svelte';
	import MirthActivityTimeline from './timeline/MirthActivityTimeline.svelte';
	import LogTable from './LogTable.svelte';
	import type { TimelineEntry } from '$lib/types';
	import type { DayData, LogLevel } from '$stores/logStore.svelte';

	const {
		selectedDay,
		days,
		loading,
		error,
		onSelectDay,
		onSetLevel,
		onSetChannel,
		onSetRange,
		entriesTimeline,
		entriesTable,
		allEntries,
		loadDays,
		fetchDayData,
		selectedRange
	} = $props<{
		selectedDay: string | null;
		days: DayData[];
		loading: boolean;
		error: string | null;
		onSelectDay: (date: string) => void;
		onSetLevel: (level: LogLevel | null) => void;
		onSetChannel: (channel: string | null) => void;
		onSetRange: (range: [Date, Date]) => void;
		entriesTimeline: TimelineEntry[];
		entriesTable: TimelineEntry[];
		allEntries: TimelineEntry[];
		loadDays: () => Promise<void>;
		fetchDayData: (day: string) => Promise<void>;
		selectedRange: [Date, Date] | null;
	}>();

	// Load days using parent-provided loader
	$effect(() => {
		if (!days?.length) loadDays();
	});

	// Fetch day data using parent fetcher
	$effect(() => {
		if (selectedDay) fetchDayData(selectedDay);
	});

	async function handleSelectDay(date: string) {
		onSelectDay(date);
	}

	// Local spinner based on days readiness
	const showSpinner = $derived.by(() => loading || !(days && days.length));
</script>

{#if showSpinner}
	<div class="flex min-h-[60vh] items-center justify-center">
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500 dark:border-blue-400"
			></div>
			<p class="text-gray-600 dark:text-gray-300">Loading days…</p>
		</div>
	</div>
{:else}
	<div class="mb-6 rounded bg-white p-4 shadow dark:bg-gray-800">
		<DayButtons
			{selectedDay}
			todaysLiveEntries={[]}
			{days}
			{loading}
			{error}
			onSelectDay={handleSelectDay}
		/>
	</div>

	<LogFilters
		entries={allEntries}
		onFiltersChange={(l, c) => {
			onSetLevel(l as any);
			onSetChannel(c);
		}}
	/>

	<div class="mb-6 rounded bg-white p-4 shadow dark:bg-gray-800">
		<MirthActivityTimeline entries={entriesTimeline} onRangeChange={onSetRange} />
	</div>
	<div class="rounded bg-white p-4 shadow dark:bg-gray-800">
		<LogTable entries={entriesTable} {selectedRange} />
	</div>
{/if}
