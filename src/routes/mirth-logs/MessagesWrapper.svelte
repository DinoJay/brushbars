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

	const props = $props<{
		loading?: boolean;
		data?: {
			success: boolean;
			messagesPromise: Promise<any[]>;
			selectedDay: string | null;
			streaming: boolean;
		};
	}>();

	// Get selected day from URL; default to today to avoid stale/non-today flashes
	function selectedDayFromUrl() {
		return $page.url.searchParams.get('day') || new Date().toISOString().split('T')[0];
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



	// Timeline should reflect the store's `messages` for the selected day
	const timelineDataForSelectedDay = $derived.by(
		() => logStore.getTimelineMessageEntries(selectedDayFromUrl() || '') || []
	);

	// Filter messages for table directly from store `messages` (store already holds selected day)
	const filteredMessagesForSelectedDay = $derived.by(() => {
		const day = selectedDayFromUrl();
		return day ? logStore.getFilteredFullMessagesEntries(day) : ([] as any[]);
	});

	// Entries for LogFilters: merged (stored + live) and restricted to the selected day via store helper
	const filterEntriesForSelectedDay = $derived.by(() => {
		const day = selectedDayFromUrl();
		return day ? logStore.getMessageFilterEntriesForDay(day) : ([] as any[]);
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
		if (props.data?.success && props.data.messagesPromise) {
			console.log('🔄 Setting up promise handler for day:', currentDay);
			props.data.messagesPromise
				.then((messages: any[]) => {
					console.log(
						'✅ Promise resolved with',
						messages?.length,
						'messages for day:',
						currentDay
					);
					if (messages && messages.length > 0) {
						logStore.updateMessages(messages);
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
	{#if isLoadingDay}
		<!-- Loading spinner that shows immediately when day changes -->
		<div class="flex items-center justify-center py-8">
			<LoadingSpinner label="Loading messages for new day..." size={48} />
		</div>
	{:else}
		{#await props.data?.messagesPromise}
			<!-- Loading spinner for messages -->
			<div class="flex items-center justify-center py-8">
				<LoadingSpinner label="Loading messages..." size={48} />
			</div>
		{:then messages}
			{#if messages && messages.length > 0}
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

				<!-- Messages Table -->
				<div class="flex-1">
					<LogTable
						entries={filteredMessagesForSelectedDay}
						selectedRange={logStore.selectedRange}
					/>
				</div>
			{:else}
				<div class="flex items-center justify-center py-8">
					<p class="text-gray-500">No messages available for the selected day</p>
				</div>
			{/if}
		{:catch error}
			<div class="flex items-center justify-center py-8">
				<p class="text-red-500">Failed to load messages: {error?.message || 'Unknown error'}</p>
			</div>
		{/await}
	{/if}
</div>
