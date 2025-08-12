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

	async function handleSelectDay(date: string) {
		// Update URL directly - selectedDay will automatically update via $derived
		const url = new URL(window.location.href);
		url.searchParams.set('day', date);
		await goto(url.pathname + '?' + url.searchParams.toString(), {
			replaceState: false,
			noScroll: true,
			keepFocus: true
		});

		// Check if selected date is today
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

	// Smart timeline data source that automatically switches between stored and live data
	const timelineDataForSelectedDay = $derived.by(() => {
		const selectedDay = selectedDayFromUrl();

		if (!selectedDay) return logStore.timelineMessageEntries;

		const today = new Date().toISOString().split('T')[0];

		if (selectedDay === today) {
			// For today: use live WebSocket data + any stored data for today
			const liveTodayMessages = logStore.liveMessages.filter((message) => {
				try {
					const messageDate = new Date(message.timestamp).toISOString().split('T')[0];
					return messageDate === today;
				} catch {
					return false;
				}
			});

			const storedTodayMessages = logStore.timelineMessageEntries.filter((message) => {
				try {
					const messageDate = new Date(message.timestamp).toISOString().split('T')[0];
					return messageDate === today;
				} catch {
					return false;
				}
			});

			// Merge live and stored messages, avoiding duplicates
			const allTodayMessages = [...storedTodayMessages];
			const existingIds = new Set(storedTodayMessages.map((message) => message.id));

			liveTodayMessages.forEach((message) => {
				if (!existingIds.has(message.id)) {
					allTodayMessages.push(message);
				}
			});

			console.log(
				`🔄 Timeline for today: ${liveTodayMessages.length} live + ${storedTodayMessages.length} stored = ${allTodayMessages.length} total`
			);
			return allTodayMessages;
		} else {
			// For other days: use stored data only
			return logStore.timelineMessageEntries.filter((message) => {
				try {
					const messageDate = new Date(message.timestamp).toISOString().split('T')[0];
					return messageDate === selectedDay;
				} catch {
					return false;
				}
			});
		}
	});

	// Filter messages based on selected day and time range
	const filteredMessagesForSelectedDay = $derived.by(() => {
		const selectedDay = selectedDayFromUrl();

		if (!selectedDay) return logStore.filteredMessages;

		// First filter by selected day
		let filtered = logStore.filteredMessages.filter((message) => {
			const messageDate = new Date(message.timestamp).toISOString().split('T')[0];
			return messageDate === selectedDay;
		});

		// Then apply time range filter if present
		if (logStore.selectedRange && logStore.selectedRange.length === 2) {
			const [start, end] = logStore.selectedRange;
			if (
				start instanceof Date &&
				end instanceof Date &&
				!isNaN(start.getTime()) &&
				!isNaN(end.getTime())
			) {
				const startMs = start.getTime();
				const endMs = end.getTime();

				filtered = filtered.filter((message) => {
					const messageMs = new Date(message.timestamp).getTime();
					return messageMs >= startMs && messageMs <= endMs;
				});
			}
		}

		return filtered;
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
		todaysLiveEntries={logStore.liveMessages}
		days={logStore.messageDays}
		loading={logStore.loadingDays}
		error={logStore.errorDays}
		onSelectDay={handleSelectDay}
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
