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

	const props = $props<{ loading?: boolean }>();

	// Local loading flag when fetching a specific day inside this wrapper
	let isFetchingDay = $state(false);

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

	async function handleSelectDay(date: string) {
		// Update URL directly - selectedDay will automatically update via $derived
		const url = new URL(window.location.href);
		url.searchParams.set('day', date);
		await goto(url.pathname + '?' + url.searchParams.toString(), {
			replaceState: false,
			noScroll: true,
			keepFocus: true
		});

		// Clear filters and brush immediately on day change
		logStore.setSelectedLevel(null);
		logStore.setSelectedChannel(null);
		logStore.setSelectedRange(null);

		// Always fetch stored data for the selected day as base
		await fetchDataForDay(date);
	}

	// Fetch data for a specific day
	async function fetchDataForDay(day: string) {
		if (!day) return;

		try {
			isFetchingDay = true;
			console.log('🔄 Fetching messages for day:', day);
			const res = await fetch(`/mirth-logs/api/messages/${day}`);
			if (res.ok) {
				const data = await res.json();
				if (data.success && Array.isArray(data.messages)) {
					logStore.updateMessages(data.messages);
					console.log('✅ Loaded messages:', data.messages.length);
				}
			}
		} catch (error) {
			console.warn('Failed to fetch messages for day:', day, error);
		} finally {
			isFetchingDay = false;
		}
	}

	const showSpinner = $derived.by(
		() => logStore.loadingDays || !(logStore.messageDays && logStore.messageDays.length)
	);
	const daysLoading = $derived.by(
		() =>
			props.loading ||
			logStore.loadingDays ||
			!(logStore.messageDays && logStore.messageDays.length)
	);

	// Timeline should reflect the store's `messages` for the selected day
	const timelineDataForSelectedDay = $derived.by(() =>
		logStore.getTimelineMessageEntriesForDay('')
	);

	// Filter messages for table directly from store `messages` (store already holds selected day)
	const filteredMessagesForSelectedDay = $derived.by(() => {
		return logStore.getFilteredMessagesForDay(null, true);
	});

	// Entries for LogFilters: merged (stored + live) and restricted to the selected day via store helper
	const filterEntriesForSelectedDay = $derived.by(() => {
		const day = selectedDayFromUrl();
		return day ? (logStore as any).getMessageFilterEntriesForDay(day) : ([] as any[]);
	});
</script>

<div
	class="mb-4 rounded p-3 shadow"
	style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
>
	<DayButtons
		selectedDay={selectedDayFromUrl()}
		days={logStore.getEnhancedMessageDays()}
		loading={logStore.loadingDays}
		error={logStore.errorDays}
		onSelectDay={handleSelectDay}
		type="messages"
	/>
</div>

{#if !(props.loading || isFetchingDay)}
	<LogFilters
		entries={filterEntriesForSelectedDay}
		onFiltersChange={(l, c) => {
			logStore.setSelectedLevel(l as any);
			logStore.setSelectedChannel(c);
		}}
	/>
{/if}

{#if daysLoading}
	<div
		class="flex min-h-[480px] items-center justify-center rounded p-3 shadow"
		style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
	>
		<LoadingSpinner label="Loading days…" size={48} />
	</div>
{:else}
	<div
		class="mb-4 rounded p-3 shadow"
		style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
	>
		{#if showSpinner || props.loading || isFetchingDay}
			<div class="flex min-h-[260px] w-full items-center justify-center">
				<LoadingSpinner label="Loading timeline…" size={44} />
			</div>
		{:else}
			<div class="w-full">
				<MirthActivityTimeline
					entries={timelineDataForSelectedDay}
					onRangeChange={(r) => logStore.setSelectedRange(r)}
					resetOn={`${selectedDayFromUrl() || ''}|${logStore.selectedChannel || ''}`}
				/>
			</div>
		{/if}
	</div>

	{#if !(showSpinner || props.loading || isFetchingDay)}
		<div
			class="rounded p-3 shadow"
			style="background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);"
		>
			<LogTable entries={filteredMessagesForSelectedDay} selectedRange={logStore.selectedRange} />
		</div>
	{/if}
{/if}
