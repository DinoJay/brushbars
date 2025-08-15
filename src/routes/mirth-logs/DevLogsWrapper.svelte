<!-- runes -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DayButtons from '$components/DayButtons.svelte';
	import LogFilters from '$components/LogFilters.svelte';
	import MirthActivityTimeline from '$components/timeline/MirthActivityTimeline.svelte';
	import LogTable from '$components/LogTable.svelte';
	import { logStore } from '$stores/logStore.svelte';
	import LoadingSpinner from '$components/LoadingSpinner.svelte';
	import type { TimelineEntry } from '$lib/types';

	const props = $props<{
		loading?: boolean;
		data?: {
			success: boolean;
			devLogsPromise: Promise<any[]>;
			selectedDay: string | null;
			streaming: boolean;
		};
	}>();

	// Get selected day directly from URL
	function selectedDayFromUrl() {
		return $page.url.searchParams.get('day');
	}

	// Reset filters/brush when day changes
	let prevDay = $state<string | null>(null);
	$effect(() => {
		const day = selectedDayFromUrl();
		if (day && day !== prevDay) {
			prevDay = day;
			logStore.setSelectedLevel(null);
			logStore.setSelectedChannel(null);
			logStore.setSelectedRange(null);
		}
	});

	// Filter logs based on selected day and time range - use the same data source as DayButtons
	const filteredLogsForSelectedDay = $derived.by(() => {
		const selectedDay = selectedDayFromUrl();
		return selectedDay ? logStore.getFilteredFullDevLogEntries(selectedDay) : ([] as any[]);
	});

	// Entries used by LogFilters: merged (stored + live) but restricted to the selected day
	const filterEntriesForSelectedDay = $derived.by(() => {
		const day = selectedDayFromUrl();
		return day ? logStore.getDevLogFilterEntries(day) : ([] as any[]);
	});

	// Timeline data for selected day
	const timelineDataForSelectedDay = $derived.by(() => {
		const day = selectedDayFromUrl();
		if (!day) return [] as TimelineEntry[];
		const entries = logStore.getTimelineDevEntries(day);
		return (entries || []) as TimelineEntry[];
	});

	// Loading state that shows immediately when day changes
	let isLoadingDay = $state(false);
	let currentDay = $state<string | null>(null);

	// Track day changes and show loading immediately
	$effect(() => {
		const day = selectedDayFromUrl();
		console.log('🔄 Effect running - current day:', day, 'stored day:', currentDay);

		if (day && day !== currentDay) {
			console.log('🔄 Day changed from', currentDay, 'to', day, '- showing loading state');
			currentDay = day;
			isLoadingDay = true;
		}
	});

	// Handle data updates when streaming promise resolves
	$effect(() => {
		if (props.data?.success && props.data.devLogsPromise) {
			console.log('🔄 Setting up promise handler for day:', currentDay);
			props.data.devLogsPromise
				.then((devLogs: any[]) => {
					console.log('✅ Promise resolved with', devLogs?.length, 'logs for day:', currentDay);
					if (devLogs && devLogs.length > 0) {
						logStore.updateDevLogs(devLogs);
					}
					isLoadingDay = false;
					console.log('✅ Loading state set to false');
				})
				.catch((error: any) => {
					console.error('❌ Promise failed:', error);
					isLoadingDay = false;
				});
		}
	});

	// Debug logging
	$effect(() => {
		console.log('🔄 Loading state changed:', isLoadingDay, 'for day:', currentDay);
	});
</script>

<div class="flex flex-1 flex-col">
	<!-- Debug info -->
	<div class="mb-2 rounded bg-gray-100 p-2 text-xs text-gray-500">
		Debug: isLoadingDay={isLoadingDay}, currentDay={currentDay}, selectedDay={selectedDayFromUrl()}
	</div>

	{#if isLoadingDay}
		<!-- Loading spinner that shows immediately when day changes -->
		<div class="flex items-center justify-center py-8">
			<LoadingSpinner label="Loading dev logs for new day..." size={48} />
		</div>
	{:else}
		{#await props.data?.devLogsPromise}
			<!-- Loading spinner for dev logs -->
			<div class="flex items-center justify-center py-8">
				<LoadingSpinner label="Loading dev logs..." size={48} />
			</div>
		{:then devLogs}
			{#if devLogs && devLogs.length > 0}
				<!-- Show filters and content -->
				<LogFilters
					entries={filterEntriesForSelectedDay}
					onFiltersChange={(l, c) => {
						logStore.setSelectedLevel(l as any);
						logStore.setSelectedChannel(c);
					}}
				/>

				<!-- Timeline -->
				<div class="mb-4">
					<MirthActivityTimeline
						entries={timelineDataForSelectedDay}
						onRangeChange={(range) => logStore.setSelectedRange(range)}
						resetOn={`${selectedDayFromUrl() || ''}|${logStore.selectedChannel || ''}`}
					/>
				</div>

				<!-- Log Table -->
				<div class="flex-1">
					<LogTable entries={filteredLogsForSelectedDay} selectedRange={logStore.selectedRange} />
				</div>
			{:else}
				<div class="flex items-center justify-center py-8">
					<p class="text-gray-500">No dev logs available for the selected day</p>
				</div>
			{/if}
		{:catch error}
			<div class="flex items-center justify-center py-8">
				<p class="text-red-500">Failed to load dev logs: {error?.message || 'Unknown error'}</p>
			</div>
		{/await}
	{/if}
</div>
